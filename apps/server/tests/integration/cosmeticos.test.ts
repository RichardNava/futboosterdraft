/**
 * Venta de cosméticos (spec 011, US3; T051; contracts/http-api.md «Cosméticos»): catálogo público, compras sueltas
 * con fragmentos o euros, packs, idempotencia (SC-006) y ningún efecto en cartas, colecciones ni partidas (FR-016).
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearRegistradoConColeccion, fijarSaldo, saldoYSuma } from '../helpers/economia';
import { crearInvitado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('cosméticos (spec 011, US3)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
  });
  beforeEach(async () => {
    await srv?.cerrar();
    await bd.limpiar();
    srv = await iniciarServidorPruebas(bd);
  });
  afterAll(async () => {
    await srv?.cerrar();
    await bd?.detener();
  });

  const catalogo = (u?: UsuarioPrueba) => peticion(srv.url, '/api/cosmeticos', u ? { cookie: u.cookie } : {});
  const comprar = (u: UsuarioPrueba, id: string, moneda: 'eur' | 'fragmentos', idCompra: string = randomUUID()) =>
    peticion(srv.url, `/api/tienda/cosmeticos/${id}/comprar`, { cookie: u.cookie, cuerpo: { idCompra, moneda } });
  const comprarPack = (u: UsuarioPrueba, id: string, idCompra: string = randomUUID()) =>
    peticion(srv.url, `/api/tienda/packs/${id}/comprar`, { cookie: u.cookie, cuerpo: { idCompra } });
  const poseidos = async (u: UsuarioPrueba) =>
    (await bd.db.execute<{ id: string }>(sql`select cosmetico_id as id from cosmeticos_usuario where usuario_id = ${u.id} order by 1`)).rows.map((r) => r.id);

  it('GET /api/cosmeticos: sin sesión sin poseído ni saldo; con sesión, poseído, packs disponibles y saldo', async () => {
    const anonimo = (await catalogo()).cuerpo;
    // 69 de la 011 + las 6 celebraciones activas de la 012 (Discoteca y Fuegos desde la ronda 4) + los sobres 25–33 de la 016.
    expect(anonimo.cosmeticos).toHaveLength(84);
    expect(anonimo.packs).toHaveLength(11);
    expect(anonimo.saldo).toBeUndefined();
    expect(anonimo.cosmeticos[0].poseido).toBeUndefined();
    const u = await crearRegistradoConColeccion(srv);
    const conSesion = (await catalogo(u)).cuerpo;
    expect(conSesion.saldo).toBe(0);
    expect(conSesion.cosmeticos.find((c: any) => c.id === 'sobre-original').poseido).toBe(true);
    expect(conSesion.cosmeticos.find((c: any) => c.id === 'escudo-premium-1')).toMatchObject({ poseido: false, precioCentimos: 25, precioFragmentos: 250 });
    expect(conSesion.packs.every((p: any) => p.disponible === true)).toBe(true);
  });

  it('sobres de regalo (spec 016, US3): vendible y regaloDe, no se compran sueltos y los packs tienen 5 vendibles (SC-006)', async () => {
    const { cosmeticos, packs } = (await catalogo()).cuerpo;
    const de = (id: string) => cosmeticos.find((c: any) => c.id === id);
    expect(de('sobre-28')).toMatchObject({ vendible: false, regaloDe: { id: 'estrellas-fulgurantes', nombre: 'Estrellas Fulgurantes' } });
    expect(['sobre-1', 'sobre-4', 'sobre-7'].map((id) => de(id).regaloDe.id)).toEqual(['idolos-dorados', 'saque-ardiente', 'remontada-historica']);
    expect(de('sobre-25')).toMatchObject({ vendible: true, regaloDe: null, precioFragmentos: 250, precioCentimos: 50 });
    const vendible = new Map<string, boolean>(cosmeticos.map((c: any) => [c.id, c.vendible]));
    for (const p of packs) {
      expect(p.cosmeticos, p.id).toHaveLength(5);
      expect(p.cosmeticos.every((id: string) => vendible.get(id)), p.id).toBe(true);
    }
    expect(packs.find((p: any) => p.id === 'pack-sobres-7').cosmeticos).toEqual(['sobre-29', 'sobre-30', 'sobre-31', 'sobre-32', 'sobre-33']);

    const u = await crearRegistradoConColeccion(srv);
    await fijarSaldo(bd.db, u.id, 1000);
    const r = await comprar(u, 'sobre-28', 'fragmentos');
    expect(r.estado).toBe(422);
    expect(r.cuerpo.error).toMatchObject({ codigo: 'COSMETICO_NO_VENDIBLE', mensaje: 'Este sobre solo se consigue con su expansión' });
    expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 1000, suma: 1000 });
    // Si ya lo tiene, manda el 409 de siempre.
    const previa = randomUUID();
    await bd.db.execute(sql`insert into compras (id, usuario_id, producto_tipo, producto_id, moneda, importe, estado, resultado)
      values (${previa}, ${u.id}, 'cosmetico', 'sobre-28', 'fragmentos', 250, 'completada', '{"cartas":[],"fragmentos":0,"duplicados":[]}'::jsonb)`);
    await bd.db.execute(sql`insert into cosmeticos_usuario (usuario_id, cosmetico_id, compra_id) values (${u.id}, 'sobre-28', ${previa})`);
    expect((await comprar(u, 'sobre-28', 'fragmentos')).cuerpo.error.codigo).toBe('COSMETICO_POSEIDO');
  });

  it('con fragmentos: cargo de 250 y un movimiento compra_cosmetico; después es elegible en el perfil', async () => {
    const u = await crearRegistradoConColeccion(srv);
    await fijarSaldo(bd.db, u.id, 300);
    const r = await comprar(u, 'escudo-premium-2', 'fragmentos');
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    expect(r.cuerpo).toMatchObject({ cosmeticos: ['escudo-premium-2'], saldo: 50 });
    const mov = await bd.db.execute<{ importe: number }>(sql`select importe from movimientos_fragmentos where usuario_id = ${u.id} and motivo = 'compra_cosmetico'`);
    expect(mov.rows).toEqual([{ importe: -250 }]);
    expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 50, suma: 50 });
    const aspecto = await peticion(srv.url, '/api/perfil/aspecto', { metodo: 'PUT', cookie: u.cookie, cuerpo: { escudo: 'escudo-premium-2' } });
    expect(aspecto.estado).toBe(200);
  });

  it('con euros (simulado): sin cargo de fragmentos', async () => {
    const u = await crearRegistradoConColeccion(srv);
    const idCompra = randomUUID();
    expect((await comprar(u, 'sobre-cubismo', 'eur', idCompra)).cuerpo).toMatchObject({ cosmeticos: ['sobre-cubismo'], saldo: 0 });
    const c = await bd.db.execute(sql`select simulada, importe, producto_tipo from compras where id = ${idCompra}`);
    expect(c.rows).toEqual([{ simulada: true, importe: 50, producto_tipo: 'cosmetico' }]);
  });

  it('el mismo idCompra repetido y en paralelo: misma respuesta y un solo cargo (SC-006)', async () => {
    const u = await crearRegistradoConColeccion(srv);
    await fijarSaldo(bd.db, u.id, 1000);
    const idCompra = randomUUID();
    const todas = await Promise.all(Array.from({ length: 10 }, () => comprar(u, 'escudo-premium-3', 'fragmentos', idCompra)));
    todas.push(await comprar(u, 'escudo-premium-3', 'fragmentos', idCompra));
    expect(todas.every((r) => r.estado === 200 && r.cuerpo.saldo === 750)).toBe(true);
    expect(await poseidos(u)).toEqual(['escudo-premium-3']);
    expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 750, suma: 750 });
  });

  it('errores: no encontrado, gratuito, ya poseído, saldo insuficiente, idCompra reutilizado e invitado', async () => {
    const u = await crearRegistradoConColeccion(srv);
    const error = async (p: Promise<{ estado: number; cuerpo: any }>) => {
      const r = await p;
      return [r.estado, r.cuerpo.error?.codigo, r.cuerpo.error?.detalles];
    };
    expect((await error(comprar(u, 'no-existe', 'eur'))).slice(0, 2)).toEqual([404, 'PRODUCTO_NO_ENCONTRADO']);
    expect((await error(comprar(u, 'sobre-original', 'eur'))).slice(0, 2)).toEqual([422, 'COSMETICO_GRATUITO']);
    expect(await error(comprar(u, 'escudo-premium-4', 'fragmentos'))).toEqual([422, 'SALDO_INSUFICIENTE', { saldo: 0, precio: 250, faltan: 250 }]);
    const id = randomUUID();
    expect((await comprar(u, 'escudo-premium-4', 'eur', id)).estado).toBe(200);
    expect((await error(comprar(u, 'escudo-premium-4', 'eur'))).slice(0, 2)).toEqual([409, 'COSMETICO_POSEIDO']);
    expect((await error(comprar(u, 'escudo-premium-5', 'eur', id))).slice(0, 2)).toEqual([409, 'ID_COMPRA_REUTILIZADO']);
    const g = await crearInvitado(srv.url);
    expect((await error(comprar(g, 'escudo-premium-5', 'eur'))).slice(0, 2)).toEqual([403, 'SOLO_REGISTRADOS']);
  });

  it('un retirado no se vende (404) y solo lo ve quien lo tiene', async () => {
    const u = await crearRegistradoConColeccion(srv);
    expect((await comprar(u, 'escudo-premium-6', 'eur')).estado).toBe(200);
    await bd.db.execute(sql`update cosmeticos set activo = false where id in ('escudo-premium-6', 'escudo-premium-7')`);
    await srv.cerrar();
    srv = await iniciarServidorPruebas(bd);
    try {
      expect((await comprar(u, 'escudo-premium-7', 'eur')).estado).toBe(404);
      const ids = (c: any) => c.cuerpo.cosmeticos.map((x: any) => x.id);
      expect(ids(await catalogo(u))).toContain('escudo-premium-6');
      expect(ids(await catalogo(u))).not.toContain('escudo-premium-7');
      expect(ids(await catalogo())).not.toContain('escudo-premium-6');
      // Lo sigue pudiendo elegir quien lo tiene (FR-009).
      expect((await peticion(srv.url, '/api/perfil/aspecto', { metodo: 'PUT', cookie: u.cookie, cuerpo: { escudo: 'escudo-premium-6' } })).estado).toBe(200);
    } finally {
      await bd.db.execute(sql`update cosmeticos set activo = true`);
    }
  });

  it('pack: 5 filas; con alguno ya poseído, 409 PACK_CON_POSEIDOS con la lista', async () => {
    const u = await crearRegistradoConColeccion(srv);
    const r = await comprarPack(u, 'pack-escudos-2');
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    expect(r.cuerpo.cosmeticos).toHaveLength(5);
    expect(await poseidos(u)).toHaveLength(5);
    expect((await catalogo(u)).cuerpo.packs.find((p: any) => p.id === 'pack-escudos-2').disponible).toBe(false);
    expect((await comprar(u, 'escudo-premium-11', 'eur')).estado).toBe(200);
    const otro = await comprarPack(u, 'pack-escudos-3');
    expect(otro.estado).toBe(409);
    expect(otro.cuerpo.error).toMatchObject({ codigo: 'PACK_CON_POSEIDOS', detalles: { poseidos: ['escudo-premium-11'] } });
    const c = await bd.db.execute(sql`select importe, moneda from compras where producto_tipo = 'pack_cosmeticos' and usuario_id = ${u.id}`);
    expect(c.rows).toEqual([{ importe: 99, moneda: 'eur' }]);
  });

  it('ninguna compra de cosméticos cambia cartas, colecciones ni partidas (FR-016)', async () => {
    const u = await crearRegistradoConColeccion(srv);
    const contar = async () =>
      (
        await bd.db.execute(
          sql`select (select count(*)::int from cartas_usuario where usuario_id = ${u.id}) as cartas,
                     (select count(*)::int from colecciones_usuario where usuario_id = ${u.id}) as colecciones,
                     (select count(*)::int from participantes where usuario_id = ${u.id}) as partidas`,
        )
      ).rows[0];
    const antes = await contar();
    await comprar(u, 'sobre-2', 'eur');
    await comprarPack(u, 'pack-sobres-6');
    expect(await contar()).toEqual(antes);
  });
});
