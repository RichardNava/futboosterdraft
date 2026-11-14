/**
 * Repositorio del torneo: estado (JSON), jornadas con plazos, bajas y contadores de amarillas.
 */
import type { Baja, EstadoTorneo, JornadaTorneo } from '@fbd/domain';
import { and, asc, eq } from 'drizzle-orm';
import type { BaseDatos } from '../db';
import { bajas, contadoresAmarillas, jornadas, torneos } from '../esquema/index';

type Tx = Parameters<Parameters<BaseDatos['transaction']>[0]>[0];
type Ejecutor = BaseDatos | Tx;

type FilaJornada = typeof jornadas.$inferSelect;

/** Estado del torneo y sus jornadas. */
export class RepoTorneo {
  constructor(private readonly db: BaseDatos) {}

  /**
   * Guarda el torneo. `guardado` es un estado que este mismo comando ya ha guardado: si sus bajas son el mismo
   * objeto (el dominio lo conserva cuando no cambian), no se reescriben bajas ni amarillas (spec 010, R13).
   */
  async guardar(partidaId: string, t: EstadoTorneo, ejecutor: Ejecutor = this.db, guardado?: EstadoTorneo): Promise<void> {
    const { bajas: estadoBajas, ...resto } = t;
    await ejecutor
      .insert(torneos)
      .values({ partidaId, estado: resto, campeonId: t.campeon })
      .onConflictDoUpdate({ target: torneos.partidaId, set: { estado: resto, campeonId: t.campeon, actualizadoEn: new Date() } });
    if (guardado?.bajas === estadoBajas) return;
    await ejecutor.delete(bajas).where(eq(bajas.partidaId, partidaId));
    if (estadoBajas.bajas.length) {
      await ejecutor.insert(bajas).values(
        estadoBajas.bajas.map((b) => ({
          partidaId,
          participanteId: b.participanteId,
          jugadorId: b.jugadorId,
          motivo: b.motivo,
          gravedad: b.gravedad,
          partidoOrigenId: b.partidoOrigenId,
          partidosRestantes: b.partidosRestantes,
        })),
      );
    }
    await ejecutor.delete(contadoresAmarillas).where(eq(contadoresAmarillas.partidaId, partidaId));
    const contadores = Object.entries(estadoBajas.amarillas).filter(([, n]) => n > 0);
    if (contadores.length) {
      await ejecutor.insert(contadoresAmarillas).values(
        contadores.map(([clave, amarillas]) => {
          const [participanteId, jugadorId] = clave.split('|');
          return { partidaId, participanteId: participanteId!, jugadorId: Number(jugadorId), amarillas };
        }),
      );
    }
  }

  /** Estado del torneo de la partida, si existe. */
  async cargar(partidaId: string): Promise<EstadoTorneo | undefined> {
    const fila = (await this.db.select().from(torneos).where(eq(torneos.partidaId, partidaId)).limit(1))[0];
    if (!fila) return undefined;
    const filasBajas = await this.db.select().from(bajas).where(eq(bajas.partidaId, partidaId));
    const filasAmarillas = await this.db.select().from(contadoresAmarillas).where(eq(contadoresAmarillas.partidaId, partidaId));
    return {
      ...(fila.estado as Omit<EstadoTorneo, 'bajas'>),
      bajas: {
        bajas: filasBajas.map(
          (b): Baja => ({
            participanteId: b.participanteId,
            jugadorId: b.jugadorId,
            motivo: b.motivo as Baja['motivo'],
            gravedad: b.gravedad as Baja['gravedad'],
            partidoOrigenId: b.partidoOrigenId,
            partidosRestantes: b.partidosRestantes,
          }),
        ),
        amarillas: Object.fromEntries(filasAmarillas.map((a) => [`${a.participanteId}|${a.jugadorId}`, a.amarillas])),
      },
    };
  }

  /** Guarda una jornada del torneo. */
  async guardarJornada(
    partidaId: string,
    j: JornadaTorneo,
    plazos: { abreEn: number | null; venceEn: number | null },
    ejecutor: Ejecutor = this.db,
  ): Promise<string> {
    const valores = {
      partidaId,
      numero: j.numero,
      tipo: j.tipo,
      estado: j.estado,
      abreEn: plazos.abreEn === null ? null : new Date(plazos.abreEn),
      venceEn: plazos.venceEn === null ? null : new Date(plazos.venceEn),
    };
    const [fila] = await ejecutor
      .insert(jornadas)
      .values(valores)
      .onConflictDoUpdate({ target: [jornadas.partidaId, jornadas.numero], set: valores })
      .returning({ id: jornadas.id });
    return fila!.id;
  }

  /** Cambia el estado de una jornada. */
  async marcarJornada(partidaId: string, numero: number, estado: JornadaTorneo['estado'], ejecutor: Ejecutor = this.db): Promise<void> {
    await ejecutor.update(jornadas).set({ estado }).where(and(eq(jornadas.partidaId, partidaId), eq(jornadas.numero, numero)));
  }

  /** Jornadas de la partida en orden. */
  async jornadas(partidaId: string): Promise<FilaJornada[]> {
    return this.db.select().from(jornadas).where(eq(jornadas.partidaId, partidaId)).orderBy(asc(jornadas.numero));
  }
}
