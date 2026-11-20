/**
 * Ayudantes de la spec 006: saldo de fragmentos y cartas de un usuario de pruebas. Spec 016: colecciones de pago de
 * pruebas montadas con copias de cartas de Core, para no depender del contenido de ninguna expansión (research R16).
 */
import { readFileSync } from 'node:fs';
import type { Coleccion, Jugador, Nivel } from '@fbd/domain';
import { sql } from 'drizzle-orm';
import type { BaseDatos } from '../../src/persistencia/db';
import { cargarCatalogo } from '../../src/persistencia/seed';
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

const ORDEN_NIVELES: readonly Nivel[] = ['GOAT', 'Legendario', 'Crack', 'Superclase'];

export interface ColeccionPrueba {
  coleccion: Coleccion;
  /** Las cartas nuevas (copias), para volver a sembrarlas. */
  jugadores: Jugador[];
  /** Ids de la colección en orden de número. */
  ids: number[];
}

/**
 * Colección de pago de pruebas (spec 016, R16), cargada con el seed real. Tiene `nuevas` copias de cartas de Core con
 * ids desde `primerId`, en bloques de 6 por nivel (GOAT, Legendario, Crack, Superclase), y después `compartidas` (ids
 * que ya existen); se numeran 1..N en ese orden. Hay que llamarla antes de arrancar el servidor, que lee el catálogo
 * al iniciar.
 */
export async function montarColeccionPago(
  db: BaseDatos,
  o: { id: string; primerId: number; nuevas?: number; compartidas?: readonly number[]; precio?: number; sobreRegalo?: string },
): Promise<ColeccionPrueba> {
  const core = (JSON.parse(readFileSync(new URL('../../../../data/core-real.json', import.meta.url), 'utf-8')) as { jugadores: Jugador[] }).jugadores;
  const porNivel = new Map(ORDEN_NIVELES.map((n) => [n, core.filter((j) => j.nivel === n)]));
  const jugadores = Array.from({ length: o.nuevas ?? 24 }, (_, k) => {
    const grupo = porNivel.get(ORDEN_NIVELES[Math.floor(k / 6) % 4]!)!;
    return { ...grupo[(k % 6) + 6 * Math.floor(k / 24)]!, id: o.primerId + k };
  });
  const ids = [...jugadores.map((j) => j.id), ...(o.compartidas ?? [])];
  const coleccion: Coleccion = {
    id: o.id,
    nombre: `Colección ${o.id}`,
    descripcion: 'Colección de pruebas',
    tipo: 'pago',
    precioFragmentos: o.precio ?? 2400,
    ...(o.sobreRegalo ? { sobreRegalo: o.sobreRegalo } : {}),
    cartas: ids.map((id, i) => ({ id, version: 'normal', numero: i + 1 })),
  };
  await cargarCatalogo(db, jugadores, [coleccion]);
  return { coleccion, jugadores, ids };
}

/** Ids de todas las cartas de las colecciones de pago: el pool del sobre de la tienda. */
export async function cartasDePago(db: BaseDatos): Promise<number[]> {
  const r = await db.execute<{ id: number }>(
    sql`select distinct cc.jugador_id as id from colecciones_cartas cc join colecciones c on c.id = cc.coleccion_id where c.tipo = 'pago' order by 1`,
  );
  return r.rows.map((f) => f.id);
}

/** Ids de las cartas de Core (ya no son 1..300: Kimmich es la 376, spec 016). */
export async function cartasCore(db: BaseDatos): Promise<Set<number>> {
  const r = await db.execute<{ id: number }>(sql`select jugador_id as id from colecciones_cartas where coleccion_id = 'core'`);
  return new Set(r.rows.map((f) => f.id));
}
