/**
 * Solo para los e2e del panel (spec 017, T099): fija el rol de una cuenta de prueba en la base de datos. Es un fichero de
 * pruebas a propósito: la aplicación no tiene ninguna ruta ni variable que conceda el rol (FR-044).
 *
 * Uso: `pnpm --filter @fbd/server exec tsx tests/helpers/fijarRol.ts <email@pruebas.test> <rol>`.
 */
import '../../src/entorno';
import { eq } from 'drizzle-orm';
import { conectar, urlBaseDatos } from '../../src/persistencia/db';
import { usuarios } from '../../src/persistencia/esquema/index';

const [email, rol] = process.argv.slice(2);
if (!email?.endsWith('@pruebas.test') || (rol !== 'jugador' && rol !== 'betatester' && rol !== 'administrador')) {
  throw new Error('Uso: fijarRol <email@pruebas.test> <jugador|betatester|administrador>');
}
const conexion = conectar(urlBaseDatos());
try {
  await conexion.db.update(usuarios).set({ rol }).where(eq(usuarios.email, email));
} finally {
  await conexion.cerrar();
}
