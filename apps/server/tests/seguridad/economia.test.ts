/**
 * Ataques a la tienda (spec 017, T063, FR-026 a FR-028, SC-006), con el pago en euros cerrado como en producción.
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { iniciarServidorAtaque, peticionProduccion as p, registrarProduccion, type ServidorAtaque } from './ayudas';

describe('tienda y economía', () => {
  let bd: BdPruebas;
  let s: ServidorAtaque;

  const dar = (usuarioId: string, fragmentos: number) => s.gestor.servicios.economia.recompensarTorneo(usuarioId, randomUUID(), fragmentos);
  const saldo = async (id: string) => (await s.gestor.servicios.economia.leerSaldo(id)).saldo;
  const movimientos = async (id: string) =>
    (await bd.db.execute<{ n: number }>(sql`select coalesce(sum(importe), 0)::int as n from movimientos_fragmentos where usuario_id = ${id}`)).rows[0]!.n;
  const cosmeticoVendible = async () => {
    const { cuerpo } = await p(s.url, '/api/cosmeticos');
    return { c: cuerpo.cosmeticos.find((x: any) => !x.gratuito && x.vendible && x.precioCentimos && x.precioFragmentos), pack: cuerpo.packs[0] };
  };

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    s = await iniciarServidorAtaque(bd, { produccion: true });
  });
  beforeEach(() => bd.limpiar());
  afterAll(async () => {
    await s.cerrar();
    await bd.detener();
  });

  it('SEG-002: comprar en euros un cosmético, un pack y el pase sin pagar', async () => {
    const u = await registrarProduccion(s.url);
    const { c, pack } = await cosmeticoVendible();
    const intentos: [string, unknown][] = [
      [`/api/tienda/cosmeticos/${c.id}/comprar`, { idCompra: randomUUID(), moneda: 'eur' }],
      [`/api/tienda/packs/${pack.id}/comprar`, { idCompra: randomUUID() }],
      ['/api/tienda/pase-premium', { idCompra: randomUUID(), moneda: 'eur' }],
    ];
    for (const [ruta, cuerpo] of intentos) {
      const r = await p(s.url, ruta, { cookie: u.cookie, cuerpo });
      expect(r.estado, ruta).toBe(409);
      expect(r.cuerpo.error.codigo).toBe('PAGO_NO_DISPONIBLE');
    }
    const n = async (tabla: string) => (await bd.db.execute<{ n: number }>(sql.raw(`select count(*)::int as n from ${tabla}`))).rows[0]!.n;
    expect(await n('compras')).toBe(0);
    expect(await n('pases_premium')).toBe(0);
    expect(await n('cosmeticos_usuario')).toBe(0);
  });

  it('SEG-002: la tienda indica que el pago en euros no está disponible', async () => {
    const u = await registrarProduccion(s.url);
    expect((await p(s.url, '/api/tienda', { cookie: u.cookie })).cuerpo.pagoEuros).toBe(false);
    expect((await p(s.url, '/api/cosmeticos', { cookie: u.cookie })).cuerpo.pagoEuros).toBe(false);
  });

  it('SEG-002: las compras con fragmentos siguen funcionando', async () => {
    const u = await registrarProduccion(s.url);
    const { c } = await cosmeticoVendible();
    await s.gestor.servicios.economia.asegurarColeccion(u.id);
    await dar(u.id, c.precioFragmentos);
    const r = await p(s.url, `/api/tienda/cosmeticos/${c.id}/comprar`, { cookie: u.cookie, cuerpo: { idCompra: randomUUID(), moneda: 'fragmentos' } });
    expect(r.estado).toBe(200);
    expect(await saldo(u.id)).toBe(0);
  });

  it('SEG-000: lanzar 50 compras iguales a la vez', async () => {
    const u = await registrarProduccion(s.url);
    const { c } = await cosmeticoVendible();
    await s.gestor.servicios.economia.asegurarColeccion(u.id);
    await dar(u.id, c.precioFragmentos * 3);
    const idCompra = randomUUID();
    const r = await Promise.all(
      Array.from({ length: 50 }, () => p(s.url, `/api/tienda/cosmeticos/${c.id}/comprar`, { cookie: u.cookie, cuerpo: { idCompra, moneda: 'fragmentos' } })),
    );
    expect(r.every((x) => x.estado === 200)).toBe(true);
    expect(await saldo(u.id)).toBe(c.precioFragmentos * 2);
    expect(await movimientos(u.id)).toBe(await saldo(u.id));
  });

  it('SEG-000: lanzar 50 compras distintas sin saldo para todas', async () => {
    const u = await registrarProduccion(s.url);
    await s.gestor.servicios.economia.asegurarColeccion(u.id);
    const precio = (await p(s.url, '/api/tienda', { cookie: u.cookie })).cuerpo.pasePremium.precioFragmentos;
    await dar(u.id, precio * 3);
    const r = await Promise.all(
      Array.from({ length: 50 }, () => p(s.url, '/api/tienda/pase-premium', { cookie: u.cookie, cuerpo: { idCompra: randomUUID(), moneda: 'fragmentos' } })),
    );
    expect(r.filter((x) => x.estado === 200)).toHaveLength(3);
    expect(await saldo(u.id)).toBe(0);
    expect(await movimientos(u.id)).toBe(0);
  });

  it('SEG-000: reutilizar el idCompra de otra cuenta', async () => {
    const a = await registrarProduccion(s.url);
    const b = await registrarProduccion(s.url);
    const { c } = await cosmeticoVendible();
    for (const u of [a, b]) {
      await s.gestor.servicios.economia.asegurarColeccion(u.id);
      await dar(u.id, c.precioFragmentos);
    }
    const idCompra = randomUUID();
    expect((await p(s.url, `/api/tienda/cosmeticos/${c.id}/comprar`, { cookie: a.cookie, cuerpo: { idCompra, moneda: 'fragmentos' } })).estado).toBe(200);
    const r = await p(s.url, `/api/tienda/cosmeticos/${c.id}/comprar`, { cookie: b.cookie, cuerpo: { idCompra, moneda: 'fragmentos' } });
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error.codigo).toBe('ID_COMPRA_REUTILIZADO');
    expect(await saldo(b.id)).toBe(c.precioFragmentos);
  });

  it('SEG-000: manipular el precio o la moneda', async () => {
    const u = await registrarProduccion(s.url);
    const { c } = await cosmeticoVendible();
    await s.gestor.servicios.economia.asegurarColeccion(u.id);
    await dar(u.id, c.precioFragmentos);
    const ruta = `/api/tienda/cosmeticos/${c.id}/comprar`;
    expect((await p(s.url, ruta, { cookie: u.cookie, cuerpo: { idCompra: randomUUID(), moneda: 'dolares' } })).estado).toBe(400);
    const r = await p(s.url, ruta, { cookie: u.cookie, cuerpo: { idCompra: randomUUID(), moneda: 'fragmentos', importe: 0, precioFragmentos: 0 } });
    if (r.estado === 200) expect(await saldo(u.id)).toBe(0);
    else expect(await saldo(u.id)).toBe(c.precioFragmentos);
  });
});
