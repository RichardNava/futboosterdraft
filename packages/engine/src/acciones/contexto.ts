/**
 * Contexto de un tramo de simulación: estado, PRNG y utilidades comunes a las acciones (tiempo,
 * eventos, interrupciones, posiciones y elección de jugadores).
 *
 * El tiempo avanza tick a tick: en cada tick se mueven los jugadores y el balón (capa espacial, research R3).
 * Las posiciones son las reales de la capa espacial, así que quién recibe un pase y qué rival disputa cada
 * duelo dependen de dónde está cada uno (research R4).
 */
import type { Rng } from '@fbd/domain';
import { minutoMostrable, type EquipoEstado, type EstadoMotor, type JugadorEnPartido } from '../estado/estado';
import { dist2, dividir } from '../espacio/aritmetica';
import { aAbsoluta, centroCelda, type Punto } from '../espacio/geometria';
import { fotograma, pasoEspacial } from '../espacio/paso';
import { acumularCansancio } from '../modificadores/cansancio';
import { atributo } from '../modificadores/atributos';
import { actualizarMalestar, factorDefensivo } from '../modificadores/defectos';
import type { Metricas } from '../metricas';
import type { EventoPartido, Fotograma, Lado, RolEvento, TipoEvento } from '../tipos';

export interface Contexto {
  estado: EstadoMotor;
  rng: Rng;
  /** Hubo una interrupción del juego en el último paso (punto de decisión en 2D). */
  interrupcion: boolean;
  /** Si se piden fotogramas: se añaden aquí, con los jugadores en `orden` (research R5). */
  fotogramas?: Fotograma[];
  orden?: readonly number[];
  /** Solo para pruebas: se llama con el estado al final de cada tick. */
  observador?: (estado: EstadoMotor) => void;
  /** Métricas por jugador, solo si se piden (spec 003, research R11): no cambian el partido. */
  metricas?: Metricas;
}

export function emitir(
  ctx: Contexto,
  tipo: TipoEvento,
  equipo: Lado,
  jugadores: { rol: RolEvento; jugadorId: number }[] = [],
  datos: Record<string, unknown> = {},
  relevante = false,
): EventoPartido {
  const e: EventoPartido = { tick: ctx.estado.tick, minuto: minutoMostrable(ctx.estado.reloj), tipo, equipo, jugadores, datos, relevante };
  ctx.estado.eventos.push(e);
  return e;
}

/** Añade un fotograma del estado actual (sustituye al del mismo tick, si ya lo había). */
export function anotarFotograma(ctx: Contexto): void {
  if (!ctx.fotogramas || !ctx.orden) return;
  const f = fotograma(ctx.estado, ctx.orden);
  const ultimo = ctx.fotogramas[ctx.fotogramas.length - 1];
  if (ultimo && ultimo[0] === f[0]) ctx.fotogramas[ctx.fotogramas.length - 1] = f;
  else ctx.fotogramas.push(f);
}

/**
 * Avanza el reloj tick a tick, moviendo jugadores y balón en cada uno. Las paradas cuentan para el
 * descuento y no suman posesión. Se anota un fotograma cada 2 ticks.
 */
export function pasarTiempo(ctx: Contexto, segundos: number, parada = false): void {
  const e = ctx.estado;
  for (let s = 0; s < segundos; s++) {
    e.tick += 1;
    e.reloj.segundosEnParte += 1;
    if (parada) e.reloj.paradas += 1;
    else {
      e.estadisticas[e.balon.posesion].posesion += 1;
      if (e.balon.zona >= 3) e.estadisticas[e.balon.posesion].posesionCampoRival += 1;
    }
    acumularCansancio(e, e.equipos.local, 1);
    acumularCansancio(e, e.equipos.visitante, 1);
    // Polémico y Rebelde (spec 005, FR-044): aviso al activarse o desactivarse.
    actualizarMalestar(ctx);
    pasoEspacial(e);
    if (ctx.fotogramas && e.tick % 2 === 0) anotarFotograma(ctx);
    ctx.observador?.(e);
  }
}

/**
 * Interrupción del juego: evento y punto de decisión. Su tiempo de parada no pasa aquí: se consume al
 * recolocar el balón para la reanudación (`reponer`), mientras los jugadores van a sus sitios.
 */
export function interrumpir(ctx: Contexto, motivo: string, segundos: number, equipo: Lado): void {
  emitir(ctx, 'interrupcion', equipo, [], { motivo });
  ctx.estado.espacio.paradaPendiente += segundos;
  ctx.interrupcion = true;
}

export function elegirPonderado<T>(rng: Rng, opciones: readonly [T, number][]): T {
  const total = opciones.reduce((a, [, p]) => a + p, 0);
  if (total <= 0) return opciones[0]![0];
  let x = rng.entero(1, Math.round(total));
  for (const [valor, peso] of opciones) {
    x -= peso;
    if (x <= 0) return valor;
  }
  return opciones[opciones.length - 1]![0];
}

/** Posición real de un jugador en la capa espacial (absoluta, décimas); null si no está en el campo. */
export function posicionReal(estado: EstadoMotor, id: number): Punto | null {
  const p = estado.espacio.jugadores[id];
  return p ? { x: p.x, y: p.y } : null;
}

export const esPortero = (j: JugadorEnPartido) => j.casillaId === 'POR';

export function portero(equipo: EquipoEstado): JugadorEnPartido | undefined {
  return equipo.jugadores.find((j) => j.enCampo && esPortero(j));
}

/**
 * Radio de intervención de un defensor, en milésimas (spec 003, research R9): crece
 * `decision.radioIntervencionPorPunto` por cada punto de la media de los atributos indicados sobre 70, acotado
 * a ±`decision.radioIntervencionMax`.
 */
export function radioDe(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido, ...atributos: ('quite' | 'anticipacion')[]): number {
  const d = estado.parametros.decision;
  const valor = atributos.reduce((a, n) => a + atributo(estado, equipo, j, n), 0) / atributos.length;
  const radio = Math.round(1000 * (1 + d.radioIntervencionPorPunto * (valor - 70)));
  const max = Math.round(1000 * d.radioIntervencionMax);
  return Math.min(1000 + max, Math.max(1000 - max, radio));
}

/** Radio de intervención en un duelo (quite y anticipación), en milésimas. */
export function radioIntervencion(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido): number {
  return radioDe(estado, equipo, j, 'quite', 'anticipacion');
}

/**
 * Rival que disputa el duelo (spec 003, research R9): el más cercano al balón según una distancia efectiva,
 * la real dividida por su radio de intervención. Un buen defensor llega a más balones; ya no se busca al
 * más débil de los dos más cercanos.
 */
export function rivalCercano(ctx: Contexto, defensor: EquipoEstado, incluirPortero = false): JugadorEnPartido | undefined {
  const e = ctx.estado;
  const b = e.espacio.balon;
  let mejor: JugadorEnPartido | undefined;
  let mejorEfectiva = Infinity;
  let segundo: JugadorEnPartido | undefined;
  let segundoEfectiva = Infinity;
  for (const j of defensor.jugadores) {
    const p = j.enCampo && (incluirPortero || !esPortero(j)) ? e.espacio.jugadores[j.id] : undefined;
    if (!p) continue;
    const radio = radioIntervencion(e, defensor, j);
    // Distancia al cuadrado entre el radio al cuadrado (en milésimas): enteros seguros hasta 10^15.
    const efectiva = Math.floor((dist2(p.x, p.y, b.x, b.y) * 1_000_000) / (radio * radio));
    if (efectiva < mejorEfectiva || (efectiva === mejorEfectiva && mejor !== undefined && j.id < mejor.id)) {
      segundo = mejor;
      segundoEfectiva = mejorEfectiva;
      mejor = j;
      mejorEfectiva = efectiva;
    } else if (efectiva < segundoEfectiva || (efectiva === segundoEfectiva && segundo !== undefined && j.id < segundo.id)) {
      segundo = j;
      segundoEfectiva = efectiva;
    }
  }
  return candidatoDefensivo(ctx, mejor, segundo);
}

/**
 * Mal defensor (spec 005, research R6): su peso como candidato a defender se multiplica por `defectos.malDefensor`.
 * Si le tocaba a él y hay otro candidato, le cede la acción con probabilidad 1 − factor; si es el único, defiende.
 */
export function candidatoDefensivo(ctx: Contexto, mejor: JugadorEnPartido | undefined, segundo: JugadorEnPartido | undefined): JugadorEnPartido | undefined {
  if (!mejor || !segundo) return mejor;
  const f = factorDefensivo(ctx.estado, mejor);
  if (f >= 1) return mejor;
  return ctx.rng.probabilidad(Math.round((1 - f) * 1000)) ? segundo : mejor;
}

/** Distancia al cuadrado del rival más cercano a un punto (lo libre que está; research R4). */
export function holgura(estado: EstadoMotor, rivalLado: Lado, p: Punto): number {
  let min = Number.POSITIVE_INFINITY;
  for (const j of estado.equipos[rivalLado].jugadores) {
    const q = estado.espacio.jugadores[j.id];
    if (!j.enCampo || !q) continue;
    const d = dist2(p.x, p.y, q.x, q.y);
    if (d < min) min = d;
  }
  return min;
}

/**
 * Compañero que va a por el balón en una zona y carril cuando no hay un pase (el portador ha salido, una
 * recuperación sin recuperador, un saque de banda): pesa la cercanía real a la celda y lo libre que está.
 */
export function cercanoACelda(ctx: Contexto, equipo: EquipoEstado, zona: number, carril: number, excluir: number): JugadorEnPartido | undefined {
  const e = ctx.estado;
  const objetivo = aAbsoluta(equipo.lado, centroCelda(zona, carril));
  const rivalLado: Lado = equipo.lado === 'local' ? 'visitante' : 'local';
  const candidatos = equipo.jugadores.filter((j) => j.enCampo && j.id !== excluir && (zona <= 1 || !esPortero(j)) && e.espacio.jugadores[j.id]);
  if (candidatos.length === 0) return undefined;
  const pesos: [JugadorEnPartido, number][] = candidatos.map((j) => {
    const p = e.espacio.jugadores[j.id]!;
    const d = dividir(Math.abs(p.x - objetivo.x) + dividir(Math.abs(p.y - objetivo.y) * 7, 10), 10);
    const libre = holgura(e, rivalLado, p);
    const factorLibre = libre >= 1430 * 1430 ? 14 : libre <= 300 * 300 ? 6 : 10;
    return [j, Math.max(1, dividir(dividir(1_000_000_000, (60 + d) * (60 + d)) * factorLibre, 10))];
  });
  return elegirPonderado(ctx.rng, pesos);
}

export function jugadorPorId(equipo: EquipoEstado, id: number): JugadorEnPartido | undefined {
  return equipo.jugadores.find((j) => j.id === id);
}
