/**
 * Pase premium (spec 013, FR-034 a FR-036): compra idempotente, suma de 30 días, estado en la tienda y CLI de cortesía.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearRegistradoConColeccion, fijarSaldo } from '../helpers/economia';
import { crearInvitado, peticion } from '../helpers/usuarios';

const DIA = 86_400_000;

describe('pase premium', () => {
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

  it('compra con fragmentos: 30 días, −2.990 y fila en compras; otra compra suma 30 días; mismo idCompra, una sola', async () => {
    const u = await crearRegistradoConColeccion(srv);
    await fijarSaldo(bd.db, u.id, 7000);
    const ahora = srv.reloj.ahora();
    const idCompra = randomUUID();
    const comprar = (id: string) => peticion(srv.url, '/api/tienda/pase-premium', { cookie: u.cookie, cuerpo: { moneda: 'fragmentos', idCompra: id } });

    const r = await comprar(idCompra);
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    expect(r.cuerpo).toMatchObject({ idCompra, saldo: 4010, premium: { activo: true, cortesia: false } });
    expect(new Date(r.cuerpo.premium.fin).getTime()).toBe(ahora + 30 * DIA);

    const repetida = await comprar(idCompra);
    expect(repetida.cuerpo.saldo).toBe(4010);
    const segunda = await comprar(randomUUID());
    expect(segunda.cuerpo.saldo).toBe(1020);
    expect(new Date(segunda.cuerpo.premium.fin).getTime()).toBe(ahora + 60 * DIA);

    const filas = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from compras where usuario_id = ${u.id} and producto_tipo = 'pase_premium'`);
    expect(filas.rows[0]!.n).toBe(2);
    expect((await peticion(srv.url, '/api/premium', { cookie: u.cookie })).cuerpo).toEqual(segunda.cuerpo.premium);
    const tienda = await peticion(srv.url, '/api/tienda', { cookie: u.cookie });
    expect(tienda.cuerpo.pasePremium).toMatchObject({ precioFragmentos: 2990, precioCentimos: 299, dias: 30, estado: segunda.cuerpo.premium });
  });

  it('caducado: la compra cuenta desde ahora', async () => {
    const u = await crearRegistradoConColeccion(srv);
    await fijarSaldo(bd.db, u.id, 3000);
    await bd.db.execute(sql`insert into pases_premium (usuario_id, fin) values (${u.id}, ${new Date(srv.reloj.ahora() - DIA)})`);
    const r = await peticion(srv.url, '/api/tienda/pase-premium', { cookie: u.cookie, cuerpo: { moneda: 'fragmentos', idCompra: randomUUID() } });
    expect(new Date(r.cuerpo.premium.fin).getTime()).toBe(srv.reloj.ahora() + 30 * DIA);
  });

  it('invitado ⇒ rechazado; sin pase, la tienda no muestra estado', async () => {
    const i = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/tienda/pase-premium', { cookie: i.cookie, cuerpo: { moneda: 'fragmentos', idCompra: randomUUID() } });
    expect(r.estado).toBeGreaterThanOrEqual(400);
    const u = await crearRegistradoConColeccion(srv);
    expect((await peticion(srv.url, '/api/tienda', { cookie: u.cookie })).cuerpo.pasePremium.estado).toBeNull();
  });

  it('el CLI activa y desactiva el premium de cortesía', async () => {
    const u = await crearRegistradoConColeccion(srv);
    const [{ email }] = (await bd.db.execute<{ email: string }>(sql`select email from usuarios where id = ${u.id}`)).rows as [{ email: string }];
    const cli = (valor: string) =>
      execFileSync(process.execPath, ['--import', 'tsx', 'src/premium/cli.ts', email, valor], {
        cwd: fileURLToPath(new URL('../../', import.meta.url)),
        env: { ...process.env, DATABASE_URL: bd.contenedor.getConnectionUri() },
      });
    cli('si');
    expect((await peticion(srv.url, '/api/premium', { cookie: u.cookie })).cuerpo).toEqual({ activo: true, cortesia: true, fin: null });
    cli('no');
    expect((await peticion(srv.url, '/api/premium', { cookie: u.cookie })).cuerpo).toEqual({ activo: false, cortesia: false, fin: null });
  });
});
