/**
 * Lanzadores de penaltis, faltas directas y córners, y orden de la tanda (FR-029a).
 *
 * Propuesta automática: el titular con la virtud de la acción (Lanzador de penalties, Lanzador de
 * faltas, Guante en el pie) y, si no hay, el de mejor valor en el stat de esa acción.
 */
import type { Demarcacion, Jugador, Virtud } from '../catalogo/tipos';

export type TipoLanzamiento = 'penaltis' | 'faltas' | 'corners';

export interface Lanzadores {
  penaltis: number;
  faltas: number;
  corners: number;
  /** Orden de los 5 primeros lanzadores de una tanda de penaltis. */
  tanda: number[];
}

const VIRTUD_DE: Readonly<Record<TipoLanzamiento, Virtud>> = {
  penaltis: 'LanzadorPenalties',
  faltas: 'LanzadorFaltas',
  corners: 'GuanteEnElPie',
};

/** Stat que mide la acción según la demarcación. */
const STAT_DE: Readonly<Record<TipoLanzamiento, Readonly<Record<Demarcacion, string>>>> = {
  penaltis: { DEL: 'finalizacion', MED: 'disparo', DEF: 'tecnica', POR: 'distribucion' },
  faltas: { DEL: 'finalizacion', MED: 'disparo', DEF: 'tecnica', POR: 'distribucion' },
  corners: { DEL: 'creatividad', MED: 'pase', DEF: 'tecnica', POR: 'distribucion' },
};

export function valorLanzamiento(j: Pick<Jugador, 'demarcacion' | 'stats'>, tipo: TipoLanzamiento): number {
  const valor = (j.stats as unknown as Record<string, number>)[STAT_DE[tipo][j.demarcacion]] ?? 0;
  // Un portero lanza muy por debajo de su stat de distribución.
  return j.demarcacion === 'POR' ? valor * 0.5 : valor;
}

/** Candidatos ordenados: primero los que tienen la virtud, después por valor (y por id si empatan). */
export function candidatos(jugadores: readonly Jugador[], tipo: TipoLanzamiento): Jugador[] {
  const virtud = VIRTUD_DE[tipo];
  return [...jugadores].sort((a, b) => {
    const sa = a.virtudes.includes(virtud) ? 1 : 0;
    const sb = b.virtudes.includes(virtud) ? 1 : 0;
    if (sa !== sb) return sb - sa;
    const diferencia = valorLanzamiento(b, tipo) - valorLanzamiento(a, tipo);
    return diferencia !== 0 ? diferencia : a.id - b.id;
  });
}

export function proponerLanzadores(titulares: readonly Jugador[]): Lanzadores {
  if (titulares.length === 0) return { penaltis: 0, faltas: 0, corners: 0, tanda: [] };
  const penaltis = candidatos(titulares, 'penaltis');
  return {
    penaltis: penaltis[0]!.id,
    faltas: candidatos(titulares, 'faltas')[0]!.id,
    corners: candidatos(titulares, 'corners')[0]!.id,
    tanda: penaltis.slice(0, 5).map((j) => j.id),
  };
}

/** Quién lanza de verdad: el designado si está en el campo; si no, el siguiente mejor. */
export function lanzadorEfectivo(designado: number, enCampo: readonly Jugador[], tipo: TipoLanzamiento): number | undefined {
  if (enCampo.some((j) => j.id === designado)) return designado;
  return candidatos(enCampo, tipo)[0]?.id;
}
