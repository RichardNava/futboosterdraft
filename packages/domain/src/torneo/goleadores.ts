/**
 * Máximos goleadores y asistentes del torneo (FR-039 a FR-042; research R15): se agregan las aportaciones
 * de todos los partidos (todas las fases y las dos mesas de un torneo mixto, con la prórroga) al pedirlas.
 */
import type { EstadoTorneo } from './torneo';

export interface FilaTabla {
  posicion: number;
  jugadorId: number;
  participanteId: string;
  total: number;
  partidosJugados: number;
}

export interface OpcionesTabla {
  /** Partidos que no cuentan para quien la pide: sus «pendientes de ver» (research R8). */
  excluirPartidos?: readonly string[];
}

function tabla(t: EstadoTorneo, campo: 'goles' | 'asistencias', opciones: OpcionesTabla): FilaTabla[] {
  const excluir = new Set(opciones.excluirPartidos ?? []);
  const porJugador = new Map<string, { jugadorId: number; participanteId: string; total: number; partidos: Set<string> }>();
  for (const a of t.aportaciones ?? []) {
    if (excluir.has(a.partidoId)) continue;
    const clave = `${a.participanteId}:${a.jugadorId}`;
    let f = porJugador.get(clave);
    if (!f) {
      f = { jugadorId: a.jugadorId, participanteId: a.participanteId, total: 0, partidos: new Set() };
      porJugador.set(clave, f);
    }
    f.total += a[campo];
    if (a.jugo) f.partidos.add(a.partidoId);
  }
  return [...porJugador.values()]
    .filter((f) => f.total >= 1)
    .map((f) => ({ jugadorId: f.jugadorId, participanteId: f.participanteId, total: f.total, partidosJugados: f.partidos.size }))
    // Más goles primero; a igualdad, quien ha jugado menos partidos (el servidor desempata después por nombre).
    .sort((a, b) => b.total - a.total || a.partidosJugados - b.partidosJugados || a.jugadorId - b.jugadorId)
    .map((f, i) => ({ posicion: i + 1, ...f }));
}

export function tablaGoleadores(t: EstadoTorneo, opciones: OpcionesTabla = {}): FilaTabla[] {
  return tabla(t, 'goles', opciones);
}

export function tablaAsistentes(t: EstadoTorneo, opciones: OpcionesTabla = {}): FilaTabla[] {
  return tabla(t, 'asistencias', opciones);
}
