/**
 * Versión del catálogo de una partida (spec 005, research R4; FR-036).
 *
 * Las partidas creadas antes de la spec 005 (versión 1) siguen con las cartas que tenían: sin defectos y sin las
 * cuatro virtudes añadidas. Como la pasada de rasgos sobre Core solo añade rasgos, quitarlos devuelve exactamente la
 * carta anterior. Las partidas nuevas se crean con `VERSION_CATALOGO_ACTUAL`.
 */
import type { Jugador, Virtud } from './tipos';

/** Versión 3 (spec 015, research R6): seis centrales de Core cambian una virtud por Cabeceador. */
export const VERSION_CATALOGO_ACTUAL = 3;

/** Virtud que cedió cada carta de Core a Cabeceador en la versión 3 (contracts/catalogo.md §C2). */
export const VIRTUD_CEDIDA_015: Readonly<Record<number, Virtud>> = {
  60: 'MuroDefensivo',
  76: 'Volador',
  77: 'Potente',
  86: 'Intimidante',
  87: 'Aura',
  275: 'Potente',
};

/** Virtudes que no existían en la versión 1 del catálogo. */
export const VIRTUDES_NUEVAS_005: readonly Virtud[] = ['DeAcero', 'Versatil', 'FairPlayer', 'Revulsivo'];

/**
 * La carta como era en una versión anterior del catálogo: antes de la 3, con la virtud que cedió a Cabeceador; en la 1,
 * además, sin las virtudes nuevas de la 005 ni defectos.
 */
export function cartaEnVersion<J extends Jugador>(jugador: J, version: number): J {
  if (version >= VERSION_CATALOGO_ACTUAL) return jugador;
  const cedida = VIRTUD_CEDIDA_015[jugador.id];
  const v2 = cedida ? { ...jugador, virtudes: jugador.virtudes.map((v) => (v === 'Cabeceador' ? cedida : v)) } : jugador;
  if (version >= 2) return v2;
  return { ...v2, virtudes: v2.virtudes.filter((v) => !VIRTUDES_NUEVAS_005.includes(v)), defectos: [] };
}
