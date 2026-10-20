/**
 * Tiros (T085; spec 003, research R6, R7 y R11): precisión frente al bloqueo y gol frente a la parada del
 * portero, con la distancia y el ángulo reales del tirador, los specials de remate (Matador, Rematador,
 * Cabeceador, Llegador, lanzadores) y de portero (Parapenalties, One-to-One, Ordenabarreras y el reroll de
 * Santo), y los goles en propia puerta (despejes de centros y tiros desviados).
 */
import type { ParametrosEquilibrado } from '@fbd/domain';
import { rival, type EquipoEstado, type JugadorEnPartido } from '../estado/estado';
import { anguloTiro, distanciaPorteria, enAreaRival, metrosDeDecimas, zonaRemate } from '../espacio/campo';
import { aAbsoluta, aEquipo, CENTRO_Y, LARGO, type Punto } from '../espacio/geometria';
import { sacadorDeCentro } from '../espacio/colocacion';
import { anotar } from '../metricas';
import { atributo } from '../modificadores/atributos';
import { desplazamientoAtaque } from '../modificadores/formacionTactica';
import { ajusteDuelo, santoActivo, tiene } from '../modificadores/specials';
import type { GrupoGol, TipoTiro as TipoTiroGol, ZonaRemate } from '../tipos';
import { controlar, reponer, volar } from './animaciones';
import { falta } from './balonParado';
import { emitir, interrumpir, pasarTiempo, portero, rivalCercano, type Contexto } from './contexto';
import { probabilidad, resolver } from './duelo';
import { desplazamientoTiro } from './pesoTiro';

export { desplazamientoTiro, pesoTiro } from './pesoTiro';

/** Tipo de un tiro (los goles en propia puerta no son tiros). */
export type TipoTiro = Exclude<TipoTiroGol, 'propia'>;

const GRUPO: Record<TipoTiro, GrupoGol> = { normal: 'jugada', lejano: 'jugada', manoAMano: 'jugada', cabeza: 'cabeza', falta: 'falta', penalti: 'penalti' };

/** El tipo deja de depender de la zona lógica: `normal` dentro del área y `lejano` fuera (research R6). */
export function tipoSegunPosicion(tipo: TipoTiro, punto: Punto): TipoTiro {
  if (tipo !== 'normal' && tipo !== 'lejano') return tipo;
  return enAreaRival(punto) ? 'normal' : 'lejano';
}

/** Distancia (m), zona y ángulo de un remate desde un punto absoluto. */
function remateDesde(atacante: EquipoEstado, absoluto: Punto): { distancia: number; zona: ZonaRemate; angulo: number; decimas: number; punto: Punto } {
  const punto = aEquipo(atacante.lado, absoluto);
  const decimas = distanciaPorteria(punto);
  return { distancia: metrosDeDecimas(decimas), zona: zonaRemate(punto), angulo: anguloTiro(punto), decimas, punto };
}

const ZONA_TIROS = { area: 'tirosArea', frontal: 'tirosFrontal', lejos: 'tirosLejos' } as const;

/**
 * Probabilidad (milésimas) de que el despeje de un centro dentro del área acabe en la propia portería: baja con
 * la defensa del que despeja, acotada a [0, 2·despejeCentro] (FR-020).
 */
export function probabilidadAutogolDespeje(p: ParametrosEquilibrado, defensa: number): number {
  const a = p.tiro.autogol;
  const x = a.despejeCentro * (1 - (a.despejeCentroPorPuntoDefensa * (defensa - 70)) / 10);
  return Math.round(1000 * Math.min(2 * a.despejeCentro, Math.max(0, x)));
}

/** Defensa de un jugador para los despejes: la media de quite y anticipación. */
function defensaDe(ctx: Contexto, equipo: EquipoEstado, j: JugadorEnPartido): number {
  return (atributo(ctx.estado, equipo, j, 'quite') + atributo(ctx.estado, equipo, j, 'anticipacion')) / 2;
}

/**
 * Gol en propia puerta (FR-020, SC-003): el autor es el defensor, el gol suma al equipo `beneficiario` y no
 * cuenta como gol ni asistencia de nadie (`datos.enPropia`).
 */
export function golEnPropia(ctx: Contexto, beneficiario: EquipoEstado, autor: JugadorEnPartido): void {
  const e = ctx.estado;
  const defensor = e.equipos[rival(beneficiario.lado)];
  const r = remateDesde(beneficiario, e.espacio.balon);
  volar(ctx, 'tiro', autor.id, { punto: puntoGol(ctx, beneficiario) }, { exito: true });
  e.marcador[beneficiario.lado]++;
  const s = e.estadisticas[beneficiario.lado];
  s.golesPorTipo.propia++;
  s.golesPorZona[r.zona]++;
  emitir(
    ctx,
    'gol',
    beneficiario.lado,
    [{ rol: 'autor', jugadorId: autor.id }],
    { tipo: 'propia', enPropia: true, distancia: r.distancia, zonaRemate: r.zona, marcador: { ...e.marcador } },
    true,
  );
  interrumpir(ctx, 'gol', 40, defensor.lado);
  saqueDeCentro(ctx, defensor);
}

/**
 * El despeje de un centro dentro del área puede acabar en gol en propia puerta (FR-020): con más defensa, menos
 * probable. Devuelve `true` si ha sido gol.
 */
export function despejeEnPropia(ctx: Contexto, atacante: EquipoEstado, defensor: EquipoEstado, despejador: JugadorEnPartido): boolean {
  const q = ctx.estado.espacio.jugadores[despejador.id];
  if (!q || !enAreaRival(aEquipo(atacante.lado, q))) return false;
  if (!ctx.rng.probabilidad(probabilidadAutogolDespeje(ctx.estado.parametros, defensaDe(ctx, defensor, despejador)))) return false;
  golEnPropia(ctx, atacante, despejador);
  return true;
}

export type ResultadoTiro = 'gol' | 'parada' | 'fuera' | 'bloqueado';

export interface OpcionesTiro {
  asistente?: JugadorEnPartido;
  /** Tras un centro (Rematador). */
  trasCentro?: boolean;
}

export function tirar(ctx: Contexto, atacante: EquipoEstado, tirador: JugadorEnPartido, tipoPedido: TipoTiro, opciones: OpcionesTiro = {}): ResultadoTiro {
  const e = ctx.estado;
  const p = e.parametros;
  const s = p.specials;
  const defensor = e.equipos[rival(atacante.lado)];
  const stats = e.estadisticas[atacante.lado];
  // Distancia y ángulo reales desde la posición del tirador (research R6); a balón parado, desde el punto del saque.
  const balonParado = tipoPedido === 'penalti' || tipoPedido === 'falta';
  const r = remateDesde(atacante, balonParado ? e.espacio.balon : (e.espacio.jugadores[tirador.id] ?? e.espacio.balon));
  const tipo = tipoSegunPosicion(tipoPedido, r.punto);
  const enRemate = { distancia: r.distancia, zonaRemate: r.zona };
  const porDistancia = tipo === 'penalti' ? 0 : desplazamientoTiro(p, r.decimas, r.angulo);
  stats.tiros++;
  stats[ZONA_TIROS[r.zona]]++;
  anotar(ctx.metricas, tirador.id, ZONA_TIROS[r.zona]);
  // Contraataque: posesión que empezó en campo propio y llega al tiro rápido y con pocos pases (research R4).
  if (e.posesion.lado === atacante.lado && e.posesion.enCampoPropio && e.tick - e.posesion.inicioTick < 150 && e.posesion.pases <= 4) {
    stats.contraataques++;
    e.posesion.enCampoPropio = false;
  }
  if (tipo !== 'penalti') controlar(ctx, tirador.id, 2);

  const remate = atributo(e, atacante, tirador, tipo === 'cabeza' ? 'aereo' : 'remate');
  const cercania = tipo === 'normal' || tipo === 'cabeza' || tipo === 'manoAMano';
  let bonusRemate = 0;
  if (tiene(tirador, 'Matador') && tipo === 'manoAMano') bonusRemate += s.bonusProbabilidadAlto;
  if (tiene(tirador, 'Rematador') && opciones.trasCentro) bonusRemate += s.bonusProbabilidadMedio;
  if (tiene(tirador, 'Cabeceador') && tipo === 'cabeza') bonusRemate += s.bonusProbabilidadAlto;
  if (tiene(tirador, 'Llegador') && tirador.jugador.demarcacion === 'MED' && cercania) bonusRemate += s.bonusProbabilidadMedio;
  if (tiene(tirador, 'LanzadorFaltas') && tipo === 'falta') bonusRemate += s.bonusProbabilidadAlto;
  if (tiene(tirador, 'LanzadorPenalties') && tipo === 'penalti') bonusRemate += s.bonusProbabilidadAlto;

  // 1. ¿Va a puerta? (los tiros a balón parado y los mano a mano no tienen bloqueo).
  let bloqueador: JugadorEnPartido | undefined;
  let defensaBloqueo = 70;
  if (tipo === 'normal' || tipo === 'cabeza' || tipo === 'lejano') {
    bloqueador = rivalCercano(ctx, defensor);
    if (bloqueador) defensaBloqueo = atributo(e, defensor, bloqueador, tipo === 'cabeza' ? 'aereo' : 'anticipacion');
  }
  const aj = ajusteDuelo(e, tirador, bloqueador);
  const puerta = probabilidad(
    {
      base: p.acciones.puerta[tipo],
      atacante: remate + aj.atacante,
      defensor: defensaBloqueo + aj.defensor,
      desplazamiento: tipo === 'penalti' ? 0 : desplazamientoAtaque(e, atacante, defensor, 'tiro', e.balon.zona) * 0.5 + porDistancia,
      ajuste: aj.probabilidad + bonusRemate / 2,
    },
    p,
  );
  const arquero = portero(defensor);
  const autor = [{ rol: 'autor' as const, jugadorId: tirador.id }];
  if (!resolver(ctx.rng, puerta)) {
    const bloqueado = bloqueador !== undefined && ctx.rng.probabilidad(450);
    if (bloqueado) volar(ctx, 'tiro', tirador.id, { jugadorId: bloqueador!.id }, { exito: false, aerea: tipo === 'cabeza' });
    else volar(ctx, 'tiro', tirador.id, { punto: puntoFuera(ctx, atacante) }, { exito: false, aerea: tipo === 'cabeza' || tipo === 'lejano' });
    emitir(ctx, 'tiro', atacante.lado, autor, { tipo, resultado: bloqueado ? 'bloqueado' : 'fuera', ...enRemate });
    if (bloqueado && ctx.rng.probabilidad(Math.round(p.acciones.probabilidadCornerTrasDespeje * 1000))) {
      e.cornerPendiente = atacante.lado;
    } else {
      saqueDePuerta(ctx, defensor);
    }
    return bloqueado ? 'bloqueado' : 'fuera';
  }
  e.estadisticas[atacante.lado].tirosPuerta++;

  // Un tiro a puerta desviado por el defensor que lo tapa puede acabar en su propia portería (FR-020).
  if (bloqueador && ctx.rng.probabilidad(Math.round(p.tiro.autogol.desvio * 1000))) {
    emitir(ctx, 'tiro', atacante.lado, autor, { tipo, resultado: 'desviado', ...enRemate });
    golEnPropia(ctx, atacante, bloqueador);
    return 'gol';
  }

  // 2. ¿Gol? Frente a la parada del portero (o de quien esté en la portería).
  let parada = arquero ? atributo(e, defensor, arquero, 'parada') : 10;
  let bonusPortero = 0;
  if (arquero) {
    if (tiene(arquero, 'Parapenalties') && tipo === 'penalti') bonusPortero += s.bonusProbabilidadAlto;
    if (tiene(arquero, 'Ordenabarreras') && tipo === 'falta') bonusPortero += s.bonusProbabilidadMedio;
    const regate = (tirador.jugador.stats as unknown as Record<string, number>).regate ?? 0;
    if (tiene(arquero, 'OneToOne') && (tipo === 'manoAMano' || regate >= 88)) bonusPortero += s.bonusProbabilidadMedio;
    if (tiene(arquero, 'Aura')) parada += 1;
  }
  const ajp = ajusteDuelo(e, tirador, arquero);
  const gol = probabilidad(
    {
      base: p.acciones.gol[tipo],
      atacante: remate + ajp.atacante,
      defensor: parada + ajp.defensor,
      desplazamiento: porDistancia,
      ajuste: bonusRemate - bonusPortero,
    },
    p,
  );
  const santo = arquero !== undefined && tiene(arquero, 'Santo') && santoActivo(e, defensor);
  const marca = resolver(ctx.rng, gol, { rerollDefensor: santo });
  // El balón va a la red o a las manos del portero.
  if (marca || !arquero) volar(ctx, 'tiro', tirador.id, { punto: puntoGol(ctx, atacante) }, { exito: marca, aerea: tipo === 'cabeza' });
  else volar(ctx, 'tiro', tirador.id, { jugadorId: arquero.id }, { exito: false, aerea: tipo === 'cabeza' });

  if (marca) {
    e.marcador[atacante.lado]++;
    stats.golesPorTipo[GRUPO[tipo]]++;
    stats.golesPorZona[r.zona]++;
    anotar(ctx.metricas, tirador.id, 'goles');
    if (tipo === 'falta') anotar(ctx.metricas, tirador.id, 'golesFalta');
    if (tipo === 'cabeza') anotar(ctx.metricas, tirador.id, 'golesCabeza');
    const jugadores = opciones.asistente ? [...autor, { rol: 'asistente' as const, jugadorId: opciones.asistente.id }] : autor;
    emitir(ctx, 'gol', atacante.lado, jugadores, { tipo, marcador: { ...e.marcador }, ...enRemate }, true);
    interrumpir(ctx, 'gol', 40, defensor.lado);
    saqueDeCentro(ctx, defensor);
    return 'gol';
  }

  // Ocasión clara: mano a mano, penalti o remate cercano con muchas opciones de gol.
  const clara = tipo === 'manoAMano' || tipo === 'penalti' || (cercania && gol >= 330);
  if (clara) emitir(ctx, 'ocasion', atacante.lado, autor, { tipo, ...enRemate }, true);
  emitir(ctx, 'parada', defensor.lado, arquero ? [{ rol: 'portero', jugadorId: arquero.id }, ...autor] : autor, { tipo, ...enRemate });
  if (ctx.rng.probabilidad(Math.round(p.acciones.probabilidadCornerTrasParada * 1000))) {
    e.cornerPendiente = atacante.lado;
  } else {
    // El portero atrapa el balón y lo pone en juego.
    e.balon = { posesion: defensor.lado, zona: 0, carril: 1, portadorId: arquero?.id ?? 0, transicion: false };
    pasarTiempo(ctx, 4);
  }
  return 'parada';
}

/** Punto de la red donde entra un gol (coordenadas absolutas), según el tick: no consume números del PRNG. */
function puntoGol(ctx: Contexto, atacante: EquipoEstado): Punto {
  const desvio = ((ctx.estado.tick * 37) % 600) - 300;
  return aAbsoluta(atacante.lado, { x: LARGO + 60, y: CENTRO_Y + desvio });
}

/** Punto fuera de la portería, por la línea de fondo, por donde se va un tiro desviado. */
function puntoFuera(ctx: Contexto, atacante: EquipoEstado): Punto {
  const lado = ctx.estado.tick % 2 === 0 ? 1 : -1;
  return aAbsoluta(atacante.lado, { x: LARGO + 150, y: CENTRO_Y + lado * (450 + ((ctx.estado.tick * 53) % 900)) });
}

export function saqueDePuerta(ctx: Contexto, equipo: EquipoEstado): void {
  interrumpir(ctx, 'saque_puerta', 14, equipo.lado);
  const arquero = portero(equipo);
  ctx.estado.balon = { posesion: equipo.lado, zona: 0, carril: 1, portadorId: arquero?.id ?? 0, transicion: false };
  if (arquero) reponer(ctx, 'saque_puerta', aAbsoluta(equipo.lado, { x: 550, y: CENTRO_Y }), arquero.id);
}

/** Pone el balón en el centro para que saque `equipo` (sin recolocar a nadie: al empezar una parte). */
export function balonAlCentro(ctx: Contexto, equipo: EquipoEstado): JugadorEnPartido | undefined {
  const sacador = sacadorDeCentro(equipo) ?? equipo.jugadores.find((j) => j.enCampo);
  ctx.estado.balon = { posesion: equipo.lado, zona: 2, carril: 1, portadorId: sacador?.id ?? 0, transicion: false };
  return sacador;
}

/**
 * Saque de centro tras un gol: el balón se recoge de la red y se pone en el centro (no viaja desde la portería, que
 * en la 2D parecía un saque desde ella; hallazgo H8) y todos vuelven a su campo mientras el sacador llega.
 */
export function saqueDeCentro(ctx: Contexto, equipo: EquipoEstado): void {
  const sacador = balonAlCentro(ctx, equipo);
  ctx.estado.espacio.balon = { x: LARGO / 2, y: CENTRO_Y, z: 0 };
  if (sacador) reponer(ctx, 'saque_centro', { x: LARGO / 2, y: CENTRO_Y }, sacador.id);
}

/** Córner: el lanzador designado centra y se disputa el balón aéreo (Volador, Cabeceador). */
export function corner(ctx: Contexto, atacante: EquipoEstado): void {
  const e = ctx.estado;
  const p = e.parametros;
  const defensor = e.equipos[rival(atacante.lado)];
  e.estadisticas[atacante.lado].corners++;
  emitir(ctx, 'corner', atacante.lado);
  interrumpir(ctx, 'corner', 90, atacante.lado);
  rematarBalonParado(ctx, atacante, defensor, 'corners', p.acciones.duelaAereo);
}

/**
 * Balón colgado al área (córner o falta lateral): el lanzador centra (Guante en el pie repite),
 * el mejor rematador de cabeza disputa el balón al mejor defensor aéreo (Volador).
 */
export function rematarBalonParado(
  ctx: Contexto,
  atacante: EquipoEstado,
  defensor: EquipoEstado,
  tipo: 'corners' | 'faltas',
  base: number,
): void {
  const e = ctx.estado;
  const p = e.parametros;
  const s = p.specials;
  const enCampoAtk = atacante.jugadores.filter((j) => j.enCampo);
  const lanzador =
    enCampoAtk.find((j) => j.id === atacante.lanzadores[tipo]) ??
    [...enCampoAtk].sort((a, b) => atributo(e, atacante, b, 'centro') - atributo(e, atacante, a, 'centro'))[0];
  if (!lanzador) return;
  // El que saca va al banderín (córner) o al punto de la falta; los demás, a sus sitios.
  const b = ctx.estado.espacio.balon;
  const puntoSaque =
    tipo === 'corners'
      ? aAbsoluta(atacante.lado, { x: LARGO, y: (atacante.lado === 'local' ? b.y : 6400 - b.y) < CENTRO_Y ? 0 : 6400 })
      : { x: b.x, y: b.y };
  e.balon = { posesion: atacante.lado, zona: tipo === 'corners' ? 5 : e.balon.zona, carril: e.balon.carril, portadorId: lanzador.id, transicion: false };
  reponer(ctx, tipo === 'corners' ? 'corner' : 'falta_area', puntoSaque, lanzador.id);
  // Rematan los que han subido al área (los más cercanos al punto de remate) y, de ellos, el mejor por arriba;
  // lo marca el mejor por arriba de los defensores que la protegen (spec 003: el remate sale de su posición real).
  const puntoRemate = aAbsoluta(atacante.lado, { x: 9200, y: CENTRO_Y });
  const cercaDelRemate = (equipo: EquipoEstado, js: JugadorEnPartido[], n: number) =>
    js
      .filter((j) => e.espacio.jugadores[j.id])
      .sort((a, b) => {
        const pa = e.espacio.jugadores[a.id]!;
        const pb = e.espacio.jugadores[b.id]!;
        return (pa.x - puntoRemate.x) ** 2 + (pa.y - puntoRemate.y) ** 2 - ((pb.x - puntoRemate.x) ** 2 + (pb.y - puntoRemate.y) ** 2) || a.id - b.id;
      })
      .slice(0, n);
  const rematadores = cercaDelRemate(atacante, enCampoAtk.filter((j) => j !== lanzador && j.casillaId !== 'POR'), tipo === 'corners' ? 5 : 4);
  const rematador = [...rematadores].sort(
    (a, b) =>
      atributo(e, atacante, b, 'aereo') + (tiene(b, 'Cabeceador') ? 10 : 0) + (tiene(b, 'Rematador') ? 6 : 0) - (atributo(e, atacante, a, 'aereo') + (tiene(a, 'Cabeceador') ? 10 : 0) + (tiene(a, 'Rematador') ? 6 : 0)) || a.id - b.id,
  )[0];
  const defensores = defensor.jugadores.filter((j) => j.enCampo && j.casillaId !== 'POR');
  const marcador = [...cercaDelRemate(defensor, defensores, 4)].sort(
    (a, b) =>
      atributo(e, defensor, b, 'aereo') + (tiene(b, 'Volador') ? 6 : 0) - (atributo(e, defensor, a, 'aereo') + (tiene(a, 'Volador') ? 6 : 0)) || a.id - b.id,
  )[0];
  if (!rematador) return;
  let ajuste = 0;
  if (marcador && tiene(marcador, 'Volador')) ajuste -= s.bonusProbabilidadAlto;
  const centro = probabilidad(
    {
      base,
      atacante: (atributo(e, atacante, lanzador, 'centro') + atributo(e, atacante, rematador, 'aereo')) / 2,
      defensor: marcador ? atributo(e, defensor, marcador, 'aereo') : 50,
      ajuste,
    },
    p,
  );
  // El centro de un balón parado también es un centro (FR-024).
  e.estadisticas[atacante.lado].centros++;
  // Agarrón en el duelo aéreo: falta, que es penalti si se comete dentro del área (research R7).
  if (marcador && ctx.rng.probabilidad(Math.round(p.disciplina.probabilidadFaltaDueloAereoArea * 1000))) {
    volar(ctx, 'centro', lanzador.id, { jugadorId: rematador.id }, { exito: false, aerea: true });
    e.balon = { posesion: atacante.lado, zona: 5, carril: 1, portadorId: rematador.id, transicion: false };
    falta(ctx, atacante, rematador, defensor, marcador);
    return;
  }
  if (resolver(ctx.rng, centro, { rerollAtacante: tiene(lanzador, 'GuanteEnElPie') })) {
    volar(ctx, 'centro', lanzador.id, { jugadorId: rematador.id }, { exito: true, aerea: true });
    e.balon = { posesion: atacante.lado, zona: 5, carril: 1, portadorId: rematador.id, transicion: false };
    tirar(ctx, atacante, rematador, 'cabeza', { asistente: lanzador, trasCentro: true });
  } else {
    // Despeje: la defensa se hace con el balón cerca de su área.
    const despejador = marcador ?? defensores[0];
    if (despejador) volar(ctx, 'centro', lanzador.id, { jugadorId: despejador.id }, { exito: false, aerea: true });
    if (despejador && despejeEnPropia(ctx, atacante, defensor, despejador)) return;
    e.balon = { posesion: defensor.lado, zona: 1, carril: ctx.rng.entero(0, 2), portadorId: despejador?.id ?? 0, transicion: false };
  }
}
