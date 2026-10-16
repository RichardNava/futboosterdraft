/**
 * Base de datos de pruebas: PostgreSQL 16 con Testcontainers (requiere Docker), migraciones
 * aplicadas y catálogo Core cargado.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { sql } from 'drizzle-orm';
import { conectar, type ConexionBD } from '../../src/persistencia/db';
import { aplicarMigraciones } from '../../src/persistencia/migrar';
import { cargarCatalogo, validarFicheroCatalogo } from '../../src/persistencia/seed';

export interface BdPruebas extends ConexionBD {
  contenedor: StartedPostgreSqlContainer;
  /** Vacía las tablas de partidas y usuarios (el catálogo se conserva). */
  limpiar(): Promise<void>;
  detener(): Promise<void>;
}

const RUTA_CORE = fileURLToPath(new URL('../../../../data/core.json', import.meta.url));

export async function iniciarBdPruebas(): Promise<BdPruebas> {
  const contenedor = await new PostgreSqlContainer('postgres:16').start();
  const conexion = conectar(contenedor.getConnectionUri());
  await aplicarMigraciones(conexion.db);
  const { jugadores, errores } = validarFicheroCatalogo(JSON.parse(readFileSync(RUTA_CORE, 'utf-8')));
  if (errores.length) throw new Error(`core.json inválido: ${errores.length} errores`);
  await cargarCatalogo(conexion.db, jugadores);

  return {
    ...conexion,
    contenedor,
    async limpiar() {
      const tablas = await conexion.db.execute<{ tablename: string }>(
        sql`select tablename from pg_tables where schemaname = 'public' and tablename not in ('jugadores', '__drizzle_migrations')`,
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
