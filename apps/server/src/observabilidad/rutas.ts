import { createHash, timingSafeEqual } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { BaseDatos } from '../persistencia/db';
import type { Metricas } from './metricas';

const resumen = (texto: string) => createHash('sha256').update(texto).digest();

/** `Authorization: Bearer <token>` en tiempo constante; sin token configurado, nunca es válido. */
function autorizado(cabecera: string | undefined, token: string | undefined): boolean {
  return Boolean(token) && timingSafeEqual(resumen(cabecera ?? ''), resumen(`Bearer ${token}`));
}

/** Rutas `/healthz` y `/metrics`; en producción, `/metrics` solo responde con `metricasToken` (spec 017, R10). */
export function registrarRutasObservabilidad(app: FastifyInstance, db: BaseDatos, metricas: Metricas, metricasToken?: string): void {
  app.get('/healthz', async (_req, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { estado: 'ok' };
    } catch {
      return reply.code(503).send({ estado: 'degradado' });
    }
  });

  app.get('/metrics', async (req, reply) => {
    if (process.env.NODE_ENV === 'production' && !autorizado(req.headers.authorization, metricasToken)) return reply.code(404).send();
    reply.header('content-type', metricas.registro.contentType);
    return metricas.registro.metrics();
  });
}
