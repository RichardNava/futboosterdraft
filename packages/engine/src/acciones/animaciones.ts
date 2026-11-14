/**
 * Acciones visibles (research R4; data-model §7.5): cada acción con balón tiene origen, destino y una
 * duración que sale de la física (vuelo del balón, carrera del jugador o tiempo de control), y queda
 * registrada para la 2D. El balón solo se mueve dentro de una de estas acciones o pegado a quien lo lleva.
 */
import type { AccionEnCurso, EstadoMotor, TipoAccionVisible } from '../estado/estado';
import { acotar, dist2, isqrt } from '../espacio/aritmetica';
import { destinoBalon as destinoDelVuelo, esVuelo } from '../espacio/balon';
import { LARGO, type Punto } from '../espacio/geometria';
import { anotar } from '../metricas';
import { anotarFotograma, pasarTiempo, type Contexto } from './contexto';

/** Llegada a un punto: a menos de esta distancia, en décimas. */
const LLEGADA = 150;
/** Distancia a su sitio a la que se da por colocado a un jugador en un balón parado. */
const COLOCADO = 400;
/** Borde del área rival (x en coordenadas del equipo que ataca). */
const AREA_X = 8430;
/** Límite de ticks de una acción de duración variable (salvaguarda). */
const MAXIMO_TICKS = 120;

type TipoBalon = keyof EstadoMotor['parametros']['espacio']['velocidadBalon'];
const BALON_DE: Partial<Record<TipoAccionVisible, TipoBalon>> = {
  pase_corto: 'raso',
  pase_espacio: 'raso',
  pase_largo: 'largo',
  centro: 'centro',
  tiro: 'tiro',
  despeje: 'despeje',
};

function abrir(ctx: Contexto, accion: Omit<AccionEnCurso, 'inicioTick' | 'origen' | 'finTick'> & { finTick?: number }): AccionEnCurso {
  const e = ctx.estado;
  const a: AccionEnCurso = { ...accion, inicioTick: e.tick, finTick: accion.finTick ?? e.tick, origen: { ...e.espacio.balon } };
  e.espacio.accion = a;
  anotarFotograma(ctx);
  return a;
}

function cerrar(ctx: Contexto, a: AccionEnCurso): void {
  const e = ctx.estado;
  a.finTick = e.tick;
  e.espacio.accion = null;
  e.acciones.push({ tipo: a.tipo, inicioTick: a.inicioTick, finTick: a.finTick, de: a.deId, ...(a.aId !== undefined ? { a: a.aId } : {}), exito: a.exito });
  anotarFotograma(ctx);
}

/** Pasa ticks hasta que se cumple la condición (con un mínimo y un máximo). */
function hasta(ctx: Contexto, condicion: () => boolean, minimo: number, parada = false, maximo = MAXIMO_TICKS): void {
  let n = 0;
  while ((n < minimo || !condicion()) && n < Math.max(minimo, maximo)) {
    pasarTiempo(ctx, 1, parada);
    n++;
  }
}

const posicion = (e: EstadoMotor, id: number): Punto | null => {
  const p = e.espacio.jugadores[id];
  return p ? { x: p.x, y: p.y } : null;
};

/** Control y preparación con el balón en los pies (el balón va pegado). */
export function controlar(ctx: Contexto, jugadorId: number, ticks: number): void {
  if (ticks <= 0) return;
  const a = abrir(ctx, { tipo: 'control', deId: jugadorId, destino: { ...ctx.estado.espacio.balon }, aerea: false, exito: true });
  pasarTiempo(ctx, ticks);
  cerrar(ctx, a);
}

/** Ticks que tarda el balón de una acción en recorrer una distancia (décimas). */
function velocidadDeVuelo(estado: EstadoMotor, tipo: TipoAccionVisible): number {
  return estado.parametros.espacio.velocidadBalon[BALON_DE[tipo] ?? 'raso'];
}

/** Ticks que tarda el balón de una acción en recorrer `distancia` (décimas), con el mínimo de vuelo. */
export function ticksDeVuelo(estado: EstadoMotor, tipo: TipoAccionVisible, distancia: number): number {
  return Math.max(estado.parametros.espacio.vueloMinimoTicks, Math.ceil(distancia / velocidadDeVuelo(estado, tipo)));
}

/** Ticks que tarda un jugador en llegar a un punto a su velocidad máxima. */
export function ticksDeCarrera(estado: EstadoMotor, jugadorId: number, punto: Punto, vmax: number): number {
  const p = posicion(estado, jugadorId);
  if (!p) return 0;
  return Math.ceil(isqrt(dist2(p.x, p.y, punto.x, punto.y)) / Math.max(1, vmax));
}

/**
 * Balón en vuelo hacia un jugador (lo sigue hasta llegarle) o hacia un punto. Si el destino es un jugador
 * con un punto de llegada asignado (`destinos`), el balón tarda lo que tarda en llegar a ese punto. Devuelve quién se
 * queda el balón si iba a un jugador.
 */
export function volar(
  ctx: Contexto,
  tipo: TipoAccionVisible,
  deId: number,
  destino: { jugadorId: number } | { punto: Punto },
  opciones: { exito: boolean; aerea?: boolean; disputa?: boolean },
): number | undefined {
  const e = ctx.estado;
  if (!esVuelo(tipo)) throw new Error(`${tipo} no es un vuelo`);
  const b = e.espacio.balon;
  const aId = 'jugadorId' in destino ? destino.jugadorId : undefined;
  const llegada = aId !== undefined ? (e.espacio.destinos[aId] ?? posicion(e, aId)) : (destino as { punto: Punto }).punto;
  const punto = llegada ?? { x: b.x, y: b.y };
  const distancia = isqrt(dist2(b.x, b.y, punto.x, punto.y));
  // Pases cortos: no más rápido de lo necesario para llegar en `vueloMinimoTicks`.
  const velocidad = Math.min(velocidadDeVuelo(e, tipo), Math.max(40, Math.ceil(distancia / e.parametros.espacio.vueloMinimoTicks)));
  const a = abrir(ctx, {
    tipo,
    deId,
    ...(aId !== undefined && posicion(e, aId) ? { aId } : {}),
    destino: punto,
    aerea: opciones.aerea ?? false,
    exito: opciones.exito,
    velocidad,
    finTick: e.tick + Math.max(1, Math.ceil(distancia / velocidad)),
  });
  // Hasta que el balón llega a su destino (el punto de recepción, si va a un jugador).
  hasta(ctx, () => {
    if (aId !== undefined) return a.enPunto === true;
    const d = destinoDelVuelo(e);
    return d !== null && e.espacio.balon.x === d.x && e.espacio.balon.y === d.y;
  }, 1);
  if (aId !== undefined) delete e.espacio.destinos[aId];
  cerrar(ctx, a);
  // Si el receptor aún no ha llegado al punto, el balón no vuelve atrás: sigue rodando y él va a por él. Devuelve quién
  // se queda el balón (puede llegar antes un rival).
  if (aId !== undefined && !balonCon(e, aId)) {
    const registro = e.acciones[e.acciones.length - 1];
    const quien = recuperarSuelto(ctx, aId, 1, opciones.disputa);
    // Si llega antes un rival, el pase no llegó a su destinatario.
    if (quien !== aId && registro) registro.exito = false;
    return quien;
  }
  return aId;
}

/** Conducción o regate: el jugador lleva el balón hasta un punto (o hasta donde le frenen). */
export function conducir(ctx: Contexto, tipo: 'conduccion' | 'regate', jugadorId: number, punto: Punto, opciones: { exito: boolean; maximo?: number }): void {
  const e = ctx.estado;
  e.espacio.destinos[jugadorId] = punto;
  const a = abrir(ctx, { tipo, deId: jugadorId, destino: punto, aerea: false, exito: opciones.exito });
  const llegado = () => {
    const p = posicion(e, jugadorId);
    return !p || dist2(p.x, p.y, punto.x, punto.y) <= LLEGADA * LLEGADA;
  };
  let n = 0;
  const maximo = opciones.maximo ?? MAXIMO_TICKS;
  while (!llegado() && n < maximo) {
    pasarTiempo(ctx, 1);
    n++;
  }
  if (n === 0) pasarTiempo(ctx, 1);
  delete e.espacio.destinos[jugadorId];
  cerrar(ctx, a);
}

/**
 * Reanudación a balón parado (FR-022a): el balón rueda hasta el punto del saque y quien saca va a por él
 * mientras los demás se colocan. Consume el tiempo de parada pendiente de la interrupción.
 */
export function reponer(ctx: Contexto, motivo: string, punto: Punto, sacadorId: number): void {
  const e = ctx.estado;
  const esp = e.espacio;
  const minimo = Math.max(esp.paradaPendiente, 1);
  esp.paradaPendiente = 0;
  const destino = { x: acotar(punto.x, 0, 10000), y: acotar(punto.y, 0, 6400) };
  if (posicion(e, sacadorId)) esp.destinos[sacadorId] = destino;
  const a = abrir(ctx, { tipo: 'saque', deId: sacadorId, destino, aerea: false, exito: true, motivo });
  // En un córner o una falta al área se espera también a que los que van al área rival estén en su sitio.
  const alArea = motivo === 'corner' || motivo === 'falta_area';
  const colocados = () => {
    const local = e.balon.posesion === 'local';
    for (const j of e.equipos[e.balon.posesion].jugadores) {
      const q = esp.jugadores[j.id];
      const o = esp.objetivos[j.id];
      if (!j.enCampo || !q || !o || j.id === sacadorId || (local ? o.x : LARGO - o.x) < AREA_X) continue;
      if (dist2(q.x, q.y, o.x, o.y) > COLOCADO * COLOCADO) return false;
    }
    return true;
  };
  const listo = () => {
    const b = esp.balon;
    const s = posicion(e, sacadorId);
    return b.x === destino.x && b.y === destino.y && (!s || dist2(s.x, s.y, destino.x, destino.y) <= LLEGADA * LLEGADA) && (!alArea || colocados());
  };
  const p = e.parametros.espacio;
  // En un penalti también se espera a que el lanzador llegue al punto (spec 003: el tiro sale desde allí).
  hasta(ctx, listo, minimo, true, minimo + (alArea || motivo === 'penalti' ? p.esperaColocacionMaxima : p.esperaSaqueMaxima));
  // Sin esperar a los demás, el que saca sí tiene que llegar al balón: nadie lo juega a distancia (spec 014, FR-001).
  const sacadorJunto = () => {
    const s = posicion(e, sacadorId);
    return !s || dist2(s.x, s.y, esp.balon.x, esp.balon.y) <= LLEGADA * LLEGADA;
  };
  // Tope: cruzar el campo dos veces a la velocidad máxima, la del que va a sacar (`moverJugadores`): un lanzador designado
  // lejano también llega, sin alargar la parte minutos.
  hasta(ctx, sacadorJunto, 0, true, Math.ceil((2 * LARGO) / p.velocidadJugadorMax));
  if (motivo === 'banda' || motivo === 'saque_puerta') esp.sinFueraDeJuego = true;
  delete esp.destinos[sacadorId];
  cerrar(ctx, a);
}

/** Rival más cercano al balón (el que también va a por un balón suelto). */
function rivalMasCercano(e: EstadoMotor, jugadorId: number): number | undefined {
  const local = e.equipos.local.jugadores.some((j) => j.id === jugadorId);
  const b = e.espacio.balon;
  let mejor: number | undefined;
  let mejorD = Infinity;
  for (const j of e.equipos[local ? 'visitante' : 'local'].jugadores) {
    const q = j.enCampo ? e.espacio.jugadores[j.id] : undefined;
    if (!q) continue;
    const d = dist2(q.x, q.y, b.x, b.y);
    if (d < mejorD || (d === mejorD && mejor !== undefined && j.id < mejor)) {
      mejor = j.id;
      mejorD = d;
    }
  }
  return mejor;
}

/**
 * Balón suelto (spec 014, research R1; FR-001, FR-002): el balón rueda en su dirección y frena; `recuperadorId` y el
 * rival más cercano (con `disputa`) corren hacia su posición actual en cada tick. Se lo queda el primero que llega (lo
 * decide su velocidad). Devuelve quién lo tiene (el recuperador si nadie llega a tiempo).
 */
export function recuperarSuelto(ctx: Contexto, recuperadorId: number, minimo = 2, disputa = true): number {
  const e = ctx.estado;
  const esp = e.espacio;
  if (!posicion(e, recuperadorId)) {
    pasarTiempo(ctx, minimo);
    return recuperadorId;
  }
  const rivalId = disputa ? rivalMasCercano(e, recuperadorId) : undefined;
  const a = abrir(ctx, { tipo: 'control', deId: recuperadorId, destino: { x: esp.balon.x, y: esp.balon.y }, aerea: false, exito: true, motivo: 'suelto' });
  const llega = (id: number | undefined) => {
    const q = id !== undefined ? posicion(e, id) : null;
    return q !== null && dist2(q.x, q.y, esp.balon.x, esp.balon.y) <= LLEGADA * LLEGADA;
  };
  // Si los dos se juntan (chapas en contacto) antes de llegar, se lo queda el más cercano al balón.
  const choque = (a: number, b: number | undefined): number | undefined => {
    const p = posicion(e, a);
    const q = b !== undefined ? posicion(e, b) : null;
    const r = e.parametros.espacio.radioSeparacion;
    if (!p || !q || dist2(p.x, p.y, q.x, q.y) > r * r) return undefined;
    const bx = esp.balon.x;
    const by = esp.balon.y;
    return dist2(q.x, q.y, bx, by) < dist2(p.x, p.y, bx, by) ? b : a;
  };
  let quien: number | undefined;
  for (let n = 0; n < MAXIMO_TICKS; n++) {
    quien = llega(recuperadorId) ? recuperadorId : llega(rivalId) ? rivalId : choque(recuperadorId, rivalId);
    if (quien !== undefined && n >= minimo) break;
    for (const id of [recuperadorId, rivalId]) if (id !== undefined && posicion(e, id)) esp.destinos[id] = { x: esp.balon.x, y: esp.balon.y };
    pasarTiempo(ctx, 1);
  }
  delete esp.destinos[recuperadorId];
  if (rivalId !== undefined) {
    delete esp.destinos[rivalId];
    // Carrera por un balón suelto (SC-008: la velocidad decide).
    const ganador = quien ?? recuperadorId;
    for (const id of [recuperadorId, rivalId]) anotar(ctx.metricas, id, 'sueltosDisputados');
    anotar(ctx.metricas, ganador, 'sueltosGanados');
  }
  a.destino = { x: esp.balon.x, y: esp.balon.y };
  if (quien !== undefined && quien !== recuperadorId) a.exito = false;
  cerrar(ctx, a);
  return quien ?? recuperadorId;
}

/** ¿Está el balón con este jugador (pegado a él)? */
export function balonCon(estado: EstadoMotor, jugadorId: number): boolean {
  const p = estado.espacio.jugadores[jugadorId];
  const b = estado.espacio.balon;
  return p !== undefined && dist2(p.x, p.y, b.x, b.y) <= 300 * 300;
}
