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
import { tiene } from '../modificadores/specials';
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
 * Rival que disputa el duelo: uno de los dos más cercanos al balón (posiciones reales). Si se indica
 * `valor` (lo que vale cada candidato en ese duelo), el atacante busca el punto débil y se enfrenta al más
 * flojo con un 65 %; si no, al más cercano con un 70 %.
 */
export function rivalCercano(
  ctx: Contexto,
  defensor: EquipoEstado,
  incluirPortero = false,
  valor?: (j: JugadorEnPartido) => number,
): JugadorEnPartido | undefined {
  const b = ctx.estado.espacio.balon;
  const candidatos = defensor.jugadores
    .filter((j) => j.enCampo && (incluirPortero || !esPortero(j)) && ctx.estado.espacio.jugadores[j.id])
    .map((j) => {
      const p = ctx.estado.espacio.jugadores[j.id]!;
      return { j, d: dist2(p.x, p.y, b.x, b.y) };
    })
    .sort((a, c) => a.d - c.d || a.j.id - c.j.id);
  if (candidatos.length === 0) return undefined;
  if (candidatos.length === 1) return candidatos[0]!.j;
  const primero = candidatos[0]!.j;
  const segundo = candidatos[1]!.j;
  if (valor) {
    const [debil, fuerte] = valor(primero) <= valor(segundo) ? [primero, segundo] : [segundo, primero];
    return ctx.rng.probabilidad(650) ? debil : fuerte;
  }
  return ctx.rng.probabilidad(700) ? primero : segundo;
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
 * Compañero que recibe un pase dirigido a una zona y carril (research R4): pesa la cercanía real a la
 * celda y lo libre que está de rivales; Carismático, más buscado.
 */
export function receptor(ctx: Contexto, equipo: EquipoEstado, zona: number, carril: number, excluir: number): JugadorEnPartido | undefined {
  const e = ctx.estado;
  const objetivo = aAbsoluta(equipo.lado, centroCelda(zona, carril));
  const rivalLado: Lado = equipo.lado === 'local' ? 'visitante' : 'local';
  const candidatos = equipo.jugadores.filter((j) => j.enCampo && j.id !== excluir && (zona <= 1 || !esPortero(j)) && e.espacio.jugadores[j.id]);
  if (candidatos.length === 0) return undefined;
  const pesos: [JugadorEnPartido, number][] = candidatos.map((j) => {
    const p = e.espacio.jugadores[j.id]!;
    // Distancia en unidades, con el ancho pesando menos que el largo.
    const d = dividir(Math.abs(p.x - objetivo.x) + dividir(Math.abs(p.y - objetivo.y) * 7, 10), 10);
    const libre = holgura(e, rivalLado, p);
    // De 0,6 (un rival encima) a 1,4 (nadie a menos de 15 m).
    const factorLibre = libre >= 1430 * 1430 ? 14 : libre <= 300 * 300 ? 6 : 10;
    // Con el cuadrado de la distancia: el pase va sobre todo al compañero que está cerca de la celda.
    // El equipo busca más a los que mejor la mueven (SC-008).
    const pase = atributo(e, equipo, j, 'pase');
    const factorPase = Math.round(1000 * 2 ** ((e.parametros.acciones.atraccionPasador * (pase - e.parametros.acciones.statPaseReferencia)) / 10));
    const peso = dividir(dividir(dividir(1_000_000_000, (60 + d) * (60 + d)) * factorLibre, 10) * factorPase, 1000) * (tiene(j, 'Carismatico') ? 3 : 2);
    return [j, Math.max(1, dividir(peso, 2))];
  });
  return elegirPonderado(ctx.rng, pesos);
}

export function jugadorPorId(equipo: EquipoEstado, id: number): JugadorEnPartido | undefined {
  return equipo.jugadores.find((j) => j.id === id);
}
