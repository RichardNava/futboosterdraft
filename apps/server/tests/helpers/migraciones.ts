/**
 * Migraciones parciales para probar las migraciones de datos (spec 003, T047, T099, T111): una base de datos con
 * las migraciones hasta una dada, sobre la que se insertan datos antiguos antes de aplicar el resto.
 */
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { conectar, type ConexionBD } from '../../src/persistencia/db';
import { aplicarMigraciones, CARPETA_MIGRACIONES } from '../../src/persistencia/migrar';

/** Carpeta con las migraciones hasta `ultima` (incluida), con su diario recortado. */
function carpetaHasta(ultima: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'fbd-migraciones-'));
  cpSync(CARPETA_MIGRACIONES, dir, { recursive: true });
  const ruta = join(dir, 'meta', '_journal.json');
  const diario = JSON.parse(readFileSync(ruta, 'utf-8')) as { entries: { tag: string; idx: number }[] };
  const corte = diario.entries.findIndex((e) => e.tag === ultima);
  if (corte < 0) throw new Error(`No existe la migración ${ultima}`);
  diario.entries = diario.entries.slice(0, corte + 1);
  writeFileSync(ruta, JSON.stringify(diario));
  return dir;
}

export interface BdParcial extends ConexionBD {
  contenedor: StartedPostgreSqlContainer;
  /** Aplica las migraciones que faltan. */
  completar(): Promise<void>;
  detener(): Promise<void>;
}

export async function bdHasta(ultima: string): Promise<BdParcial> {
  const contenedor = await new PostgreSqlContainer('postgres:16').start();
  const conexion = conectar(contenedor.getConnectionUri());
  await migrate(conexion.db, { migrationsFolder: carpetaHasta(ultima) });
  return {
    ...conexion,
    contenedor,
    completar: () => aplicarMigraciones(conexion.db),
    async detener() {
      await conexion.cerrar();
      await contenedor.stop();
    },
  };
}
