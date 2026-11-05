/**
 * Cambia un ajuste de operación sin reiniciar (spec 011, research R12; contracts/http-api.md «Guion del ajuste»).
 *
 * Uso: `pnpm --filter @fbd/server ajuste identidad_cartas <real|alternativa>`. Los servidores lo aplican en ≤ 30 s,
 * solo a las partidas nuevas.
 */
import '../entorno';
import { IDENTIDADES, type Identidad } from '@fbd/domain';
import { eq } from 'drizzle-orm';
import { conectar, urlBaseDatos } from '../persistencia/db';
import { ajustes } from '../persistencia/esquema/index';
import { CLAVE_IDENTIDAD } from './servicio';

async function principal(): Promise<void> {
  const [clave, valor] = process.argv.slice(2).filter((a) => a !== '--');
  if (clave !== CLAVE_IDENTIDAD || !IDENTIDADES.includes(valor as Identidad)) {
    throw new Error(`Uso: pnpm --filter @fbd/server ajuste ${CLAVE_IDENTIDAD} <${IDENTIDADES.join('|')}>`);
  }
  const conexion = conectar(urlBaseDatos());
  try {
    const [antes] = await conexion.db.select({ valor: ajustes.valor }).from(ajustes).where(eq(ajustes.clave, clave));
    const ahora = new Date();
    await conexion.db
      .insert(ajustes)
      .values({ clave, valor, actualizadoEn: ahora })
      .onConflictDoUpdate({ target: ajustes.clave, set: { valor, actualizadoEn: ahora } });
    console.log(`${clave}: ${String(antes?.valor ?? 'real (sin fila)')} → ${valor}. Se aplica en ≤ 30 s a las partidas nuevas.`);
  } finally {
    await conexion.cerrar();
  }
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
