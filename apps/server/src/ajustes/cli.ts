/**
 * Cambia un ajuste de operación sin reiniciar (spec 011, research R12; spec 013, R6).
 *
 * Uso: `pnpm --filter @fbd/server ajuste identidad_cartas <real|alternativa>` o
 * `pnpm --filter @fbd/server ajuste acceso_niveles_rareza <libre|restringido>`. Los servidores lo aplican en ≤ 30 s,
 * solo a las partidas nuevas.
 */
import '../entorno';
import { ACTOR_CONSOLA } from '../admin/registro';
import { cambiarAjuste } from '../admin/servicio';
import { conectar, urlBaseDatos } from '../persistencia/db';
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
    const { anterior } = await cambiarAjuste(conexion.db, ACTOR_CONSOLA, clave!, valor!, null);
    console.log(`${clave}: ${String(anterior ?? `${admitidos[0]} (sin fila)`)} → ${valor}. Se aplica en ≤ 30 s a las partidas nuevas.`);
  } finally {
    await conexion.cerrar();
  }
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
