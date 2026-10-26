/**
 * Ayudantes de la spec 006: saldo de fragmentos y cartas de un usuario de pruebas.
 */
import { sql } from 'drizzle-orm';
import type { BaseDatos } from '../../src/persistencia/db';
import type { ServidorPruebas } from './app';
import { crearRegistrado, peticion, type UsuarioPrueba } from './usuarios';

/** Registrado con su colección Core ya creada (`GET /api/coleccion`). */
export async function crearRegistradoConColeccion(srv: ServidorPruebas): Promise<UsuarioPrueba> {
  const u = await crearRegistrado(srv.url);
  const r = await peticion(srv.url, '/api/coleccion', { cookie: u.cookie });
  if (r.estado !== 200) throw new Error(`No se pudo crear la colección: ${r.estado}`);
  return u;
}

/** Fija el saldo con un movimiento por la diferencia, para que el historial siga sumando el saldo (SC-006). */
export async function fijarSaldo(db: BaseDatos, usuarioId: string, saldo: number): Promise<void> {
  await db.execute(sql`insert into saldos_fragmentos (usuario_id) values (${usuarioId}) on conflict do nothing`);
  const actual = (await db.execute<{ saldo: number }>(sql`select saldo from saldos_fragmentos where usuario_id = ${usuarioId}`)).rows[0]!.saldo;
  if (actual === saldo) return;
  await db.execute(sql`update saldos_fragmentos set saldo = ${saldo} where usuario_id = ${usuarioId}`);
  await db.execute(
    sql`insert into movimientos_fragmentos (usuario_id, importe, motivo, referencia) values (${usuarioId}, ${saldo - actual}, 'compra_fragmentos', 'prueba')`,
  );
}

/** Da cartas (no Core) a un usuario, activas. */
export async function darCartas(db: BaseDatos, usuarioId: string, ids: readonly number[], via: 'sobre' | 'coleccion' = 'sobre'): Promise<void> {
  for (const id of ids) {
    await db.execute(sql`insert into cartas_usuario (usuario_id, jugador_id, via) values (${usuarioId}, ${id}, ${via}) on conflict do nothing`);
  }
}

/** Saldo y suma del historial de movimientos (SC-006). */
export async function saldoYSuma(db: BaseDatos, usuarioId: string): Promise<{ saldo: number; suma: number }> {
  const r = await db.execute<{ saldo: number; suma: number }>(
    sql`select coalesce((select saldo from saldos_fragmentos where usuario_id = ${usuarioId}), 0) as saldo,
               coalesce((select sum(importe)::int from movimientos_fragmentos where usuario_id = ${usuarioId}), 0) as suma`,
  );
  return r.rows[0]!;
}
