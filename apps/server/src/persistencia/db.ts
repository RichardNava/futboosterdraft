import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
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
  const db = drizzle(pool, { schema: esquema });
  return { db, pool, cerrar: () => pool.end() };
}

export function urlBaseDatos(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta la variable de entorno DATABASE_URL (ver .env.example)');
  return url;
}
