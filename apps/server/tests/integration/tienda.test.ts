/**
 * Tienda (spec 006, US4, US5 y US7; T065, T075, T076, T094): compras idempotentes, saldo nunca negativo, colecciones
 * con duplicados (SC-006, SC-007). Spec 011 (FR-002, T020): las cartas solo se pagan con fragmentos y los paquetes de
 * fragmentos se retiran.
 */
import { randomUUID } from 'node:crypto';
import { NIVELES, VENTA_CARTAS_CON_DINERO } from '@fbd/domain';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cargarCatalogo, FICHEROS_POR_DEFECTO, leerLote } from '../../src/persistencia/seed';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearRegistradoConColeccion, darCartas, fijarSaldo, saldoYSuma } from '../helpers/economia';
import { peticion, type UsuarioPrueba } from '../helpers/usuarios';

const RAIZ = new URL('../../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

describe('tienda (spec 006)', () => {
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

  const tienda = (u: UsuarioPrueba) => peticion(srv.url, '/api/tienda', { cookie: u.cookie });
  const comprarSobre = (u: UsuarioPrueba, moneda: string, idCompra: string = randomUUID()) =>
    peticion(srv.url, '/api/tienda/sobre/comprar', { cookie: u.cookie, cuerpo: { idCompra, moneda } });
  const comprarColeccion = (u: UsuarioPrueba, id: string, idCompra: string = randomUUID()) =>
    peticion(srv.url, `/api/tienda/colecciones/${id}/comprar`, { cookie: u.cookie, cuerpo: { idCompra } });
  const comprarPaquete = (u: UsuarioPrueba, id: string, idCompra: string = randomUUID()) =>
    peticion(srv.url, `/api/tienda/fragmentos/${id}/comprar`, { cookie: u.cookie, cuerpo: { idCompra } });
  const cartasDe = async (u: UsuarioPrueba) =>
    (await bd.db.execute<{ jugador_id: number; via: string; activa: boolean }>(sql`select jugador_id, via, activa from cartas_usuario where usuario_id = ${u.id}`)).rows;
  const nivelDe = async (id: number): Promise<string> => (await peticion(srv.url, `/api/catalogo/jugadores/${id}`)).cuerpo.nivel;

  describe('sobre (US4)', () => {
    it('con 1.000 fragmentos: cobra 1.000 y entrega 8 cartas nuevas y activas', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 1000);
      const r = await comprarSobre(u, 'fragmentos');
      expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
      expect(r.cuerpo.saldo).toBe(0);
      expect(r.cuerpo.cartas).toHaveLength(8);
      const ids = r.cuerpo.cartas.map((c: any) => c.id);
      expect(new Set(ids).size).toBe(8);
      expect(ids.every((id: number) => id > 300)).toBe(true);
      const mias = (await cartasDe(u)).filter((c) => ids.includes(c.jugador_id));
      expect(mias.every((c) => c.via === 'sobre' && c.activa)).toBe(true);
      const mov = await bd.db.execute<{ importe: number; motivo: string }>(sql`select importe, motivo from movimientos_fragmentos where usuario_id = ${u.id} and motivo = 'compra_sobre'`);
      expect(mov.rows).toEqual([{ importe: -1000, motivo: 'compra_sobre' }]);
      expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 0, suma: 0 });
    });

    it('saldo insuficiente: 422 SALDO_INSUFICIENTE con saldo, precio y faltan', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 400);
      const r = await comprarSobre(u, 'fragmentos');
      expect(r.estado).toBe(422);
      expect(r.cuerpo.error).toMatchObject({ codigo: 'SALDO_INSUFICIENTE', detalles: { saldo: 400, precio: 1000, faltan: 600 } });
      expect((await tienda(u)).cuerpo.sobre.faltan).toBe(600);
    });

    it('en euros: 422 MONEDA_NO_ADMITIDA y no se guarda la compra (spec 011, FR-002)', async () => {
      const u = await crearRegistradoConColeccion(srv);
      const idCompra = randomUUID();
      const r = await comprarSobre(u, 'eur', idCompra);
      expect(r.estado).toBe(422);
      expect(r.cuerpo.error.codigo).toBe('MONEDA_NO_ADMITIDA');
      expect((await bd.db.execute(sql`select 1 from compras where id = ${idCompra}`)).rows).toEqual([]);
    });

    it('50 repeticiones del mismo idCompra (secuenciales y concurrentes) cobran y entregan una vez (SC-007)', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 5000);
      const idCompra = randomUUID();
      const concurrentes = await Promise.all(Array.from({ length: 25 }, () => comprarSobre(u, 'fragmentos', idCompra)));
      const secuenciales = [];
      for (let i = 0; i < 25; i++) secuenciales.push(await comprarSobre(u, 'fragmentos', idCompra));
      const todas = [...concurrentes, ...secuenciales];
      expect(todas.every((r) => r.estado === 200)).toBe(true);
      const primeras = JSON.stringify(todas[0]!.cuerpo.cartas);
      expect(todas.every((r) => JSON.stringify(r.cuerpo.cartas) === primeras)).toBe(true);
      expect((await cartasDe(u)).filter((c) => c.via === 'sobre')).toHaveLength(8);
      expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 4000, suma: 4000 });
    });

    it('dos compras distintas a la vez con saldo para una sola: una falla y el saldo no es negativo', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 1000);
      const [a, b] = await Promise.all([comprarSobre(u, 'fragmentos'), comprarSobre(u, 'fragmentos')]);
      expect([a.estado, b.estado].sort()).toEqual([200, 422]);
      expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 0, suma: 0 });
    });

    it('idCompra reutilizado con otro producto: 409 ID_COMPRA_REUTILIZADO; sin UUID: 400 CUERPO_INVALIDO', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 6000);
      const idCompra = randomUUID();
      expect((await comprarSobre(u, 'fragmentos', idCompra)).estado).toBe(200);
      const otra = await comprarColeccion(u, 'top-argentinos', idCompra);
      expect(otra.estado).toBe(409);
      expect(otra.cuerpo.error.codigo).toBe('ID_COMPRA_REUTILIZADO');
      const mal = await comprarSobre(u, 'fragmentos', 'no-es-un-uuid');
      expect(mal.estado).toBe(400);
      expect(mal.cuerpo.error.codigo).toBe('CUERPO_INVALIDO');
      expect((await comprarSobre(u, 'dolares')).cuerpo.error.codigo).toBe('CUERPO_INVALIDO');
    });

    it('con menos de 8 cartas por conseguir: 409 SOBRE_NO_DISPONIBLE y la tienda lo marca no disponible', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await darCartas(bd.db, u.id, Array.from({ length: 70 }, (_, i) => 301 + i));
      const r = await comprarSobre(u, 'fragmentos');
      expect(r.estado).toBe(409);
      expect(r.cuerpo.error).toMatchObject({ codigo: 'SOBRE_NO_DISPONIBLE', detalles: { restantes: 5 } });
      const t = (await tienda(u)).cuerpo;
      expect(t.sobre.disponible).toBe(false);
      expect(t.sobre.motivoNoDisponible).toBeTruthy();
    });
  });

  describe('colecciones (US5)', () => {
    it('Top Argentinos con 3 ya poseídas: cobra 4.000, el resto activas y 150 fragmentos por duplicados; repetir devuelve lo mismo', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 4000);
      const idCompra = randomUUID();
      const r = await comprarColeccion(u, 'top-argentinos', idCompra);
      expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
      // Las 3 de Core (Guido Rodríguez Superclase, Lisandro Martínez Crack y Dibu Martínez Legendario) ya las tiene: 25 + 50 + 75.
      expect(r.cuerpo.fragmentos).toBe(150);
      expect(r.cuerpo.duplicados.map((d: any) => d.fragmentos).sort((a: number, b: number) => a - b)).toEqual([25, 50, 75]);
      expect(r.cuerpo.cartas).toHaveLength(39);
      const nuevas = (await cartasDe(u)).filter((c) => c.via === 'coleccion');
      expect(nuevas).toHaveLength(39);
      expect(nuevas.every((c) => c.activa)).toBe(true);
      expect((await comprarColeccion(u, 'top-argentinos', idCompra)).cuerpo).toEqual(r.cuerpo);
      const otra = await comprarColeccion(u, 'top-argentinos');
      expect(otra.estado).toBe(409);
      expect(otra.cuerpo.error.codigo).toBe('COLECCION_ADQUIRIDA');
      expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 150, suma: 150 });
      const mov = await bd.db.execute<{ importe: number }>(sql`select importe from movimientos_fragmentos where usuario_id = ${u.id} and motivo = 'compra_coleccion'`);
      expect(mov.rows).toEqual([{ importe: -4000 }]);
    });

    it('sin saldo suficiente: 422 SALDO_INSUFICIENTE y no entrega nada (spec 011, FR-002)', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 1000);
      const r = await comprarColeccion(u, 'top-argentinos');
      expect(r.estado).toBe(422);
      expect(r.cuerpo.error).toMatchObject({ codigo: 'SALDO_INSUFICIENTE', detalles: { saldo: 1000, precio: 4000, faltan: 3000 } });
      expect((await cartasDe(u)).filter((c) => c.via === 'coleccion')).toEqual([]);
    });

    it('core o un id inexistente: 404 PRODUCTO_NO_ENCONTRADO', async () => {
      const u = await crearRegistradoConColeccion(srv);
      expect((await comprarColeccion(u, 'core')).cuerpo.error.codigo).toBe('PRODUCTO_NO_ENCONTRADO');
      expect((await comprarColeccion(u, 'no-existe')).estado).toBe(404);
    });

    it('comprar después All Stars da fragmentos por las 6 compartidas; la tienda informa de cada colección', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 9000);
      expect((await comprarColeccion(u, 'top-argentinos')).estado).toBe(200);
      const antes = (await tienda(u)).cuerpo;
      const allStars = antes.colecciones.find((c: any) => c.id === 'all-stars');
      expect(allStars).toMatchObject({ numCartas: 45, adquirida: false, soloFragmentos: null, precioFragmentos: 5000 });
      expect(allStars.muestra).toHaveLength(3);
      expect(NIVELES.reduce((a, n) => a + allStars.porNivel[n], 0)).toBe(45);
      expect(allStars.poseidas).toBe(3 + 6);
      expect(antes.colecciones.find((c: any) => c.id === 'top-argentinos')).toMatchObject({ adquirida: true, poseidas: 42, soloFragmentos: expect.any(Number) });
      const r = await comprarColeccion(u, 'all-stars');
      expect(r.cuerpo.duplicados).toHaveLength(9);
      const compartidas = r.cuerpo.duplicados.filter((d: any) => d.id > 300);
      expect(compartidas).toHaveLength(6);
    });

    it('tras compras, desfragmentaciones y recompensas al azar, la suma del historial es el saldo (SC-006)', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 9500);
      await comprarColeccion(u, 'top-argentinos');
      for (let i = 0; i < 3; i++) await comprarSobre(u, 'fragmentos');
      await srv.gestor.servicios.economia.recompensarTorneo(u.id, randomUUID(), 10);
      const sobrantes = (await cartasDe(u)).filter((c) => c.via !== 'registro').slice(0, 6);
      for (const c of sobrantes) await peticion(srv.url, `/api/coleccion/cartas/${c.jugador_id}/desfragmentar`, { metodo: 'POST', cookie: u.cookie });
      const { saldo, suma } = await saldoYSuma(bd.db, u.id);
      expect(saldo).toBe(suma);
      expect(saldo).toBeGreaterThan(0);
    });

    it('re-sembrar con una carta añadida a una colección ya vendida la entrega al comprador (data-model §4.3)', async () => {
      const u = await crearRegistradoConColeccion(srv);
      const v = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 4000);
      await fijarSaldo(bd.db, v.id, 4000);
      expect((await comprarColeccion(u, 'top-argentinos')).estado).toBe(200);
      expect((await comprarColeccion(v, 'top-argentinos')).estado).toBe(200);
      // v ya tiene la 301 (no está en Top Argentinos); u no.
      await darCartas(bd.db, v.id, [301]);
      const lote = leerLote(RAIZ, FICHEROS_POR_DEFECTO.cartas, FICHEROS_POR_DEFECTO.colecciones);
      const ampliado = lote.colecciones.map((c) => (c.id === 'top-argentinos' ? { ...c, cartas: [...c.cartas, { id: 301, version: 'normal' as const }] } : c));
      try {
        const entregas = await cargarCatalogo(bd.db, lote.jugadores, ampliado);
        expect(entregas).toEqual(
          expect.arrayContaining([
            { usuarioId: u.id, coleccionId: 'top-argentinos', cartas: [301], duplicados: [] },
            { usuarioId: v.id, coleccionId: 'top-argentinos', cartas: [], duplicados: [301] },
          ]),
        );
        expect((await cartasDe(u)).find((c) => c.jugador_id === 301)).toMatchObject({ via: 'coleccion', activa: true });
        const sv = await saldoYSuma(bd.db, v.id);
        expect(sv.saldo).toBe(sv.suma);
        expect(sv.saldo).toBe(150 + ({ Superclase: 25, Crack: 50, Legendario: 75, GOAT: 100 } as Record<string, number>)[await nivelDe(301)]!);
      } finally {
        await cargarCatalogo(bd.db, lote.jugadores, lote.colecciones);
      }
    });
  });

  describe('paquetes de fragmentos retirados (spec 011, FR-002)', () => {
    it('comprar un paquete da 410 PRODUCTO_RETIRADO y la tienda no ofrece ninguno', async () => {
      const u = await crearRegistradoConColeccion(srv);
      for (const id of ['fragmentos-1000', 'fragmentos-1']) {
        const r = await comprarPaquete(u, id);
        expect(r.estado).toBe(410);
        expect(r.cuerpo.error.codigo).toBe('PRODUCTO_RETIRADO');
      }
      expect((await tienda(u)).cuerpo.paquetes).toEqual([]);
      expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 0, suma: 0 });
    });

    it('las compras antiguas de fragmentos siguen en el historial', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await bd.db.execute(sql`update saldos_fragmentos set saldo = 1000 where usuario_id = ${u.id}`);
      await bd.db.execute(
        sql`insert into movimientos_fragmentos (usuario_id, importe, motivo, referencia) values (${u.id}, 1000, 'compra_fragmentos', ${randomUUID()})`,
      );
      const r = await peticion(srv.url, '/api/fragmentos/movimientos', { cookie: u.cookie });
      expect(r.cuerpo.movimientos).toEqual([expect.objectContaining({ importe: 1000, motivo: 'compra_fragmentos', descripcion: 'Compra de fragmentos' })]);
    });

    it('ninguna ruta de cartas acepta euros (VENTA_CARTAS_CON_DINERO = false)', async () => {
      expect(VENTA_CARTAS_CON_DINERO).toBe(false);
      const u = await crearRegistradoConColeccion(srv);
      const sobre = await comprarSobre(u, 'eur');
      const coleccion = await peticion(srv.url, '/api/tienda/colecciones/all-stars/comprar', {
        cookie: u.cookie,
        cuerpo: { idCompra: randomUUID(), moneda: 'eur' },
      });
      const paquete = await comprarPaquete(u, 'fragmentos-1000');
      expect([sobre.estado, coleccion.estado, paquete.estado]).toEqual([422, 422, 410]);
      expect(coleccion.cuerpo.error.codigo).toBe('SALDO_INSUFICIENTE');
      const enEuros = await bd.db.execute(sql`select 1 from compras where usuario_id = ${u.id} and moneda = 'eur'`);
      expect(enEuros.rows).toEqual([]);
    });
  });
});
