/**
 * Repositorio de visionados (data-model §7.2; research R8): si cada humano de un partido entre humanos ya
 * lo ha visto, o ha decidido ver el resultado, para no revelárselo antes de tiempo.
 */
import { and, eq, inArray } from 'drizzle-orm';
import type { BaseDatos } from '../db';
import { partidos, visionados } from '../esquema/index';

export type EstadoVisionado = 'pendiente' | 'visto' | 'revelado';

export class RepoVisionados {
  constructor(private readonly db: BaseDatos) {}

  /** Se crean `pendiente` al resolverse el partido. Si ya existían, no cambian. */
  async crearPendientes(partidoId: string, participanteIds: readonly string[], ahora: number): Promise<void> {
    if (participanteIds.length === 0) return;
    await this.db
      .insert(visionados)
      .values(participanteIds.map((participanteId) => ({ partidoId, participanteId, estado: 'pendiente', actualizadoEn: new Date(ahora) })))
      .onConflictDoNothing();
  }

  /**
   * Pasa a `visto` o `revelado`. Nunca vuelve a `pendiente`, y `revelado` no pasa a `visto` (las dos
   * desbloquean el resultado). Devuelve si ha cambiado algo.
   */
  async marcar(partidoId: string, participanteId: string, estado: Exclude<EstadoVisionado, 'pendiente'>, ahora: number): Promise<boolean> {
    const filas = await this.db
      .update(visionados)
      .set({ estado, actualizadoEn: new Date(ahora) })
      .where(and(eq(visionados.partidoId, partidoId), eq(visionados.participanteId, participanteId), eq(visionados.estado, 'pendiente')))
      .returning({ partidoId: visionados.partidoId });
    return filas.length > 0;
  }

  async estado(partidoId: string, participanteId: string): Promise<EstadoVisionado | null> {
    const fila = (
      await this.db
        .select({ estado: visionados.estado })
        .from(visionados)
        .where(and(eq(visionados.partidoId, partidoId), eq(visionados.participanteId, participanteId)))
        .limit(1)
    )[0];
    return (fila?.estado as EstadoVisionado | undefined) ?? null;
  }

  /** Partidos de la partida que el participante aún no ha visto. */
  async pendientesDe(participanteId: string, partidaId: string): Promise<string[]> {
    const filas = await this.db
      .select({ partidoId: visionados.partidoId })
      .from(visionados)
      .innerJoin(partidos, eq(partidos.id, visionados.partidoId))
      .where(and(eq(visionados.participanteId, participanteId), eq(visionados.estado, 'pendiente'), eq(partidos.partidaId, partidaId)));
    return filas.map((f) => f.partidoId);
  }

  /** Pendientes de varios participantes a la vez (vista del torneo de todos los humanos). */
  async pendientesDeVarios(participanteIds: readonly string[], partidaId: string): Promise<Map<string, string[]>> {
    const resultado = new Map(participanteIds.map((id) => [id, [] as string[]]));
    if (participanteIds.length === 0) return resultado;
    const filas = await this.db
      .select({ participanteId: visionados.participanteId, partidoId: visionados.partidoId })
      .from(visionados)
      .innerJoin(partidos, eq(partidos.id, visionados.partidoId))
      .where(and(inArray(visionados.participanteId, [...participanteIds]), eq(visionados.estado, 'pendiente'), eq(partidos.partidaId, partidaId)));
    for (const f of filas) resultado.get(f.participanteId)?.push(f.partidoId);
    return resultado;
  }
}
