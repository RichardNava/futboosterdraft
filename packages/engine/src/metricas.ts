/**
 * Métricas por jugador para la herramienta de equilibrado (spec 003, research R11; data-model §7.4).
 *
 * Solo se calculan con `avanzar(…, { metricas: true })` y no forman parte del estado del motor: viven en el
 * contexto del tramo y, entre tramos, en un `WeakMap` indexado por el estado que devuelve `avanzar`. Así no
 * consumen números del PRNG ni cambian el estado, y el partido es idéntico con o sin ellas (invariante 10).
 */
import type { EstadoMotor } from './estado/estado';
import type { MetricasJugador } from './tipos';

export type Metricas = Record<number, MetricasJugador>;

const acumuladas = new WeakMap<EstadoMotor, Metricas>();

export function metricasVacias(): MetricasJugador {
  return {
    regates: 0,
    regatesGanados: 0,
    conducciones: 0,
    tirosArea: 0,
    tirosFrontal: 0,
    tirosLejos: 0,
    pases: 0,
    pasesRompeLineas: 0,
    intercepciones: 0,
    entradasGanadas: 0,
    recuperaciones: 0,
    duelosGanados: 0,
    conduccionesLargas: 0,
    golesFalta: 0,
    golesCabeza: 0,
    goles: 0,
  };
}

/** Métricas acumuladas hasta este estado (vacías si es un partido recién creado). */
export function metricasDesde(estado: EstadoMotor): Metricas {
  return structuredClone(acumuladas.get(estado) ?? {});
}

/** Guarda las métricas acumuladas hasta el estado que devuelve `avanzar`. */
export function guardarMetricas(estado: EstadoMotor, metricas: Metricas): void {
  acumuladas.set(estado, metricas);
}

/** Suma 1 a un contador de un jugador, si se están midiendo las métricas. */
export function anotar(metricas: Metricas | undefined, jugadorId: number | undefined, campo: keyof MetricasJugador): void {
  if (!metricas || jugadorId === undefined) return;
  (metricas[jugadorId] ??= metricasVacias())[campo]++;
}
