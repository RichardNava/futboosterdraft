/**
 * Consola de administración (spec 017, FR-044, FR-046).
 *
 * Uso: `pnpm --filter @fbd/server admin designar <email>` (solo sin administradores activos) o
 * `pnpm --filter @fbd/server admin cerrar-partida <id> "<motivo>"` (espera hasta 15 s al servidor).
 */
import '../entorno';
import { MotivoAdmin } from '@fbd/protocol';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { conectar, urlBaseDatos, type BaseDatos } from '../persistencia/db';
import { ordenesConsola } from '../persistencia/esquema/index';
import { designarPrimerAdministrador } from './servicio';

const USO = 'Uso:\n  pnpm --filter @fbd/server admin designar <email>\n  pnpm --filter @fbd/server admin cerrar-partida <id> "<motivo>"';
const ESPERA_MS = 15_000;

async function ordenarCierre(db: BaseDatos, partidaId: string, motivo: string): Promise<void> {
  const [orden] = await db.insert(ordenesConsola).values({ tipo: 'partida.cerrar', datos: { partidaId, motivo } }).returning({ id: ordenesConsola.id });
  const leer = async () => (await db.select().from(ordenesConsola).where(eq(ordenesConsola.id, orden!.id)))[0]!;
  const limite = Date.now() + ESPERA_MS;
  while (Date.now() < limite) {
    const fila = await leer();
    if (fila.estado !== 'pendiente') return informar(fila.estado, fila.resultado);
    await new Promise((r) => setTimeout(r, 500));
  }
  // Se retira para que un servidor que arranque después no ejecute una orden que ya se ha dado por fallida.
  const retirada = await db
    .update(ordenesConsola)
    .set({ estado: 'caducada', resultado: { mensaje: 'Sin respuesta del servidor' }, procesadaEn: new Date() })
    .where(and(eq(ordenesConsola.id, orden!.id), eq(ordenesConsola.estado, 'pendiente')))
    .returning({ id: ordenesConsola.id });
  if (retirada.length) throw new Error('El servidor no ha respondido en 15 s: comprueba que está en marcha. La orden se ha retirado.');
  const fila = await leer();
  informar(fila.estado, fila.resultado);
}

function informar(estado: string, resultado: unknown): void {
  const { mensaje } = (resultado ?? {}) as { mensaje?: string };
  if (estado !== 'hecha') throw new Error(`Orden ${estado}: ${mensaje ?? 'sin detalle'}`);
  console.log(mensaje ?? 'Hecho.');
}

async function principal(): Promise<void> {
  const [orden, a, b] = process.argv.slice(2).filter((x) => x !== '--');
  if (orden === 'designar' && a) {
    const conexion = conectar(urlBaseDatos());
    try {
      await designarPrimerAdministrador(conexion.db, a);
      console.log(`${a} ya es administrador.`);
    } finally {
      await conexion.cerrar();
    }
    return;
  }
  if (orden === 'cerrar-partida' && a && b) {
    if (!z.uuid().safeParse(a).success) throw new Error('El id de la partida no es válido.');
    const motivo = MotivoAdmin.safeParse(b);
    if (!motivo.success) throw new Error('El motivo debe tener de 3 a 500 caracteres, sin caracteres de control.');
    const conexion = conectar(urlBaseDatos());
    try {
      await ordenarCierre(conexion.db, a, motivo.data);
    } finally {
      await conexion.cerrar();
    }
    return;
  }
  throw new Error(USO);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
