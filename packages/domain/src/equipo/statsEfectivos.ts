/**
 * Stats efectivos de un jugador en una casilla (FR-025a, FR-027, FR-028).
 *
 * - Casilla de su posición (o la central de una defensa de 3/5 para un DCI/DCD): sin penalización.
 * - Jugador de campo en la portería, o portero fuera de ella: −`penalizacionPorteria` (60 %).
 * - Resto de casillas fuera de posición: −`penalizacionFueraPosicion` (25 %), salvo Todocampista.
 */
import { CLAVES_STATS, type Jugador } from '../catalogo/tipos';
import type { ParametrosEquilibrado } from '../parametros/index';
import type { Casilla } from './formaciones';

export interface StatsEfectivos {
  stats: Record<string, number>;
  media: number;
  fueraDePosicion: boolean;
  /** Fracción aplicada: 0, 0,25 o 0,60 con los parámetros v1. */
  penalizacion: number;
}

export interface ContextoStats {
  /** Bonificación de equipo a todos los stats (p. ej. Capitanía), aplicada tras la penalización. */
  bonus?: number;
}

export function penalizacionPorCasilla(
  jugador: Pick<Jugador, 'demarcacion' | 'posicion' | 'specials'>,
  casilla: Pick<Casilla, 'posicionesAdmitidas'>,
  p: ParametrosEquilibrado,
): number {
  const casillaPortero = casilla.posicionesAdmitidas.includes('POR');
  const esPortero = jugador.demarcacion === 'POR';
  if (casillaPortero !== esPortero) return p.penalizacionPorteria;
  const natural = casilla.posicionesAdmitidas.some((pos) => jugador.posicion.includes(pos));
  if (natural || jugador.specials.includes('Todocampista')) return 0;
  return p.penalizacionFueraPosicion;
}

export function statsEfectivos(
  jugador: Jugador,
  casilla: Pick<Casilla, 'posicionesAdmitidas'>,
  p: ParametrosEquilibrado,
  contexto: ContextoStats = {},
): StatsEfectivos {
  const penalizacion = penalizacionPorCasilla(jugador, casilla, p);
  const base = jugador.stats as unknown as Record<string, number>;
  const bonus = contexto.bonus ?? 0;
  const stats: Record<string, number> = {};
  for (const clave of CLAVES_STATS[jugador.demarcacion]) {
    const valor = Math.round((base[clave] ?? 0) * (1 - penalizacion)) + bonus;
    stats[clave] = Math.max(1, Math.min(99, valor));
  }
  const valores = Object.values(stats);
  return {
    stats,
    media: valores.reduce((a, b) => a + b, 0) / valores.length,
    fueraDePosicion: penalizacion > 0,
    penalizacion,
  };
}
