/**
 * Repositorio de partidos.
 */
import { randomUUID } from 'node:crypto';
import type { ModoSimulacion } from '@fbd/domain';
import { asc, eq, sql } from 'drizzle-orm';
import type { BaseDatos } from '../db';
import { partidos } from '../esquema/index';

export type FilaPartido = typeof partidos.$inferSelect;
type Tx = Parameters<Parameters<BaseDatos['transaction']>[0]>[0];
type Ejecutor = BaseDatos | Tx;

type ResumenPartido = Pick<FilaPartido, 'id' | 'jornadaNumero' | 'localId' | 'visitanteId' | 'marcador' | 'estado' | 'resolucion' | 'tipo'>;

/** Derivado de la spec 001 que se conserva en las vistas: el partido se resolvió al vencer el plazo. */
export const resueltoAutomaticamente = (p: Pick<FilaPartido, 'resolucion'>): boolean => p.resolucion === 'plazo';

/** Partidos del torneo: entrada, decisiones, resultado y estado. */
export class RepoPartidos {
  constructor(private readonly db: BaseDatos) {}

  /** Crea los partidos en una consulta (spec 010, R13) y devuelve sus ids en el mismo orden. */
  async crear(
    lista: readonly {
      partidaId: string;
      jornadaId?: string | null;
      jornadaNumero: number;
      localId: string;
      visitanteId: string;
      eliminatoria: boolean;
      semilla: string;
      versionParametros: string;
      /** `duelos` en los cruces del modo Duelo de jugadores (spec 005). */
      tipo?: 'futbol' | 'duelos';
    }[],
    ejecutor: Ejecutor = this.db,
  ): Promise<string[]> {
    // Ids generados aquí: así no se depende del orden en que `returning` devuelve las filas.
    const filas = lista.map((datos) => ({ ...datos, id: randomUUID(), jornadaId: datos.jornadaId ?? null }));
    if (filas.length) await ejecutor.insert(partidos).values(filas);
    return filas.map((f) => f.id);
  }

  /**
   * Fija la modalidad de un participante en un partido solo si aún no la tiene (FR-035: no cambia después).
   * Devuelve la modalidad que queda.
   */
  /**
   * Fija la modalidad de cada participante en su partido si aún no tenía una (manda la primera, también dentro de
   * `pedidas`) y devuelve, por partido, las modalidades que quedan. Una sola consulta para todas (spec 010, R13).
   */
  async fijarModalidades(
    pedidas: readonly { partidoId: string; participanteId: string; modalidad: ModoSimulacion }[],
    ejecutor: Ejecutor = this.db,
  ): Promise<Map<string, Record<string, ModoSimulacion>>> {
    const porPartido = new Map<string, Record<string, ModoSimulacion>>();
    for (const p of pedidas) {
      const m = porPartido.get(p.partidoId) ?? {};
      m[p.participanteId] ??= p.modalidad;
      porPartido.set(p.partidoId, m);
    }
    if (porPartido.size === 0) return new Map();
    const valores = sql.join([...porPartido].map(([id, m]) => sql`(${id}::uuid, ${JSON.stringify(m)}::jsonb)`), sql`, `);
    // `nuevas || guardadas`: con la misma clave gana la guardada.
    const r = await ejecutor.execute<{ id: string; modalidades: Record<string, ModoSimulacion> }>(sql`
      update ${partidos} set modalidades = v.m || ${partidos.modalidades}
      from (values ${valores}) as v(id, m) where ${partidos.id} = v.id
      returning ${partidos.id} as id, ${partidos.modalidades} as modalidades`);
    return new Map(r.rows.map((f) => [f.id, f.modalidades]));
  }

  /** Partido por id. */
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
        tipo: partidos.tipo,
      })
      .from(partidos)
      .where(eq(partidos.partidaId, partidaId))
      .orderBy(asc(partidos.jornadaNumero), asc(partidos.id));
  }

  /** Actualiza campos de un partido. */
  async actualizar(id: string, cambios: Partial<Omit<FilaPartido, 'id'>>, ejecutor: Ejecutor = this.db): Promise<void> {
    await ejecutor.update(partidos).set(cambios).where(eq(partidos.id, id));
  }
}
