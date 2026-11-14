/**
 * Acciones con balón (T085; FR-033; spec 002, research R4): en cada paso, quien lleva el balón elige una
 * acción según la zona, la táctica, la formación y lo que ve a su alrededor (`opciones.ts`), y la resuelve
 * en un duelo contra el rival real más cercano. La acción se representa con física: el balón vuela hacia el
 * receptor, el jugador conduce hasta su punto, etc., y su duración sale de ahí (no hay duraciones fijas).
 */
import { rival, type EquipoEstado, type EstadoMotor, type JugadorEnPartido } from '../estado/estado';
import { dist2, dividir, escalar, isqrt, limitar } from '../espacio/aritmetica';
import { decimasDeMetros, distanciaPorteria, ULTIMO_TERCIO } from '../espacio/campo';
import { papelLlegada } from '../espacio/objetivos';
import { aAbsoluta, aEquipo, CENTRO_Y, centroCelda, LARGO, puntoEnCelda, zonaCarrilDe, type Punto } from '../espacio/geometria';
import { anotar } from '../metricas';
import { velocidadMaxima } from '../espacio/movimiento';
import { atributo, type Atributo } from '../modificadores/atributos';
import { desplazamientoAtaque, probabilidadAvance, probabilidadBanda, type TipoAccion } from '../modificadores/formacionTactica';
import { factorFalta, factorFaltaArea } from '../modificadores/defectos';
import { ajusteDuelo, bonusInfranqueable, tiene } from '../modificadores/virtudes';
import { balonCon, conducir, controlar, recuperarSuelto, reponer, ticksDeCarrera, ticksDeVuelo, volar } from './animaciones';
import { falta, fueraDeJuego } from './balonParado';
import { cercanoACelda, elegirPonderado, esPortero, interrumpir, jugadorPorId, pasarTiempo, rivalCercano, type Contexto } from './contexto';
import { probabilidad, resolver } from './duelo';
import { comprobarLesion } from './lesiones';
import { CERCA_REMATE, entorno, motivosPaseLargo, pesosConEspacio, PUNTO_REMATE, type Entorno } from './opciones';
import { decisionManoAMano, distanciaDisparo, esManoAMano, type DecisionManoAMano } from './manoAMano';
import { enFueraDeJuego, factorPericia, penultimoDefensor } from './fueraDeJuego';
import { interceptorDePase, receptorDePase, type TipoPase } from './receptor';
import { corner, despejeEnPropia, saqueDePuerta, tirar } from './tiro';

/** Atributo del atacante y del defensor en cada acción. */
const ENFRENTAMIENTO: Record<TipoAccion, [Atributo, Atributo]> = {
  pase_corto: ['pase', 'anticipacion'],
  pase_largo: ['vision', 'anticipacion'],
  conduccion: ['velocidad', 'quite'],
  regate: ['regate', 'quite'],
  pase_espacio: ['vision', 'anticipacion'],
  centro: ['centro', 'anticipacion'],
  tiro: ['remate', 'anticipacion'],
};

const esPase = (a: TipoAccion): a is TipoPase => a === 'pase_corto' || a === 'pase_largo' || a === 'pase_espacio';

function portadorActual(ctx: Contexto, atacante: EquipoEstado): JugadorEnPartido | undefined {
  const b = ctx.estado.balon;
  const actual = jugadorPorId(atacante, b.portadorId);
  if (actual?.enCampo) return actual;
  const nuevo = cercanoACelda(ctx, atacante, b.zona, b.carril, -1);
  if (nuevo) b.portadorId = nuevo.id;
  return nuevo;
}

/** Punto absoluto de una celda lógica (del equipo `lado`) lo más cerca posible de `cerca`. */
function puntoCelda(lado: 'local' | 'visitante', zona: number, carril: number, cerca: Punto): Punto {
  return aAbsoluta(lado, puntoEnCelda(zona, carril, aEquipo(lado, cerca)));
}

/** Punto junto a un rival (sin pisarlo), en el lado por el que llega el jugador: donde le frenan. */
function alLadoDe(e: EstadoMotor, jugadorId: number, rivalId: number): Punto {
  const yo = e.espacio.jugadores[jugadorId];
  const r = e.espacio.jugadores[rivalId];
  if (!yo || !r) return yo ? { x: yo.x, y: yo.y } : { ...e.espacio.balon };
  const [ox, oy] = escalar(yo.x - r.x, yo.y - r.y, e.parametros.espacio.radioSeparacion * 2);
  return ox === 0 && oy === 0 ? { x: yo.x, y: yo.y } : { x: r.x + ox, y: r.y + oy };
}

/** Cierra la posesión en curso si el balón ha cambiado de equipo (secuencias de pases, SC-007). */
export function actualizarPosesion(ctx: Contexto): void {
  const e = ctx.estado;
  if (e.posesion.lado === e.balon.posesion) return;
  const anterior = e.estadisticas[e.posesion.lado].secuencias;
  const n = Math.min(e.posesion.pases, 10);
  anterior[n] = (anterior[n] ?? 0) + 1;
  e.posesion = { lado: e.balon.posesion, inicioTick: e.tick, pases: 0, enCampoPropio: e.balon.zona <= 2, ultimoPase: null };
}

/**
 * Un pase completado: secuencia, pared (A → B → A), cambio de orientación (research R4) y, para el ida y vuelta (spec
 * 014, research R3), el avance del pase y la racha de pases entre los mismos dos sin presión ni avance.
 */
function registrarPase(ctx: Contexto, atacante: EquipoEstado, de: JugadorEnPartido, a: JugadorEnPartido, desde: Punto, presionado: boolean): void {
  const e = ctx.estado;
  const s = e.estadisticas[atacante.lado];
  const ultimo = e.posesion.ultimoPase;
  const vuelta = ultimo !== null && ultimo.de === a.id && ultimo.a === de.id;
  if (vuelta) s.paredes++;
  const hasta = e.espacio.jugadores[a.id] ?? desde;
  if (Math.abs(hasta.y - desde.y) > 3500) s.cambiosOrientacion++;
  e.posesion.pases++;
  const avance = aEquipo(atacante.lado, hasta).x - aEquipo(atacante.lado, desde).x;
  const sinSentido = !presionado && avance < decimasDeMetros(e.parametros.idaVuelta!.avanceMinimoM);
  const racha = sinSentido ? (vuelta && (ultimo.racha ?? 0) > 0 ? ultimo.racha! + 1 : 1) : 0;
  if (racha >= 3) anotar(ctx.metricas, de.id, 'idasVueltas');
  e.posesion.ultimoPase = { de: de.id, a: a.id, avance, racha };
}

/** El defensor recupera el balón. */
function perder(ctx: Contexto, atacante: EquipoEstado, perdedor: JugadorEnPartido, recuperador: JugadorEnPartido | undefined): void {
  const e = ctx.estado;
  const defensor = e.equipos[rival(atacante.lado)];
  // La zona y el carril salen de la posición real del balón (vista del que recupera).
  const real = zonaCarrilDe(defensor.lado, e.espacio.balon);
  const zonaRecuperacion = real.zona;
  const s = e.parametros.virtudes;

  // Recuperador tras pérdida: presiona de inmediato para volver a robarla.
  if (tiene(perdedor, 'RecuperadorTrasPerdida') && recuperador) {
    const p = probabilidad({ base: -0.6, atacante: atributo(e, atacante, perdedor, 'quite'), defensor: atributo(e, defensor, recuperador, 'regate'), ajuste: s.bonusProbabilidadAlto }, e.parametros);
    if (resolver(ctx.rng, p)) {
      e.estadisticas[atacante.lado].recuperaciones++;
      if (e.balon.zona >= 3) e.estadisticas[atacante.lado].recuperacionesCampoRival++;
      e.balon.portadorId = perdedor.id;
      if (!balonCon(e, perdedor.id)) {
        const quien = recuperarSuelto(ctx, perdedor.id);
        if (quien !== perdedor.id) perder(ctx, atacante, perdedor, jugadorPorId(defensor, quien));
      } else pasarTiempo(ctx, 2);
      return;
    }
  }

  e.estadisticas[defensor.lado].recuperaciones++;
  if (zonaRecuperacion >= 3) e.estadisticas[defensor.lado].recuperacionesCampoRival++;
  const nuevo = recuperador ?? cercanoACelda(ctx, defensor, zonaRecuperacion, 2 - e.balon.carril, -1);
  // La recuperación se atribuye a quien gana el duelo (research R9).
  anotar(ctx.metricas, nuevo?.id, 'recuperaciones');
  // Un equipo que juega al contraataque busca la espalda rival nada más recuperar.
  const transicion =
    defensor.tactica.estiloConBalon === 'contraataque' &&
    ctx.rng.probabilidad(Math.round((0.35 + e.parametros.tacticas.contraataque.peligroTransicion) * 1000));
  e.balon = { posesion: defensor.lado, zona: zonaRecuperacion, carril: real.carril, portadorId: nuevo?.id ?? 0, transicion };
  actualizarPosesion(ctx);
  if (nuevo && !balonCon(e, nuevo.id)) {
    // Carrera por el balón suelto (spec 014, FR-002): si llega antes uno del equipo que lo perdió, lo recupera.
    const quien = recuperarSuelto(ctx, nuevo.id);
    if (quien !== nuevo.id) perder(ctx, defensor, nuevo, jugadorPorId(atacante, quien));
  } else pasarTiempo(ctx, 2);
}

/** El balón sale del campo tras un pase fallido. */
function balonFuera(ctx: Contexto, atacante: EquipoEstado, zona: number): void {
  const e = ctx.estado;
  const defensor = e.equipos[rival(atacante.lado)];
  if (zona >= 5) {
    saqueDePuerta(ctx, defensor);
    return;
  }
  interrumpir(ctx, 'fuera_de_banda', 10, defensor.lado);
  const sacador = cercanoACelda(ctx, defensor, 5 - zona, 2 - e.balon.carril, -1);
  e.balon = { posesion: defensor.lado, zona: 5 - zona, carril: e.balon.carril === 1 ? 0 : 2 - e.balon.carril, portadorId: sacador?.id ?? 0, transicion: false };
  actualizarPosesion(ctx);
  // Saque de banda desde la línea más cercana al punto por donde salió.
  const b = e.espacio.balon;
  const punto = { x: b.x, y: b.y < 3200 ? 0 : 6400 };
  if (sacador) reponer(ctx, 'banda', punto, sacador.id);
}

/** Punto fuera del campo hacia el que sale un balón perdido (por la banda o por la línea de fondo). */
function puntoFuera(ctx: Contexto, atacante: EquipoEstado, porFondo: boolean): Punto {
  const b = aEquipo(atacante.lado, ctx.estado.espacio.balon);
  const p = porFondo ? { x: 10250, y: b.y < 3200 ? b.y - 600 : b.y + 600 } : { x: Math.min(9800, b.x + 2000), y: b.y < 3200 ? -250 : 6650 };
  return aAbsoluta(atacante.lado, p);
}

/** Ajustes de probabilidad por virtudes del atacante en una acción concreta. */
export function ajusteVirtudesAccion(ctx: Contexto, accion: TipoAccion, j: JugadorEnPartido, zona: number, carril: number, defensor: JugadorEnPartido | undefined): number {
  const s = ctx.estado.parametros.virtudes;
  let a = 0;
  if (tiene(j, 'PrimerToque') && (accion === 'pase_corto' || accion === 'pase_espacio')) a += s.bonusProbabilidadMedio;
  if (tiene(j, 'Elegante') && (accion === 'pase_corto' || accion === 'conduccion') && zona <= 3) a += s.bonusProbabilidadMedio;
  if (tiene(j, 'JugadorEntreLineas') && (zona === 3 || zona === 4)) a += s.bonusProbabilidadMedio;
  if (tiene(j, 'Desbordante') && accion === 'regate' && carril !== 1) a += s.bonusProbabilidadAlto;
  if (tiene(j, 'Potente') && (accion === 'regate' || accion === 'conduccion')) a += s.bonusProbabilidadLeve;
  if (tiene(j, 'JugadorDeCampo') && esPortero(j) && zona === 0) a += s.bonusProbabilidadAlto;
  if (defensor) {
    if (tiene(defensor, 'Presionador')) a -= s.bonusProbabilidadMedio;
    if (tiene(defensor, 'Potente') && (accion === 'regate' || accion === 'conduccion')) a -= s.bonusProbabilidadLeve;
  }
  return a;
}

/**
 * Pase a un compañero que va a un punto de la celda de destino: control y preparación mientras el receptor
 * llega, y después el vuelo del balón (FR-023; research R4).
 */
function pasar(
  ctx: Contexto,
  tipo: 'pase_corto' | 'pase_largo' | 'pase_espacio',
  atacante: EquipoEstado,
  de: JugadorEnPartido,
  a: JugadorEnPartido,
  punto: Punto,
  exito: boolean,
  conFueraDeJuego = true,
): { quien: number | undefined; fuera: FotoFuera | null } {
  const e = ctx.estado;
  const p = e.parametros.espacio;
  const b = e.espacio.balon;
  const vmax = velocidadMaxima(e, atacante, a);
  // El punto de recepción tiene que estar al alcance del receptor mientras vuela el balón (con el control
  // previo del pasador como mucho): si no, se acerca a él por la línea que los une.
  const q = e.espacio.jugadores[a.id];
  if (q) {
    const alcance = dividir(vmax * (ticksDeVuelo(e, tipo, isqrt(dist2(b.x, b.y, punto.x, punto.y))) + p.controlMaximoTicks) * 4, 5);
    const dx = punto.x - q.x;
    const dy = punto.y - q.y;
    if (dx * dx + dy * dy > alcance * alcance) {
      const [mx, my] = escalar(dx, dy, alcance);
      punto = { x: q.x + mx, y: q.y + my };
    }
  }
  e.espacio.destinos[a.id] = punto;
  const vuelo = ticksDeVuelo(e, tipo, isqrt(dist2(b.x, b.y, punto.x, punto.y)));
  const carrera = ticksDeCarrera(e, a.id, punto, vmax);
  // El control previo: lo que tarda el receptor en llegar, y como mínimo lo que marca el ritmo del equipo,
  // que sube con el pase de sus centrocampistas (SC-008: el balón circula más rápido).
  const minimo = Math.max(p.controlMinimoTicks, controlPorRitmo(e, atacante));
  controlar(ctx, de.id, Math.min(Math.max(p.controlMaximoTicks, minimo), Math.max(minimo, carrera - vuelo)));
  // Fuera de juego con las posiciones del momento en que sale el pase (spec 014, FR-008).
  const fuera = exito && conFueraDeJuego ? fotoFueraDeJuego(e, atacante, a) : null;
  const quien = volar(ctx, tipo, de.id, { jugadorId: a.id }, { exito: exito && !fuera, disputa: exito && !fuera });
  return { quien, fuera };
}

interface FotoFuera {
  punto: Punto;
  xPenultimo: number;
  xBalon: number;
}

/** Foto del fuera de juego del receptor `a` si lo está ahora: dónde estaba, el penúltimo defensor y el balón. */
function fotoFueraDeJuego(e: EstadoMotor, atacante: EquipoEstado, a: JugadorEnPartido): FotoFuera | null {
  const xBalon = aEquipo(atacante.lado, e.espacio.balon).x;
  const q = e.espacio.jugadores[a.id];
  if (!q || !enFueraDeJuego(e, atacante, a, xBalon)) return null;
  return { punto: { x: q.x, y: q.y }, xPenultimo: penultimoDefensor(e, e.equipos[rival(atacante.lado)], atacante.lado), xBalon };
}

/**
 * Ticks mínimos de control antes de un pase según el pase medio de los centrocampistas en el campo (o de
 * todos los de campo, si no hay ninguno): `controlPaseTicks` con el stat de referencia, `controlPorStat`
 * menos por cada 10 puntos más.
 */
function controlPorRitmo(e: EstadoMotor, equipo: EquipoEstado): number {
  const a = e.parametros.acciones;
  const mediaPase = (cuenta: (j: JugadorEnPartido) => boolean): number | undefined => {
    const js = equipo.jugadores.filter((j) => j.enCampo && cuenta(j));
    return js.length > 0 ? js.reduce((suma, j) => suma + atributo(e, equipo, j, 'pase'), 0) / js.length : undefined;
  };
  const pase = mediaPase((j) => j.jugador.demarcacion === 'MED') ?? mediaPase((j) => j.casillaId !== 'POR') ?? a.statPaseReferencia;
  return Math.max(0, Math.round(a.controlPaseTicks - (a.controlPorStat * (pase - a.statPaseReferencia)) / 10));
}


/** Pase planeado antes del duelo: receptor, punto de recepción (absoluto) y celda en la que queda el balón. */
interface PlanPase {
  receptor: JugadorEnPartido;
  punto: Punto;
  zona: number;
  carril: number;
}

/**
 * Receptor y punto de recepción de un pase (spec 003, research R3 y R4). El pase corto y el pase al espacio
 * van hacia la celda de destino (avance de zona, como en la 002); el pase largo, a un compañero que cumple su
 * motivo táctico, y el balón queda en la celda real del punto de recepción.
 */
function planearPase(ctx: Contexto, accion: TipoPase, atacante: EquipoEstado, defensor: EquipoEstado, portador: JugadorEnPartido, zona: number, carril: number): PlanPase | null {
  const e = ctx.estado;
  const p = e.parametros;
  const lado = atacante.lado;
  if (accion === 'pase_largo') {
    // Con un cambio de orientación posible, el balón va al carril contrario; si no, a quien cumple algún motivo.
    const motivos = motivosPaseLargo(e, atacante, portador);
    const cambio = motivos.find((m) => m.motivo === 'cambio_orientacion');
    const candidatos = cambio ? cambio.receptores : [...new Set(motivos.flatMap((m) => m.receptores))];
    const r = receptorDePase(ctx, atacante, portador, 'pase_largo', candidatos.length > 0 ? { candidatos } : {});
    const q = r ? e.espacio.jugadores[r.id] : undefined;
    if (!r || !q) return null;
    // Por delante del receptor, para que lo reciba en carrera.
    const delante = aEquipo(lado, q);
    const punto = aAbsoluta(lado, { x: Math.min(9500, delante.x + 476), y: Math.min(6250, Math.max(150, delante.y)) });
    return { receptor: r, punto, ...zonaCarrilDe(lado, punto) };
  }
  let destino: number;
  let nuevoCarril = carril;
  if (accion === 'pase_corto') {
    const avanza = ctx.rng.probabilidad(Math.round(probabilidadAvance(e, atacante, defensor, zona) * 1000));
    const nuevaZona = Math.min(5, zona + (avanza ? 1 : 0));
    // Llegar al área con un pase corto exige superar una línea más.
    destino = nuevaZona === 5 && !ctx.rng.probabilidad(Math.round(p.acciones.llegadaArea * 1000)) ? 4 : nuevaZona;
    nuevoCarril = avanza ? (ctx.rng.probabilidad(Math.round(probabilidadBanda(atacante) * 1000)) ? (ctx.rng.probabilidad(500) ? 0 : 2) : 1) : carril;
  } else {
    destino = Math.min(5, zona + (zona >= 3 ? 2 : 1));
  }
  const objetivo = aAbsoluta(lado, centroCelda(destino, nuevoCarril));
  const r = receptorDePase(ctx, atacante, portador, accion, { objetivo });
  const q = r ? e.espacio.jugadores[r.id] : undefined;
  if (!r || !q) return null;
  // Un pase corto o al espacio no pasa de 35 m (SC-004): si la celda queda más lejos, el punto se acerca al pasador.
  let punto = puntoCelda(lado, destino, nuevoCarril, q);
  const desde = e.espacio.jugadores[portador.id] ?? e.espacio.balon;
  const [lx, ly] = limitar(punto.x - desde.x, punto.y - desde.y, p.pases.distanciaLargo);
  punto = { x: desde.x + lx, y: desde.y + ly };
  return { receptor: r, punto, zona: destino, carril: nuevoCarril };
}

/** Longitud real del pase (data-model §7.2): corto (< 20 m), largo (> 35 m) y largo hacia atrás desde el último tercio. */
function clasificarPase(e: EstadoMotor, atacante: EquipoEstado, desde: Punto, hasta: Punto): void {
  const s = e.estadisticas[atacante.lado];
  const pp = e.parametros.pases;
  const d2 = dist2(desde.x, desde.y, hasta.x, hasta.y);
  if (d2 < pp.distanciaCorto * pp.distanciaCorto) s.pasesCortos++;
  else if (d2 > pp.distanciaLargo * pp.distanciaLargo) {
    s.pasesLargos++;
    if (aEquipo(atacante.lado, desde).x >= ULTIMO_TERCIO && aEquipo(atacante.lado, hasta).x < LARGO / 2) s.pasesLargosAtras++;
  }
}

/** Un pase completado que deja atrás a dos o más rivales de campo (métrica de visión, SC-006). */
function rompeLineas(e: EstadoMotor, atacante: EquipoEstado, desde: Punto, hasta: Punto): boolean {
  const a = aEquipo(atacante.lado, desde).x;
  const b = aEquipo(atacante.lado, hasta).x;
  if (b <= a) return false;
  let superados = 0;
  for (const j of e.equipos[rival(atacante.lado)].jugadores) {
    const q = j.enCampo && !esPortero(j) ? e.espacio.jugadores[j.id] : undefined;
    if (!q) continue;
    const x = aEquipo(atacante.lado, q).x;
    if (x > a && x < b) superados++;
  }
  return superados >= 2;
}

/**
 * Distancia de una conducción (research R5): de `distanciaMin` a `distanciaMax` según la velocidad y el físico; la
 * conducción no supera el espacio libre medido (el regate sí: deja atrás al rival).
 */
function distanciaConduccion(e: EstadoMotor, atacante: EquipoEstado, portador: JugadorEnPartido, accion: 'conduccion' | 'regate', espacio: number): number {
  const c = e.parametros.decision.conduccion;
  const s = e.parametros.espacio;
  const v = (atributo(e, atacante, portador, 'velocidad') + atributo(e, atacante, portador, 'fisico')) / 2;
  const t = Math.min(1, Math.max(0, (v - s.statVelocidadMin) / (s.statVelocidadMax - s.statVelocidadMin)));
  const d = Math.round(c.distanciaMin + (c.distanciaMax - c.distanciaMin) * t);
  return accion === 'regate' ? d : Math.max(2 * s.radioSeparacion, Math.min(d, espacio - 2 * s.radioSeparacion));
}

/** Punto de penalti (coordenadas del atacante): hacia donde conduce un atacante solo ante el portero (FR-004). */
const PUNTO_PENALTI = { x: 8950, y: CENTRO_Y };

/**
 * Mano a mano por posición (spec 014, research R2): la decisión de la directriz, salvo un error de decisión que baja con
 * la visión (FR-005). Anota las métricas de SC-002.
 */
function decidirManoAMano(ctx: Contexto, atacante: EquipoEstado, portador: JugadorEnPartido, en: Entorno | null): DecisionManoAMano | null {
  const e = ctx.estado;
  if (!esManoAMano(e, atacante, portador, en)) return null;
  anotar(ctx.metricas, portador.id, 'manoAMano');
  if (distanciaPorteria(en.yo) <= distanciaDisparo(e, atacante, portador, en)) anotar(ctx.metricas, portador.id, 'manoAManoDisparo');
  const error = e.parametros.manoAMano!.errorDecision * (1 - factorPericia(atributo(e, atacante, portador, 'vision')));
  // Matador no se equivoca en un mano a mano: siempre acaba tirando.
  if (!tiene(portador, 'Matador') && ctx.rng.probabilidad(Math.round(error * 1000))) return null;
  return decisionManoAMano(e, atacante, portador, en);
}

/** Un paso de juego: una acción de quien lleva el balón. */
export function paso(ctx: Contexto): void {
  const e = ctx.estado;
  const p = e.parametros;
  // Un córner que salió del tiro anterior se saca ahora, como jugada propia.
  if (e.cornerPendiente) {
    const lado = e.cornerPendiente;
    e.cornerPendiente = null;
    e.balon = { ...e.balon, posesion: lado };
    corner(ctx, e.equipos[lado]);
    return;
  }
  actualizarPosesion(ctx);
  const atacante = e.equipos[e.balon.posesion];
  const defensor = e.equipos[rival(atacante.lado)];
  const portador = portadorActual(ctx, atacante);
  if (!portador) {
    pasarTiempo(ctx, 3);
    return;
  }
  // Si el balón no está con quien debe llevarlo, primero va a por él; si llega antes un rival, lo pierde (FR-002).
  if (!balonCon(e, portador.id)) {
    const quien = recuperarSuelto(ctx, portador.id);
    if (quien !== portador.id) {
      perder(ctx, atacante, portador, jugadorPorId(defensor, quien));
      return;
    }
  }
  const { zona, carril } = e.balon;
  const en = entorno(e, atacante, portador);
  // Un saque de banda o de puerta nunca da fuera de juego (FR-009): solo afecta a la jugada que sale de él.
  const conFueraDeJuego = !e.espacio.sinFueraDeJuego;
  delete e.espacio.sinFueraDeJuego;

  let accion: TipoAccion;
  const enTransicion = e.balon.transicion && zona <= 3;
  const soloAnteElPortero = !enTransicion && en !== null && esManoAMano(e, atacante, portador, en);
  const manoAMano = soloAnteElPortero ? decidirManoAMano(ctx, atacante, portador, en) : null;
  if (enTransicion) {
    accion = 'pase_espacio';
  } else if (manoAMano) {
    accion = manoAMano === 'tiro' ? 'tiro' : manoAMano === 'conduccion' ? 'conduccion' : 'pase_corto';
  } else {
    accion = elegirPonderado(ctx.rng, pesosConEspacio(e, atacante, portador, zona, carril, en));
  }
  const transicion = e.balon.transicion;
  if (soloAnteElPortero && accion === 'tiro' && distanciaPorteria(en.yo) <= distanciaDisparo(e, atacante, portador, en)) {
    anotar(ctx.metricas, portador.id, 'manoAManoTiro');
  }

  if (accion === 'tiro') {
    e.balon.transicion = false;
    // El tipo (normal en el área, lejano fuera) sale de la posición real del tirador (research R6).
    tirar(ctx, atacante, portador, manoAMano === 'tiro' ? 'manoAMano' : 'normal');
    return;
  }

  const posPortador = { ...(e.espacio.jugadores[portador.id] ?? e.espacio.balon) };
  // Pases: receptor y punto de recepción antes del duelo (research R3); sin receptor, se conduce.
  let plan: PlanPase | null = null;
  if (manoAMano !== null && typeof manoAMano === 'object') {
    const q = e.espacio.jugadores[manoAMano.pase.id]!;
    plan = { receptor: manoAMano.pase, punto: { x: q.x, y: q.y }, ...zonaCarrilDe(atacante.lado, q) };
  } else if (esPase(accion)) {
    plan = planearPase(ctx, accion, atacante, defensor, portador, zona, carril);
    if (!plan) accion = 'conduccion';
  }
  // Pase hacia atrás en un mano a mano (SC-002: < 2 %).
  if (plan && soloAnteElPortero) {
    const q = e.espacio.jugadores[plan.receptor.id];
    if (q && aEquipo(atacante.lado, q).x < en.yo.x - decimasDeMetros(p.manoAMano!.paraleloM)) anotar(ctx.metricas, portador.id, 'manoAManoPaseAtras');
  }
  e.balon.transicion = false;

  const [atA, atD] = ENFRENTAMIENTO[accion];
  // El rival del duelo: en los pases y centros, el mejor situado en la línea del balón (anticipación); en el
  // resto, el más cercano según su radio de intervención (research R9).
  const puntoRemate = aAbsoluta(atacante.lado, PUNTO_REMATE);
  const rivalDuelo = plan
    ? interceptorDePase(ctx, defensor, posPortador, plan.punto)
    : accion === 'centro'
      ? interceptorDePase(ctx, defensor, posPortador, puntoRemate)
      : rivalCercano(ctx, defensor, zona >= 5);
  const aj = ajusteDuelo(e, portador, rivalDuelo);
  const infranqueable = rivalDuelo ? bonusInfranqueable(e, portador, rivalDuelo) : 0;
  const valorDefensor = rivalDuelo ? atributo(e, defensor, rivalDuelo, atD) + infranqueable : 40;
  const base = {
    pase_corto: p.acciones.paseCorto,
    pase_largo: p.acciones.paseLargo,
    conduccion: p.acciones.conduccion,
    regate: p.acciones.regate,
    pase_espacio: p.acciones.paseEspacio + (transicion ? 0.4 : 0),
    centro: p.acciones.centro,
  }[accion];
  const stats = e.estadisticas[atacante.lado];
  const espacio = en?.espacio ?? 0;

  const exito = probabilidad(
    {
      base,
      // Spec 014 (US5): en la conducción pesan la velocidad y el físico.
      atacante: (accion === 'conduccion' ? (atributo(e, atacante, portador, 'velocidad') + atributo(e, atacante, portador, 'fisico')) / 2 : atributo(e, atacante, portador, atA)) + aj.atacante,
      defensor: valorDefensor + aj.defensor,
      desplazamiento: desplazamientoAtaque(e, atacante, defensor, accion, zona),
      ajuste: aj.probabilidad + ajusteVirtudesAccion(ctx, accion, portador, zona, carril, rivalDuelo),
      ...(esPase(accion) ? { pendiente: p.acciones.pendientePase } : {}),
    },
    p,
  );
  const ok = resolver(ctx.rng, exito, {
    rerollAtacante: (accion === 'regate' && tiene(portador, 'Filigranas')) || (accion === 'centro' && tiene(portador, 'GuanteEnElPie')),
    rerollDefensor: zona >= 4 && rivalDuelo !== undefined && tiene(rivalDuelo, 'MuroDefensivo') && accion !== 'regate',
  });
  if (plan) {
    stats.pases++;
    anotar(ctx.metricas, portador.id, 'pases');
    clasificarPase(e, atacante, posPortador, plan.punto);
  }
  if (accion === 'centro') stats.centros++;
  if (accion === 'conduccion' || accion === 'regate') {
    stats.conducciones++;
    anotar(ctx.metricas, rivalDuelo?.id, 'entradas');
    anotar(ctx.metricas, portador.id, accion === 'regate' ? 'regates' : 'conducciones');
    if (accion === 'conduccion' && espacio >= p.decision.conduccion.espacioMax) anotar(ctx.metricas, portador.id, 'conduccionesLargas');
  }

  if (!ok) {
    // Regates y conducciones frenados con falta; pases que salen del campo; el resto, pérdida.
    const frenado = rivalDuelo ? alLadoDe(e, portador.id, rivalDuelo.id) : posPortador;
    // Cerca del área se frena más con falta (spec 003: más faltas directas y penaltis, research R7).
    const cercaArea = (en?.yo.x ?? 0) >= ULTIMO_TERCIO ? p.disciplina.factorFaltaUltimoTercio : 1;
    if (
      (accion === 'regate' || accion === 'conduccion') &&
      rivalDuelo &&
      ctx.rng.probabilidad(
        Math.round(p.disciplina.probabilidadFaltaPorEntrada * 1000 * 1.6 * cercaArea * factorFalta(e, rivalDuelo) * factorFaltaArea(e, atacante.lado, frenado)),
      )
    ) {
      conducir(ctx, accion, portador.id, { x: frenado.x, y: frenado.y }, { exito: false, maximo: 20 });
      falta(ctx, atacante, portador, defensor, rivalDuelo);
      return;
    }
    if ((accion === 'pase_largo' || accion === 'centro' || accion === 'pase_espacio') && ctx.rng.probabilidad(Math.round(p.acciones.probabilidadBalonFuera * 2000))) {
      const tipo = accion === 'centro' ? 'centro' : accion;
      controlar(ctx, portador.id, p.espacio.controlMinimoTicks);
      volar(ctx, tipo, portador.id, { punto: puntoFuera(ctx, atacante, accion === 'centro') }, { exito: false, aerea: accion !== 'pase_espacio' });
      balonFuera(ctx, atacante, accion === 'centro' ? 5 : zona + 1);
      return;
    }
    if (plan || accion === 'centro') {
      controlar(ctx, portador.id, p.espacio.controlMinimoTicks);
      const aerea = accion === 'centro' || accion === 'pase_largo';
      if (rivalDuelo) {
        volar(ctx, accion, portador.id, { jugadorId: rivalDuelo.id }, { exito: false, aerea });
        anotar(ctx.metricas, rivalDuelo.id, 'intercepciones');
        // El despeje de un centro dentro del área puede acabar en la propia portería (FR-020).
        if (accion === 'centro' && despejeEnPropia(ctx, atacante, defensor, rivalDuelo)) return;
      } else {
        // Sin un rival cerca, el pase sale mal y el balón queda suelto por delante.
        const delante = aEquipo(atacante.lado, e.espacio.balon);
        volar(ctx, accion, portador.id, { punto: aAbsoluta(atacante.lado, { x: Math.min(9500, delante.x + 1500), y: delante.y }) }, { exito: false, aerea });
      }
    } else {
      conducir(ctx, accion as 'conduccion' | 'regate', portador.id, { x: frenado.x, y: frenado.y }, { exito: false, maximo: 20 });
      if (rivalDuelo) {
        anotar(ctx.metricas, rivalDuelo.id, 'entradasGanadas');
        anotar(ctx.metricas, rivalDuelo.id, 'duelosGanados');
      }
    }
    if (accion === 'regate' || accion === 'conduccion') comprobarLesion(ctx, atacante, portador);
    if (e.fase === 'finalizado') return;
    perder(ctx, atacante, portador, rivalDuelo);
    return;
  }

  if ((accion === 'regate' || accion === 'conduccion') && rivalDuelo) anotar(ctx.metricas, portador.id, 'duelosGanados');
  if (accion === 'regate') anotar(ctx.metricas, portador.id, 'regatesGanados');
  if (accion === 'conduccion' && rivalDuelo) anotar(ctx.metricas, portador.id, 'conduccionesGanadas');
  // Un duelo ganado con regate o conducción también puede acabar en falta del defensor.
  if (
    (accion === 'regate' || accion === 'conduccion') &&
    rivalDuelo &&
    ctx.rng.probabilidad(
      Math.round(
        p.disciplina.probabilidadFaltaPorEntrada * 1000 * 0.5 * factorFalta(e, rivalDuelo) * factorFaltaArea(e, atacante.lado, alLadoDe(e, portador.id, rivalDuelo.id)),
      ),
    )
  ) {
    const frenado = alLadoDe(e, portador.id, rivalDuelo.id);
    conducir(ctx, accion, portador.id, { x: frenado.x, y: frenado.y }, { exito: true, maximo: 20 });
    falta(ctx, atacante, portador, defensor, rivalDuelo);
    return;
  }

  if (plan) {
    const tipo = accion as TipoPase;
    const { quien, fuera } = pasar(ctx, tipo, atacante, portador, plan.receptor, plan.punto, true, conFueraDeJuego);
    if (fuera) {
      fueraDeJuego(ctx, atacante, plan.receptor, fuera.punto, fuera);
      return;
    }
    // Un rival llegó antes al balón que no alcanzó el receptor: el pase no se completa.
    if (quien !== undefined && quien !== plan.receptor.id) {
      perder(ctx, atacante, plan.receptor, jugadorPorId(defensor, quien));
      return;
    }
    stats.pasesCompletados++;
    registrarPase(ctx, atacante, portador, plan.receptor, posPortador, en?.rivalEncima ?? false);
    if (rompeLineas(e, atacante, posPortador, plan.punto)) anotar(ctx.metricas, portador.id, 'pasesRompeLineas');
    // El balón queda en la celda del punto de recepción (el corto y el pase al espacio van a la celda de destino).
    e.balon = { ...e.balon, zona: plan.zona, carril: plan.carril, portadorId: plan.receptor.id };
    // Matador siempre tira si un pase al espacio le deja en el área (el mano a mano sale de las posiciones, FR-004).
    if (tipo === 'pase_espacio' && plan.zona === 5 && tiene(plan.receptor, 'Matador')) tirar(ctx, atacante, plan.receptor, 'normal', { asistente: portador });
    return;
  }

  switch (accion) {
    case 'conduccion':
    case 'regate': {
      const destino = Math.min(5, zona + 1);
      // Hacia la zona siguiente hasta la distancia de conducción (research R5): por su carril o, tras un regate ganado
      // en campo rival desde una banda, en diagonal hacia el carril central, camino del área (H11).
      const actual = aEquipo(atacante.lado, e.espacio.balon);
      const haciaDentro =
        accion === 'regate' && zona >= 3 && carril !== 1 && ctx.rng.probabilidad(Math.round(p.acciones.regateHaciaDentro * 1000));
      // Solo ante el portero, hacia el punto de penalti (FR-004).
      const meta =
        manoAMano === 'conduccion'
          ? PUNTO_PENALTI
          : haciaDentro
            ? puntoEnCelda(destino, 1, { x: actual.x + dividir(10000, 6), y: CENTRO_Y })
            : puntoEnCelda(destino, carril, { x: actual.x + dividir(10000, 6), y: actual.y });
      const [mx, my] = limitar(meta.x - actual.x, meta.y - actual.y, distanciaConduccion(e, atacante, portador, accion, espacio));
      const objetivo = aAbsoluta(atacante.lado, { x: actual.x + mx, y: actual.y + my });
      conducir(ctx, accion, portador.id, objetivo, { exito: true });
      e.balon = { ...e.balon, ...zonaCarrilDe(atacante.lado, e.espacio.balon) };
      // Matador siempre tira tras un regate ganado en la frontal.
      if (accion === 'regate' && zona >= 4 && tiene(portador, 'Matador')) tirar(ctx, atacante, portador, 'normal');
      return;
    }
    case 'centro': {
      // Rematan los que llegan al área: los cuatro más cercanos al punto de remate, y de ellos los mejores por
      // arriba. Los centrocampistas con Llegador se suman a ellos (research R10).
      const distancia = (j: JugadorEnPartido) => {
        const q = e.espacio.jugadores[j.id]!;
        return dist2(q.x, q.y, puntoRemate.x, puntoRemate.y);
      };
      const llegador = (j: JugadorEnPartido) => tiene(j, 'Llegador') && j.jugador.demarcacion === 'MED';
      const alcance = (j: JugadorEnPartido) => (llegador(j) ? 2 * CERCA_REMATE : CERCA_REMATE);
      const disponibles = atacante.jugadores.filter((j) => j.enCampo && j !== portador && !esPortero(j) && e.espacio.jugadores[j.id] && distancia(j) <= alcance(j) * alcance(j));
      const cerca = [...disponibles].sort((a, b) => distancia(a) - distancia(b) || a.id - b.id).slice(0, 4);
      for (const j of disponibles) if (tiene(j, 'Llegador') && j.jugador.demarcacion === 'MED' && !cerca.includes(j)) cerca.push(j);
      // Llegada desde segunda línea (H11): el extremo o el mediapunta que ataca el área suma en el remate.
      const llegaDeSegunda = (j: JugadorEnPartido) => papelLlegada(atacante, j) !== null;
      const porArriba = (j: JugadorEnPartido) =>
        atributo(e, atacante, j, 'aereo') +
        (tiene(j, 'Llegador') && j.jugador.demarcacion === 'MED' ? 15 : 0) +
        (tiene(j, 'Rematador') ? 8 : 0) +
        (tiene(j, 'Cabeceador') ? 6 : 0) +
        (llegaDeSegunda(j) ? 8 : 0);
      // Centro raso o atrás (H11): lo remata con el pie uno de los que llegan, por cercanía al punto de remate y
      // con más peso para el que llega de segunda línea.
      const raso = ctx.rng.probabilidad(Math.round(p.acciones.centroRaso * 1000));
      const candidatos = cerca.sort((a, b) => porArriba(b) - porArriba(a) || a.id - b.id);
      const rematador = raso
        ? elegirPonderado(
            ctx.rng,
            candidatos.map((j) => {
              const d = dividir(isqrt(distancia(j)), 10);
              const peso = dividir(1_000_000_000, (60 + d) * (60 + d));
              return [j, Math.max(1, llegaDeSegunda(j) ? dividir(peso * Math.round(1000 * p.acciones.bonusLlegada), 1000) : peso)] as [JugadorEnPartido, number];
            }),
          )
        : (candidatos[ctx.rng.probabilidad(600) ? 0 : 1] ?? candidatos[0]);
      if (!rematador) return;
      // El rematador ataca el espacio entre el punto de penalti y el área pequeña.
      e.espacio.destinos[rematador.id] = aAbsoluta(atacante.lado, { x: 9200, y: 3200 + (carril === 0 ? -400 : carril === 2 ? 400 : 0) });
      controlar(ctx, portador.id, p.espacio.controlMinimoTicks);
      // El rematador en fuera de juego al salir el centro (spec 014, FR-008).
      const fuera = conFueraDeJuego ? fotoFueraDeJuego(e, atacante, rematador) : null;
      volar(ctx, 'centro', portador.id, { jugadorId: rematador.id }, { exito: !fuera, aerea: !raso });
      if (fuera) {
        fueraDeJuego(ctx, atacante, rematador, fuera.punto, fuera);
        return;
      }
      e.balon = { ...e.balon, zona: 5, carril: 1, portadorId: rematador.id };
      // Agarrón en el duelo aéreo: falta (penalti si es dentro del área, research R7).
      const marcador = rivalCercano(ctx, defensor);
      if (marcador && ctx.rng.probabilidad(Math.round(p.disciplina.probabilidadFaltaDueloAereoArea * 1000))) {
        falta(ctx, atacante, rematador, defensor, marcador);
        return;
      }
      const cabeza = !raso && ctx.rng.probabilidad(600);
      tirar(ctx, atacante, rematador, cabeza ? 'cabeza' : 'normal', { asistente: portador, trasCentro: true });
      return;
    }
  }
}
