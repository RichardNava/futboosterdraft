/**
 * Eliminaciones del torneo (spec 003, FR-039 a FR-041b; data-model §8.1, research R22). Se derivan del estado
 * del torneo y del cuadro; no se guardan.
 *
 * - Cuadro (playoff, o fase final de un mixto): el perdedor de cada cruce con ganador queda eliminado con el
 *   tipo de su ronda.
 * - Mixto: al pasar a la eliminatoria, los que no están en el cuadro quedan eliminados con la fase `liga`.
 * - Liga pura: nadie queda eliminado.
 */
import type { EstadoTorneo } from './torneo';

export type FaseEliminacion = 'liga' | 'octavos' | 'cuartos' | 'semifinal' | 'final';

export interface Eliminacion {
  participanteId: string;
  fase: FaseEliminacion;
  /** Jornada en la que quedó eliminado. */
  jornada: number;
}

export const ETIQUETA_FASE: Readonly<Record<FaseEliminacion, string>> = {
  liga: 'Fase de liga',
  octavos: 'Octavos de final',
  cuartos: 'Cuartos de final',
  semifinal: 'Semifinales',
  final: 'Final',
};

export function eliminaciones(t: EstadoTorneo): Eliminacion[] {
  if (t.modo === 'liga' || !t.cuadro) return [];
  const resultado: Eliminacion[] = [];
  if (t.modo === 'mixto') {
    const enCuadro = new Set(t.cuadro.rondas[0]!.cruces.flatMap((c) => [c.local, c.visitante]).filter((x): x is string => !!x));
    const ultimaLiga = Math.max(0, ...t.jornadas.filter((j) => j.tipo === 'liga').map((j) => j.numero));
    for (const p of t.participantes) if (!enCuadro.has(p)) resultado.push({ participanteId: p, fase: 'liga', jornada: ultimaLiga });
  }
  t.cuadro.rondas.forEach((ronda, i) => {
    const jornada = t.jornadas.find((j) => j.rondaCuadro === i)?.numero ?? 0;
    for (const c of ronda.cruces) {
      if (!c.ganador || !c.local || !c.visitante) continue;
      resultado.push({ participanteId: c.ganador === c.local ? c.visitante : c.local, fase: ronda.tipo, jornada });
    }
  });
  return resultado;
}

export function eliminacionDe(t: EstadoTorneo, participanteId: string): Eliminacion | null {
  return eliminaciones(t).find((e) => e.participanteId === participanteId) ?? null;
}

/**
 * Humanos que siguen en competición: los activos (sin sustituir por un NPC) que no están eliminados. Con el
 * torneo terminado, nadie.
 */
export function humanosEnCompeticion(t: EstadoTorneo, humanosActivos: readonly string[]): string[] {
  if (t.campeon) return [];
  const fuera = new Set(eliminaciones(t).map((e) => e.participanteId));
  return humanosActivos.filter((h) => !fuera.has(h));
}
