/**
 * Puntuación efectiva de un jugador en un duelo (spec 005, research R9; FR-064).
 *
 * `media − penalización por posición + Σ pesoVirtud × impacto(virtud) − Σ pesoDefecto × (1 − impacto(defecto))`, en
 * centésimas. La penalización es la de `statsEfectivos`, con Versátil, Todocampista e Inflexible. Los rasgos de partido
 * (Rebelde, Revulsivo…) no tienen aquí efecto propio: solo cuenta su impacto.
 */
import { rasgo } from '../catalogo/rasgos';
import type { Jugador } from '../catalogo/tipos';
import { penalizacionPorPosicion, type DestinoPosicion } from '../equipo/statsEfectivos';
import { parametrosEfectivos, type ParametrosEquilibrado } from '../parametros/index';
import type { LadoDuelo } from './tipos';

export type PuntuacionBase = Omit<LadoDuelo, 'forma' | 'puntuacion'> & { base: number };

export function puntuacionEfectiva(jugador: Jugador, casilla: DestinoPosicion, p: ParametrosEquilibrado): PuntuacionBase {
  const { duelos } = parametrosEfectivos(p);
  const media = Math.round(jugador.media * 100);
  const penalizacion = Math.round(jugador.media * penalizacionPorPosicion(jugador, casilla, p) * 100);
  const bonusVirtudes = Math.round(100 * duelos.pesoVirtud * jugador.virtudes.reduce((s, v) => s + rasgo(v).impacto, 0));
  const malusDefectos = Math.round(100 * duelos.pesoDefecto * jugador.defectos.reduce((s, d) => s + (1 - rasgo(d).impacto), 0));
  return { jugadorId: jugador.id, media, penalizacion, bonusVirtudes, malusDefectos, base: media - penalizacion + bonusVirtudes - malusDefectos };
}
