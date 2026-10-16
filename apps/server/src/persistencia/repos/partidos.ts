/**
 * Repositorio de partidos.
 */
import { asc, eq } from 'drizzle-orm';
import type { BaseDatos } from '../db';
import { partidos } from '../esquema/index';

export type FilaPartido = typeof partidos.$inferSelect;
type Tx = Parameters<Parameters<BaseDatos['transaction']>[0]>[0];
type Ejecutor = BaseDatos | Tx;

export type ResumenPartido = Pick<FilaPartido, 'id' | 'jornadaNumero' | 'localId' | 'visitanteId' | 'marcador' | 'estado' | 'resueltoAutomaticamente'>;

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
        resueltoAutomaticamente: partidos.resueltoAutomaticamente,
      })
      .from(partidos)
      .where(eq(partidos.partidaId, partidaId))
      .orderBy(asc(partidos.jornadaNumero), asc(partidos.id));
  }

  async actualizar(id: string, cambios: Partial<Omit<FilaPartido, 'id'>>, ejecutor: Ejecutor = this.db): Promise<void> {
    await ejecutor.update(partidos).set(cambios).where(eq(partidos.id, id));
  }
}
