/**
 * Acciones con balón (T085; FR-033; spec 002, research R4): en cada paso, quien lleva el balón elige una
 * acción según la zona, la táctica, la formación y lo que ve a su alrededor (`opciones.ts`), y la resuelve
 * en un duelo contra el rival real más cercano. La acción se representa con física: el balón vuela hacia el
 * receptor, el jugador conduce hasta su punto, etc., y su duración sale de ahí (no hay duraciones fijas).
 */
import { rival, type EquipoEstado, type EstadoMotor, type JugadorEnPartido } from '../estado/estado';
import { dist2, dividir, escalar, isqrt, limitar } from '../espacio/aritmetica';
import { aAbsoluta, aEquipo, puntoEnCelda, type Punto } from '../espacio/geometria';
import { velocidadMaxima } from '../espacio/movimiento';
import { atributo, type Atributo } from '../modificadores/atributos';
import { desplazamientoAtaque, probabilidadAvance, probabilidadBanda, type TipoAccion } from '../modificadores/formacionTactica';
import { ajusteDuelo, bonusInfranqueable, tiene } from '../modificadores/specials';
import { balonCon, conducir, controlar, recuperarSuelto, reponer, ticksDeCarrera, ticksDeVuelo, volar } from './animaciones';
import { falta, fueraDeJuego } from './balonParado';
import { elegirPonderado, esPortero, interrumpir, jugadorPorId, pasarTiempo, receptor, rivalCercano, type Contexto } from './contexto';
import { probabilidad, resolver } from './duelo';
import { comprobarLesion } from './lesiones';
import { pesosConEspacio } from './opciones';
import { saqueDePuerta, tirar } from './tiro';

/** Atributo del atacante y del defensor en cada acción. */
const ENFRENTAMIENTO: Record<TipoAccion, [Atributo, Atributo]> = {
  pase_corto: ['pase', 'anticipacion'],
  pase_largo: ['vision', 'anticipacion'],
  conduccion: ['velocidad', 'quite'],
  regate: ['regate', 'quite'],
  pase_espacio: ['vision', 'anticipacion'],
  centro: ['centro', 'anticipacion'],
  tiro_lejano: ['remate', 'anticipacion'],
  remate: ['remate', 'anticipacion'],
};

const esPase = (a: TipoAccion) => a === 'pase_corto' || a === 'pase_largo' || a === 'pase_espacio';

function portadorActual(ctx: Contexto, atacante: EquipoEstado): JugadorEnPartido | undefined {
  const b = ctx.estado.balon;
  const actual = jugadorPorId(atacante, b.portadorId);
  if (actual?.enCampo) return actual;
  const nuevo = receptor(ctx, atacante, b.zona, b.carril, -1);
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

/** Un pase completado: secuencia, pared (A → B → A) y cambio de orientación (research R4). */
function registrarPase(ctx: Contexto, atacante: EquipoEstado, de: JugadorEnPartido, a: JugadorEnPartido, desdeY: number): void {
  const e = ctx.estado;
  const s = e.estadisticas[atacante.lado];
  const ultimo = e.posesion.ultimoPase;
  if (ultimo && ultimo.de === a.id && ultimo.a === de.id) s.paredes++;
  const hastaY = e.espacio.jugadores[a.id]?.y ?? desdeY;
  if (Math.abs(hastaY - desdeY) > 3500) s.cambiosOrientacion++;
  e.posesion.pases++;
  e.posesion.ultimoPase = { de: de.id, a: a.id };
}

/** El defensor recupera el balón. */
function perder(ctx: Contexto, atacante: EquipoEstado, perdedor: JugadorEnPartido, recuperador: JugadorEnPartido | undefined): void {
  const e = ctx.estado;
  const defensor = e.equipos[rival(atacante.lado)];
  const zonaRecuperacion = 5 - e.balon.zona;
  const s = e.parametros.specials;

  // Recuperador tras pérdida: presiona de inmediato para volver a robarla.
  if (tiene(perdedor, 'RecuperadorTrasPerdida') && recuperador) {
    const p = probabilidad({ base: -0.6, atacante: atributo(e, atacante, perdedor, 'quite'), defensor: atributo(e, defensor, recuperador, 'regate'), ajuste: s.bonusProbabilidadAlto }, e.parametros);
    if (resolver(ctx.rng, p)) {
      e.estadisticas[atacante.lado].recuperaciones++;
      if (e.balon.zona >= 3) e.estadisticas[atacante.lado].recuperacionesCampoRival++;
      e.balon.portadorId = perdedor.id;
      if (!balonCon(e, perdedor.id)) recuperarSuelto(ctx, perdedor.id);
      else pasarTiempo(ctx, 2);
      return;
    }
  }

  e.estadisticas[defensor.lado].recuperaciones++;
  if (zonaRecuperacion >= 3) e.estadisticas[defensor.lado].recuperacionesCampoRival++;
  const nuevo = recuperador ?? receptor(ctx, defensor, zonaRecuperacion, 2 - e.balon.carril, -1);
  // Un equipo que juega al contraataque busca la espalda rival nada más recuperar.
  const transicion =
    defensor.tactica.estiloConBalon === 'contraataque' &&
    ctx.rng.probabilidad(Math.round((0.35 + e.parametros.tacticas.contraataque.peligroTransicion) * 1000));
  e.balon = { posesion: defensor.lado, zona: zonaRecuperacion, carril: 2 - e.balon.carril, portadorId: nuevo?.id ?? 0, transicion };
  actualizarPosesion(ctx);
  if (nuevo && !balonCon(e, nuevo.id)) recuperarSuelto(ctx, nuevo.id);
  else pasarTiempo(ctx, 2);
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
  const sacador = receptor(ctx, defensor, 5 - zona, 2 - e.balon.carril, -1);
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

/** Ajustes de probabilidad por specials del atacante en una acción concreta. */
function ajusteSpecialsAccion(ctx: Contexto, accion: TipoAccion, j: JugadorEnPartido, zona: number, carril: number, defensor: JugadorEnPartido | undefined): number {
  const s = ctx.estado.parametros.specials;
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
function pasar(ctx: Contexto, tipo: 'pase_corto' | 'pase_largo' | 'pase_espacio', atacante: EquipoEstado, de: JugadorEnPartido, a: JugadorEnPartido, punto: Punto, exito: boolean): void {
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
  volar(ctx, tipo, de.id, { jugadorId: a.id }, { exito });
}

/**
 * Ticks mínimos de control antes de un pase según el pase medio de los centrocampistas en el campo (o de
 * todos los de campo, si no hay ninguno): `controlPaseTicks` con el stat de referencia, `controlPorStat`
 * menos por cada 10 puntos más.
 */
function controlPorRitmo(e: EstadoMotor, equipo: EquipoEstado): number {
  const a = e.parametros.acciones;
  let suma = 0;
  let n = 0;
  for (const j of equipo.jugadores) {
    if (!j.enCampo || j.jugador.demarcacion !== 'MED') continue;
    suma += atributo(e, equipo, j, 'pase');
    n++;
  }
  if (n === 0) {
    for (const j of equipo.jugadores) {
      if (!j.enCampo || j.casillaId === 'POR') continue;
      suma += atributo(e, equipo, j, 'pase');
      n++;
    }
  }
  const pase = n > 0 ? suma / n : a.statPaseReferencia;
  return Math.max(0, Math.round(a.controlPaseTicks - (a.controlPorStat * (pase - a.statPaseReferencia)) / 10));
}

/** Un paso de juego: una acción de quien lleva el balón. */
export function paso(ctx: Contexto): void {
  const e = ctx.estado;
  const p = e.parametros;
  actualizarPosesion(ctx);
  const atacante = e.equipos[e.balon.posesion];
  const defensor = e.equipos[rival(atacante.lado)];
  const portador = portadorActual(ctx, atacante);
  if (!portador) {
    pasarTiempo(ctx, 3);
    return;
  }
  // Si el balón no está con quien debe llevarlo, primero va a por él.
  if (!balonCon(e, portador.id)) recuperarSuelto(ctx, portador.id);
  const { zona, carril } = e.balon;

  let accion: TipoAccion;
  if (e.balon.transicion && zona <= 3) {
    accion = 'pase_espacio';
  } else {
    accion = elegirPonderado(ctx.rng, pesosConEspacio(e, atacante, portador, zona, carril));
  }
  const transicion = e.balon.transicion;
  e.balon.transicion = false;

  if (accion === 'remate') {
    tirar(ctx, atacante, portador, 'normal');
    return;
  }
  if (accion === 'tiro_lejano') {
    tirar(ctx, atacante, portador, 'lejano');
    return;
  }

  const [atA, atD] = ENFRENTAMIENTO[accion];
  // El atacante busca el punto débil: el más flojo de los dos rivales más cercanos en esa acción.
  const rivalDuelo = rivalCercano(ctx, defensor, zona >= 5, (j) => atributo(e, defensor, j, atD));
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
  const posPortador = { ...(e.espacio.jugadores[portador.id] ?? e.espacio.balon) };

  // Pase al espacio: la defensa con línea adelantada provoca más fueras de juego.
  if (accion === 'pase_espacio') {
    const fdj = p.acciones.probabilidadFueraDeJuegoBase + (defensor.tactica.lineaAdelantada ? p.tacticas.lineaAdelantada.fuerasDeJuegoProvocados : 0);
    if (ctx.rng.probabilidad(Math.round(fdj * 1000))) {
      const desmarcado = receptor(ctx, atacante, Math.min(5, zona + 2), carril, portador.id) ?? portador;
      if (desmarcado !== portador) {
        stats.pases++;
        pasar(ctx, 'pase_espacio', atacante, portador, desmarcado, puntoCelda(atacante.lado, Math.min(5, zona + 2), carril, e.espacio.jugadores[desmarcado.id] ?? posPortador), false);
      }
      fueraDeJuego(ctx, atacante, desmarcado);
      return;
    }
  }

  const exito = probabilidad(
    {
      base,
      atacante: atributo(e, atacante, portador, atA) + aj.atacante,
      defensor: valorDefensor + aj.defensor,
      desplazamiento: desplazamientoAtaque(e, atacante, defensor, accion, zona),
      ajuste: aj.probabilidad + ajusteSpecialsAccion(ctx, accion, portador, zona, carril, rivalDuelo),
      ...(esPase(accion) ? { pendiente: p.acciones.pendientePase } : {}),
    },
    p,
  );
  const ok = resolver(ctx.rng, exito, {
    rerollAtacante: (accion === 'regate' && tiene(portador, 'Filigranas')) || (accion === 'centro' && tiene(portador, 'GuanteEnElPie')),
    rerollDefensor: zona >= 4 && rivalDuelo !== undefined && tiene(rivalDuelo, 'MuroDefensivo') && accion !== 'regate',
  });
  if (esPase(accion)) stats.pases++;
  if (accion === 'centro') stats.centros++;
  if (accion === 'conduccion' || accion === 'regate') stats.conducciones++;

  if (!ok) {
    // Regates y conducciones frenados con falta; pases que salen del campo; el resto, pérdida.
    const frenado = rivalDuelo ? alLadoDe(e, portador.id, rivalDuelo.id) : posPortador;
    if ((accion === 'regate' || accion === 'conduccion') && rivalDuelo && ctx.rng.probabilidad(Math.round(p.disciplina.probabilidadFaltaPorEntrada * 1000 * 1.6))) {
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
    if (esPase(accion) || accion === 'centro') {
      controlar(ctx, portador.id, p.espacio.controlMinimoTicks);
      const aerea = accion === 'centro' || accion === 'pase_largo';
      if (rivalDuelo) volar(ctx, accion, portador.id, { jugadorId: rivalDuelo.id }, { exito: false, aerea });
      else {
        // Sin un rival cerca, el pase sale mal y el balón queda suelto por delante.
        const delante = aEquipo(atacante.lado, e.espacio.balon);
        volar(ctx, accion, portador.id, { punto: aAbsoluta(atacante.lado, { x: Math.min(9500, delante.x + 1500), y: delante.y }) }, { exito: false, aerea });
      }
    } else {
      conducir(ctx, accion, portador.id, { x: frenado.x, y: frenado.y }, { exito: false, maximo: 20 });
    }
    if (accion === 'regate' || accion === 'conduccion') comprobarLesion(ctx, atacante, portador);
    if (e.fase === 'finalizado') return;
    perder(ctx, atacante, portador, rivalDuelo);
    return;
  }

  if (esPase(accion)) stats.pasesCompletados++;
  // Un duelo ganado con regate o conducción también puede acabar en falta del defensor.
  if ((accion === 'regate' || accion === 'conduccion') && rivalDuelo && ctx.rng.probabilidad(Math.round(p.disciplina.probabilidadFaltaPorEntrada * 1000 * 0.5))) {
    const frenado = alLadoDe(e, portador.id, rivalDuelo.id);
    conducir(ctx, accion, portador.id, { x: frenado.x, y: frenado.y }, { exito: true, maximo: 20 });
    falta(ctx, atacante, portador, defensor, rivalDuelo);
    return;
  }

  switch (accion) {
    case 'pase_corto': {
      const avanza = ctx.rng.probabilidad(Math.round(probabilidadAvance(e, atacante, defensor, zona) * 1000));
      const nuevaZona = Math.min(5, zona + (avanza ? 1 : 0));
      // Llegar al área con un pase corto exige superar una línea más.
      const destino = nuevaZona === 5 && !ctx.rng.probabilidad(Math.round(p.acciones.llegadaArea * 1000)) ? 4 : nuevaZona;
      const nuevoCarril = avanza ? (ctx.rng.probabilidad(Math.round(probabilidadBanda(atacante) * 1000)) ? (ctx.rng.probabilidad(500) ? 0 : 2) : 1) : carril;
      const r = receptor(ctx, atacante, destino, nuevoCarril, portador.id);
      if (r) {
        pasar(ctx, 'pase_corto', atacante, portador, r, puntoCelda(atacante.lado, destino, nuevoCarril, e.espacio.jugadores[r.id]!), true);
        registrarPase(ctx, atacante, portador, r, posPortador.y);
      }
      e.balon = { ...e.balon, zona: destino, carril: nuevoCarril, portadorId: r?.id ?? portador.id };
      return;
    }
    case 'pase_largo': {
      const destino = Math.min(4, zona + 2);
      const nuevoCarril = ctx.rng.entero(0, 2);
      const r = receptor(ctx, atacante, destino, nuevoCarril, portador.id);
      if (r) {
        pasar(ctx, 'pase_largo', atacante, portador, r, puntoCelda(atacante.lado, destino, nuevoCarril, e.espacio.jugadores[r.id]!), true);
        registrarPase(ctx, atacante, portador, r, posPortador.y);
      }
      e.balon = { ...e.balon, zona: destino, carril: nuevoCarril, portadorId: r?.id ?? portador.id };
      return;
    }
    case 'conduccion':
    case 'regate': {
      const destino = Math.min(5, zona + 1);
      // Hacia la zona siguiente, por su carril, como mucho `conduccionMaxima`.
      const actual = aEquipo(atacante.lado, e.espacio.balon);
      const meta = puntoEnCelda(destino, carril, { x: actual.x + dividir(10000, 6), y: actual.y });
      const [mx, my] = limitar(meta.x - actual.x, meta.y - actual.y, p.espacio.conduccionMaxima);
      const objetivo = aAbsoluta(atacante.lado, { x: actual.x + mx, y: actual.y + my });
      conducir(ctx, accion, portador.id, objetivo, { exito: true });
      e.balon = { ...e.balon, zona: destino };
      // Un regate ganado en la frontal puede dejar al jugador solo ante el portero.
      if (accion === 'regate' && zona >= 4 && ctx.rng.probabilidad(Math.round(p.acciones.probabilidadManoAMano * 1000))) {
        tirar(ctx, atacante, portador, 'manoAMano');
      }
      return;
    }
    case 'pase_espacio': {
      const destino = Math.min(5, zona + (zona >= 3 ? 2 : 1));
      const r = receptor(ctx, atacante, destino, carril, portador.id) ?? portador;
      if (r !== portador) {
        pasar(ctx, 'pase_espacio', atacante, portador, r, puntoCelda(atacante.lado, destino, carril, e.espacio.jugadores[r.id]!), true);
        registrarPase(ctx, atacante, portador, r, posPortador.y);
      }
      e.balon = { ...e.balon, zona: destino, portadorId: r.id };
      if (destino === 5 && ctx.rng.probabilidad(Math.round(p.acciones.probabilidadManoAMano * 1000))) {
        tirar(ctx, atacante, r, 'manoAMano', { asistente: portador });
      }
      return;
    }
    case 'centro': {
      // Rematan los que llegan al área: los cuatro más cercanos al punto de remate, y de ellos los mejores por arriba.
      const puntoRemate = aAbsoluta(atacante.lado, { x: 9200, y: 3200 });
      const cerca = atacante.jugadores
        .filter((j) => j.enCampo && j !== portador && !esPortero(j) && e.espacio.jugadores[j.id])
        .sort((a, b) => {
          const pa = e.espacio.jugadores[a.id]!;
          const pb = e.espacio.jugadores[b.id]!;
          return dist2(pa.x, pa.y, puntoRemate.x, puntoRemate.y) - dist2(pb.x, pb.y, puntoRemate.x, puntoRemate.y) || a.id - b.id;
        })
        .slice(0, 4);
      const candidatos = cerca.sort((a, b) => atributo(e, atacante, b, 'aereo') - atributo(e, atacante, a, 'aereo') || a.id - b.id);
      const rematador = candidatos[ctx.rng.probabilidad(600) ? 0 : 1] ?? candidatos[0];
      if (!rematador) return;
      // El rematador ataca el espacio entre el punto de penalti y el área pequeña.
      e.espacio.destinos[rematador.id] = aAbsoluta(atacante.lado, { x: 9200, y: 3200 + (carril === 0 ? -400 : carril === 2 ? 400 : 0) });
      controlar(ctx, portador.id, p.espacio.controlMinimoTicks);
      volar(ctx, 'centro', portador.id, { jugadorId: rematador.id }, { exito: true, aerea: true });
      e.balon = { ...e.balon, zona: 5, carril: 1, portadorId: rematador.id };
      const cabeza = ctx.rng.probabilidad(600);
      tirar(ctx, atacante, rematador, cabeza ? 'cabeza' : 'normal', { asistente: portador, trasCentro: true });
      return;
    }
  }
}
