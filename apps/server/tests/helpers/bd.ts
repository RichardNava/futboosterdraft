/**
 * Base de datos de pruebas: PostgreSQL 16 con Testcontainers (requiere Docker), migraciones
 * aplicadas y catálogo cargado (Core, cartas de prueba y colecciones de la spec 006).
 */
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { sql } from 'drizzle-orm';
import { conectar, type ConexionBD } from '../../src/persistencia/db';
import { aplicarMigraciones } from '../../src/persistencia/migrar';
import { cargarCatalogo, FICHEROS_POR_DEFECTO, leerLote } from '../../src/persistencia/seed';

export interface BdPruebas extends ConexionBD {
  contenedor: StartedPostgreSqlContainer;
  /** Vacía las tablas de partidas, usuarios y economía (el catálogo y las colecciones se conservan). */
  limpiar(): Promise<void>;
  detener(): Promise<void>;
}

const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url));

/** Tablas del catálogo: `limpiar` las conserva. */
const TABLAS_CATALOGO = ['jugadores', 'colecciones', 'colecciones_cartas', '__drizzle_migrations'];

export async function iniciarBdPruebas(): Promise<BdPruebas> {
  const contenedor = await new PostgreSqlContainer('postgres:16').start();
  const conexion = conectar(contenedor.getConnectionUri());
  await aplicarMigraciones(conexion.db);
  const { jugadores, colecciones, errores } = leerLote(RAIZ, FICHEROS_POR_DEFECTO.cartas, FICHEROS_POR_DEFECTO.colecciones);
  if (errores.length) throw new Error(`Catálogo inválido: ${errores.length} errores`);
  await cargarCatalogo(conexion.db, jugadores, colecciones);

  return {
    ...conexion,
    contenedor,
    async limpiar() {
      const tablas = await conexion.db.execute<{ tablename: string }>(
        sql`select tablename from pg_tables where schemaname = 'public' and tablename not in (${sql.join(TABLAS_CATALOGO.map((t) => sql`${t}`), sql`, `)})`,
      );
      const nombres = tablas.rows.map((t) => `"${t.tablename}"`).join(', ');
      if (nombres) await conexion.db.execute(sql.raw(`truncate ${nombres} restart identity cascade`));
    },
    async detener() {
      await conexion.cerrar();
      await contenedor.stop();
    },
  };
}
