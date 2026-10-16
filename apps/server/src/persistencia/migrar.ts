import { fileURLToPath } from 'node:url';
import '../entorno';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { conectar, urlBaseDatos, type BaseDatos } from './db';

/** Carpeta de migraciones: relativa a este fichero en desarrollo; en la imagen de producción, por entorno. */
export const CARPETA_MIGRACIONES = process.env.CARPETA_MIGRACIONES ?? fileURLToPath(new URL('../../drizzle', import.meta.url));

export async function aplicarMigraciones(db: BaseDatos): Promise<void> {
  await migrate(db, { migrationsFolder: CARPETA_MIGRACIONES });
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('persistencia/migrar.ts')) {
  const conexion = conectar(urlBaseDatos());
  aplicarMigraciones(conexion.db)
    .then(() => console.log('Migraciones aplicadas'))
    .finally(() => conexion.cerrar());
}
