/**
 * Escudo de cada equipo (spec 011, data-model §5; research R6 y R7). Funciones puras: la lista de escudos gratuitos
 * llega por parámetro, ordenada por `orden`, para que la asignación sea estable mientras no cambie esa lista.
 */
import { derivarSemilla, Rng, type Semilla } from '../rng/xoshiro';

/** FNV-1a de 32 bits sobre las unidades UTF-16 del texto. */
export function fnv1a32(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Escudo por defecto de una cuenta registrada que no ha elegido (FR-005): siempre el mismo para el mismo id. */
export function escudoAsignado(usuarioId: string, gratuitos: readonly string[]): string | null {
  if (gratuitos.length === 0) return null;
  return gratuitos[fnv1a32(usuarioId) % gratuitos.length]!;
}

/** Escudo de un NPC, sorteado con la semilla de la partida como las equipaciones. */
export function escudoNpc(semilla: Semilla, participanteId: string, gratuitos: readonly string[]): string | null {
  if (gratuitos.length === 0) return null;
  return gratuitos[new Rng(derivarSemilla(semilla, `escudo:${participanteId}`)).entero(0, gratuitos.length - 1)]!;
}

/** Escudos que se pintan en un partido: si coinciden, ninguno (FR-008) y el cliente pinta círculos de color. */
export function escudosEnPartido(
  local: string | null,
  visitante: string | null,
): { local: string | null; visitante: string | null } {
  if (local !== null && local === visitante) return { local: null, visitante: null };
  return { local, visitante };
}
