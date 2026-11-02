import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { contarConsulta, fase } from '../observabilidad/desglose';
import * as esquema from './esquema/index';

export type BaseDatos = NodePgDatabase<typeof esquema>;

export interface ConexionBD {
  db: BaseDatos;
  pool: pg.Pool;
  cerrar(): Promise<void>;
}

/**
 * Conexiones simultáneas a PostgreSQL. Cada partida escribe desde su actor; con 100 partidas activas
 * (SC-017), 10 conexiones hacían esperar a los comandos (T140). Se ajusta con `DB_POOL_MAX`.
 */
export const POOL_POR_DEFECTO = 25;

export function conectar(url: string): ConexionBD {
  const pool = new pg.Pool({ connectionString: url, max: Number(process.env.DB_POOL_MAX ?? POOL_POR_DEFECTO) });
  medirConsultas(pool);
  const db = drizzle(pool, { schema: esquema });
  return { db, pool, cerrar: () => pool.end() };
}

/**
 * Fase `bd` del desglose (spec 010): cada consulta, con la espera de una conexión libre. `pool.query` usa
 * `connect` con callback, que no se envuelve; las transacciones de Drizzle usan `connect()` sin argumentos
 * y consultan con ese cliente, que se envuelve solo mientras lo tiene la transacción. Así cada consulta se
 * cuenta una vez y en el contexto de quien la hace.
 */
function medirConsultas(pool: pg.Pool): void {
  const consultar = <F extends (...a: never[]) => unknown>(query: F) =>
    ((...a: Parameters<F>) => fase('bd', () => (contarConsulta(), query(...a)))) as unknown as F;
  pool.query = consultar(pool.query.bind(pool));
  const conectarOriginal = pool.connect.bind(pool) as (...a: unknown[]) => unknown;
  pool.connect = ((...a: unknown[]) => {
    if (a.length) return conectarOriginal(...a);
    return fase('bd', () => conectarOriginal() as Promise<pg.PoolClient>).then((cliente) => {
      const query = consultar(cliente.query.bind(cliente));
      return new Proxy(cliente, {
        get: (c, p) => (p === 'query' ? query : Reflect.get(c, p, c)),
      });
    });
  }) as typeof pool.connect;
}

export function urlBaseDatos(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta la variable de entorno DATABASE_URL (ver .env.example)');
  return url;
}
