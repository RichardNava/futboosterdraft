/**
 * Distribución recomendada de la colección Core (spec.md, Assumptions: "Tamaño de la colección Core").
 * 300 cartas que cubren todos los peores casos de una mesa de 8 sin repetir cartas.
 */
import type { Demarcacion, Jugador, Nivel } from './tipos';

export const DISTRIBUCION_CORE: Readonly<Record<Demarcacion, Readonly<Record<Nivel, number>>>> = {
  POR: { Superclase: 14, Epico: 8, Legendario: 7, GOAT: 3 },
  DEF: { Superclase: 44, Epico: 22, Legendario: 22, GOAT: 12 },
  MED: { Superclase: 44, Epico: 22, Legendario: 22, GOAT: 12 },
  DEL: { Superclase: 30, Epico: 15, Legendario: 15, GOAT: 8 },
};

/** Mínimo con reparto equilibrado de niveles por demarcación (por debajo, el seed avisa). */
export const MINIMO_EQUILIBRADO_CORE = 243;

export type RecuentoCatalogo = Record<Demarcacion, Record<Nivel, number>>;

export function recuentoPorDemarcacionYNivel(jugadores: readonly Pick<Jugador, 'demarcacion' | 'nivel'>[]): RecuentoCatalogo {
  const vacio = (): Record<Nivel, number> => ({ Superclase: 0, Epico: 0, Legendario: 0, GOAT: 0 });
  const recuento: RecuentoCatalogo = { POR: vacio(), DEF: vacio(), MED: vacio(), DEL: vacio() };
  for (const j of jugadores) recuento[j.demarcacion][j.nivel] += 1;
  return recuento;
}
