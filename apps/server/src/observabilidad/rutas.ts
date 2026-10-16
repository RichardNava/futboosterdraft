import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { BaseDatos } from '../persistencia/db';
import type { Metricas } from './metricas';

export function registrarRutasObservabilidad(app: FastifyInstance, db: BaseDatos, metricas: Metricas): void {
  app.get('/healthz', async (_req, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { estado: 'ok', baseDatos: 'ok' };
    } catch {
      return reply.code(503).send({ estado: 'degradado', baseDatos: 'error' });
    }
  });

  app.get('/metrics', async (_req, reply) => {
    reply.header('content-type', metricas.registro.contentType);
    return metricas.registro.metrics();
  });
}
