/**
 * Órdenes de consola (spec 017, R21): cada partida vive en la memoria del servidor, así que la consola escribe la orden en
 * la base de datos y el servidor la recoge cada 2 s. Las de más de 60 s se descartan.
 */
import { and, asc, eq, sql } from 'drizzle-orm';
import type { GestorPartidas } from '../actores/gestor';
import { ErrorApi } from '../http/errores';
import type { Logger } from '../observabilidad/logger';
import type { BaseDatos } from '../persistencia/db';
import { ordenesConsola } from '../persistencia/esquema/index';
import { ACTOR_CONSOLA } from './registro';
import { cerrarPartida } from './servicio';

const INTERVALO_MS = 2_000;

/** Empieza a recoger órdenes; `parar` espera a la vuelta en curso. */
export function iniciarOrdenes(db: BaseDatos, gestor: GestorPartidas, logger: Logger): { parar(): Promise<void> } {
  /** Con la fila bloqueada: si la consola se cansa de esperar, su retirada aguarda a este resultado (SEG-035). */
  const ejecutar = (id: string) =>
    db.transaction(async (tx) => {
      const [orden] = await tx
        .select()
        .from(ordenesConsola)
        .where(and(eq(ordenesConsola.id, id), eq(ordenesConsola.estado, 'pendiente')))
        .for('update', { skipLocked: true });
      if (!orden) return;
      const terminar = (estado: 'hecha' | 'rechazada', resultado: unknown) =>
        tx.update(ordenesConsola).set({ estado, resultado, procesadaEn: new Date() }).where(eq(ordenesConsola.id, id));
      const { partidaId, motivo } = orden.datos as { partidaId: string; motivo: string };
      try {
        await cerrarPartida(db, gestor, ACTOR_CONSOLA, partidaId, motivo);
        await terminar('hecha', { mensaje: 'Partida cerrada' });
      } catch (err) {
        if (!(err instanceof ErrorApi)) logger.error({ err, ordenId: id }, 'Error al ejecutar una orden de consola');
        await terminar('rechazada', err instanceof ErrorApi ? { codigo: err.codigo, mensaje: err.message } : { codigo: 'ERROR_INTERNO', mensaje: 'No se pudo ejecutar la orden' });
      }
    });

  const recoger = async () => {
    await db
      .update(ordenesConsola)
      .set({ estado: 'caducada', resultado: { mensaje: 'La orden ha caducado' }, procesadaEn: new Date() })
      .where(and(eq(ordenesConsola.estado, 'pendiente'), sql`${ordenesConsola.creadaEn} < now() - interval '60 seconds'`));
    const pendientes = await db.select({ id: ordenesConsola.id }).from(ordenesConsola).where(eq(ordenesConsola.estado, 'pendiente')).orderBy(asc(ordenesConsola.creadaEn)).limit(10);
    for (const { id } of pendientes) await ejecutar(id);
  };

  let enCurso: Promise<void> | null = null;
  const temporizador = setInterval(() => {
    enCurso ??= recoger()
      .catch((err: unknown) => logger.warn({ err }, 'No se pudieron recoger las órdenes de consola'))
      .finally(() => {
        enCurso = null;
      });
  }, INTERVALO_MS);
  temporizador.unref();

  return {
    async parar() {
      clearInterval(temporizador);
      await enCurso;
    },
  };
}
