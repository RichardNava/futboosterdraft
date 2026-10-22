/**
 * Versión del catálogo de una partida (spec 005, research R4; FR-036).
 *
 * Las partidas creadas antes de la spec 005 (versión 1) siguen con las cartas que tenían: sin defectos y sin las
 * cuatro virtudes añadidas. Como la pasada de rasgos sobre Core solo añade rasgos, quitarlos devuelve exactamente la
 * carta anterior. Las partidas nuevas se crean con `VERSION_CATALOGO_ACTUAL`.
 */
import type { Jugador, Virtud } from './tipos';

export const VERSION_CATALOGO_ACTUAL = 2;

/** Virtudes que no existían en la versión 1 del catálogo. */
export const VIRTUDES_NUEVAS_005: readonly Virtud[] = ['DeAcero', 'Versatil', 'FairPlayer', 'Revulsivo'];

export function cartaEnVersion<J extends Jugador>(jugador: J, version: number): J {
  if (version >= VERSION_CATALOGO_ACTUAL) return jugador;
  return { ...jugador, virtudes: jugador.virtudes.filter((v) => !VIRTUDES_NUEVAS_005.includes(v)), defectos: [] };
}
