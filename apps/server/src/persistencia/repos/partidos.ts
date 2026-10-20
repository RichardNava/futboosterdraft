/**
 * Repositorio de partidos.
 */
import type { ModoSimulacion } from '@fbd/domain';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { BaseDatos } from '../db';
import { partidos } from '../esquema/index';

export type FilaPartido = typeof partidos.$inferSelect;
type Tx = Parameters<Parameters<BaseDatos['transaction']>[0]>[0];
type Ejecutor = BaseDatos | Tx;

export type ResumenPartido = Pick<FilaPartido, 'id' | 'jornadaNumero' | 'localId' | 'visitanteId' | 'marcador' | 'estado' | 'resolucion'>;

export type Resolucion = 'directo' | 'apertura' | 'plazo' | 'npc';

/** Derivado de la spec 001 que se conserva en las vistas: el partido se resolvió al vencer el plazo. */
export const resueltoAutomaticamente = (p: Pick<FilaPartido, 'resolucion'>): boolean => p.resolucion === 'plazo';

export class RepoPartidos {
  constructor(private readonly db: BaseDatos) {}

  async crear(
    datos: {
      partidaId: string;
      jornadaId?: string | null;
      jornadaNumero: number;
      localId: string;
      visitanteId: string;
      eliminatoria: boolean;
      semilla: string;
      versionParametros: string;
    },
    ejecutor: Ejecutor = this.db,
  ): Promise<FilaPartido> {
    const [fila] = await ejecutor.insert(partidos).values({ ...datos, jornadaId: datos.jornadaId ?? null }).returning();
    return fila!;
  }

  /**
   * Fija la modalidad de un participante en un partido solo si aún no la tiene (FR-035: no cambia después).
   * Devuelve la modalidad que queda.
   */
  async fijarModalidad(partidoId: string, participanteId: string, modalidad: ModoSimulacion): Promise<ModoSimulacion> {
    await this.db
      .update(partidos)
      .set({ modalidades: sql`${partidos.modalidades} || jsonb_build_object(${participanteId}::text, ${modalidad}::text)` })
      .where(and(eq(partidos.id, partidoId), sql`not (${partidos.modalidades} ? ${participanteId}::text)`));
    const [fila] = await this.db.select({ m: partidos.modalidades }).from(partidos).where(eq(partidos.id, partidoId)).limit(1);
    return ((fila?.m as Record<string, ModoSimulacion> | undefined) ?? {})[participanteId] ?? modalidad;
  }

  async obtener(id: string): Promise<FilaPartido | undefined> {
    return (await this.db.select().from(partidos).where(eq(partidos.id, id)).limit(1))[0];
  }

  /**
   * Resumen de los partidos de una partida (sin eventos, alineaciones ni estadísticas). La vista del
   * torneo se calcula tras cada partido: cargar las filas completas era el mayor coste con carga (T140).
   */
  async resumenesDePartida(partidaId: string): Promise<ResumenPartido[]> {
    return this.db
      .select({
        id: partidos.id,
        jornadaNumero: partidos.jornadaNumero,
        localId: partidos.localId,
        visitanteId: partidos.visitanteId,
        marcador: partidos.marcador,
        estado: partidos.estado,
        resolucion: partidos.resolucion,
      })
      .from(partidos)
      .where(eq(partidos.partidaId, partidaId))
      .orderBy(asc(partidos.jornadaNumero), asc(partidos.id));
  }

  async actualizar(id: string, cambios: Partial<Omit<FilaPartido, 'id'>>, ejecutor: Ejecutor = this.db): Promise<void> {
    await ejecutor.update(partidos).set(cambios).where(eq(partidos.id, id));
  }
}
