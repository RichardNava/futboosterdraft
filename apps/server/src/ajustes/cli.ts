/**
 * Cambia un ajuste de operación sin reiniciar (spec 011, research R12; spec 013, R6).
 *
 * Uso: `pnpm --filter @fbd/server ajuste identidad_cartas <real|alternativa>` o
 * `pnpm --filter @fbd/server ajuste acceso_niveles_rareza <libre|restringido>`. Los servidores lo aplican en ≤ 30 s,
 * solo a las partidas nuevas.
 */
import '../entorno';
import { eq } from 'drizzle-orm';
import { conectar, urlBaseDatos } from '../persistencia/db';
import { ajustes } from '../persistencia/esquema/index';
import { AJUSTES_CONOCIDOS, type ClaveAjuste } from './servicio';

async function principal(): Promise<void> {
  const [clave, valor] = process.argv.slice(2).filter((a) => a !== '--');
  const admitidos: readonly string[] | undefined = AJUSTES_CONOCIDOS[clave as ClaveAjuste];
  if (!admitidos || !admitidos.includes(valor ?? '')) {
    const usos = Object.entries(AJUSTES_CONOCIDOS).map(([c, v]) => `  pnpm --filter @fbd/server ajuste ${c} <${v.join('|')}>`);
    throw new Error(`Uso:\n${usos.join('\n')}`);
  }
  const conexion = conectar(urlBaseDatos());
  try {
    const [antes] = await conexion.db.select({ valor: ajustes.valor }).from(ajustes).where(eq(ajustes.clave, clave!));
    const ahora = new Date();
    await conexion.db
      .insert(ajustes)
      .values({ clave: clave!, valor: valor!, actualizadoEn: ahora })
      .onConflictDoUpdate({ target: ajustes.clave, set: { valor: valor!, actualizadoEn: ahora } });
    console.log(`${clave}: ${String(antes?.valor ?? `${admitidos[0]} (sin fila)`)} → ${valor}. Se aplica en ≤ 30 s a las partidas nuevas.`);
  } finally {
    await conexion.cerrar();
  }
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
