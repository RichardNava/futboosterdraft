/**
 * Contexto de un tramo de simulación: estado, PRNG y utilidades comunes a las acciones (tiempo,
 * eventos, interrupciones, posiciones y elección de jugadores).
 */
import { FORMACIONES, type Rng } from '@fbd/domain';
import { minutoMostrable, type EquipoEstado, type EstadoMotor, type JugadorEnPartido } from '../estado/estado';
import { acumularCansancio } from '../modificadores/cansancio';
import { tiene } from '../modificadores/specials';
import type { EventoPartido, Lado, RolEvento, TipoEvento } from '../tipos';

export interface Contexto {
  estado: EstadoMotor;
  rng: Rng;
  /** Hubo una interrupción del juego en el último paso (punto de decisión en 2D). */
  interrupcion: boolean;
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

/** Avanza el reloj. Las paradas cuentan para el descuento y no suman posesión. */
export function pasarTiempo(ctx: Contexto, segundos: number, parada = false): void {
  const e = ctx.estado;
  e.tick += segundos;
  e.reloj.segundosEnParte += segundos;
  if (parada) e.reloj.paradas += segundos;
  else {
    e.estadisticas[e.balon.posesion].posesion += segundos;
    if (e.balon.zona >= 3) e.estadisticas[e.balon.posesion].posesionCampoRival += segundos;
  }
  acumularCansancio(e, e.equipos.local, segundos);
  acumularCansancio(e, e.equipos.visitante, segundos);
}

/** Interrupción del juego: evento, tiempo de parada y punto de decisión. */
export function interrumpir(ctx: Contexto, motivo: string, segundos: number, equipo: Lado): void {
  emitir(ctx, 'interrupcion', equipo, [], { motivo });
  pasarTiempo(ctx, segundos, true);
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

/** Posición de referencia de un jugador (su casilla), desde el punto de vista de su equipo. */
export function posicionJugador(equipo: EquipoEstado, j: JugadorEnPartido): { x: number; y: number } {
  const c = j.casillaId ? FORMACIONES[equipo.formacion].casillas.find((x) => x.id === j.casillaId) : undefined;
  return c ? c.zona : { x: 450, y: 320 };
}

/** Posición del balón desde el punto de vista del equipo con la posesión. */
export function posicionBalon(estado: EstadoMotor): { x: number; y: number } {
  return { x: ((estado.balon.zona + 0.5) * 1000) / 6, y: [107, 320, 533][estado.balon.carril]! };
}

export const esPortero = (j: JugadorEnPartido) => j.casillaId === 'POR';

export function portero(equipo: EquipoEstado): JugadorEnPartido | undefined {
  return equipo.jugadores.find((j) => j.enCampo && esPortero(j));
}

/**
 * Rival que disputa el duelo: uno de los dos más cercanos al balón. Si se indica `valor` (lo que vale
 * cada candidato en ese duelo), el atacante busca el punto débil y se enfrenta al más flojo con un 65 %;
 * si no, al más cercano con un 70 %.
 */
export function rivalCercano(
  ctx: Contexto,
  defensor: EquipoEstado,
  incluirPortero = false,
  valor?: (j: JugadorEnPartido) => number,
): JugadorEnPartido | undefined {
  const b = posicionBalon(ctx.estado);
  // Desde el punto de vista del defensor el campo está invertido.
  const objetivo = { x: 1000 - b.x, y: 640 - b.y };
  const candidatos = defensor.jugadores
    .filter((j) => j.enCampo && (incluirPortero || !esPortero(j)))
    .map((j) => {
      const p = posicionJugador(defensor, j);
      return { j, d: Math.abs(p.x - objetivo.x) + Math.abs(p.y - objetivo.y) * 0.8 };
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

/** Compañero que recibe un pase dirigido a una zona y carril (Carismático: más buscado). */
export function receptor(ctx: Contexto, equipo: EquipoEstado, zona: number, carril: number, excluir: number): JugadorEnPartido | undefined {
  const objetivo = { x: ((zona + 0.5) * 1000) / 6, y: [107, 320, 533][carril]! };
  const candidatos = equipo.jugadores.filter((j) => j.enCampo && j.id !== excluir && (zona <= 1 || !esPortero(j)));
  if (candidatos.length === 0) return undefined;
  const pesos: [JugadorEnPartido, number][] = candidatos.map((j) => {
    const p = posicionJugador(equipo, j);
    const d = Math.abs(p.x - objetivo.x) + Math.abs(p.y - objetivo.y) * 0.7;
    const peso = Math.round(10000 / (60 + d)) * (tiene(j, 'Carismatico') ? 1.5 : 1);
    return [j, Math.round(peso)];
  });
  return elegirPonderado(ctx.rng, pesos);
}

export function jugadorPorId(equipo: EquipoEstado, id: number): JugadorEnPartido | undefined {
  return equipo.jugadores.find((j) => j.id === id);
}
