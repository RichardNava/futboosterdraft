/**
 * Tienda (spec 006, US4, US5 y US7; T065, T075, T076, T094): compras idempotentes, saldo nunca negativo, colecciones
 * con duplicados y paquetes de fragmentos (SC-006, SC-007).
 */
import { randomUUID } from 'node:crypto';
import { NIVELES } from '@fbd/domain';
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

    it('en euros: entrega sin cargo y la compra queda simulada', async () => {
      const u = await crearRegistradoConColeccion(srv);
      const idCompra = randomUUID();
      const r = await comprarSobre(u, 'eur', idCompra);
      expect(r.estado).toBe(200);
      expect(r.cuerpo.saldo).toBe(0);
      const c = await bd.db.execute<{ simulada: boolean; importe: number }>(sql`select simulada, importe from compras where id = ${idCompra}`);
      expect(c.rows).toEqual([{ simulada: true, importe: 99 }]);
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

    it('idCompra reutilizado con otra moneda: 409 ID_COMPRA_REUTILIZADO; sin UUID: 400 CUERPO_INVALIDO', async () => {
      const u = await crearRegistradoConColeccion(srv);
      const idCompra = randomUUID();
      expect((await comprarSobre(u, 'eur', idCompra)).estado).toBe(200);
      const otra = await comprarSobre(u, 'fragmentos', idCompra);
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
      const r = await comprarSobre(u, 'eur');
      expect(r.estado).toBe(409);
      expect(r.cuerpo.error).toMatchObject({ codigo: 'SOBRE_NO_DISPONIBLE', detalles: { restantes: 5 } });
      const t = (await tienda(u)).cuerpo;
      expect(t.sobre.disponible).toBe(false);
      expect(t.sobre.motivoNoDisponible).toBeTruthy();
    });
  });

  describe('colecciones (US5)', () => {
    it('Top Argentinos con 3 ya poseídas: el resto activas y 175 fragmentos por duplicados; repetir devuelve lo mismo', async () => {
      const u = await crearRegistradoConColeccion(srv);
      const idCompra = randomUUID();
      const r = await comprarColeccion(u, 'top-argentinos', idCompra);
      expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
      // Las 3 de Core (Superclase, Épico y GOAT) ya las tiene: 25 + 50 + 100.
      expect(r.cuerpo.fragmentos).toBe(175);
      expect(r.cuerpo.duplicados.map((d: any) => d.fragmentos).sort((a: number, b: number) => a - b)).toEqual([25, 50, 100]);
      expect(r.cuerpo.cartas).toHaveLength(39);
      const nuevas = (await cartasDe(u)).filter((c) => c.via === 'coleccion');
      expect(nuevas).toHaveLength(39);
      expect(nuevas.every((c) => c.activa)).toBe(true);
      expect((await comprarColeccion(u, 'top-argentinos', idCompra)).cuerpo).toEqual(r.cuerpo);
      const otra = await comprarColeccion(u, 'top-argentinos');
      expect(otra.estado).toBe(409);
      expect(otra.cuerpo.error.codigo).toBe('COLECCION_ADQUIRIDA');
      expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 175, suma: 175 });
    });

    it('core o un id inexistente: 404 PRODUCTO_NO_ENCONTRADO', async () => {
      const u = await crearRegistradoConColeccion(srv);
      expect((await comprarColeccion(u, 'core')).cuerpo.error.codigo).toBe('PRODUCTO_NO_ENCONTRADO');
      expect((await comprarColeccion(u, 'no-existe')).estado).toBe(404);
    });

    it('comprar después All Stars da fragmentos por las 6 compartidas; la tienda informa de cada colección', async () => {
      const u = await crearRegistradoConColeccion(srv);
      expect((await comprarColeccion(u, 'top-argentinos')).estado).toBe(200);
      const antes = (await tienda(u)).cuerpo;
      const allStars = antes.colecciones.find((c: any) => c.id === 'all-stars');
      expect(allStars).toMatchObject({ numCartas: 45, adquirida: false, soloFragmentos: null, precioCentimos: 499 });
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
      await comprarPaquete(u, 'fragmentos-5500');
      await comprarColeccion(u, 'top-argentinos');
      for (let i = 0; i < 3; i++) await comprarSobre(u, i % 2 ? 'eur' : 'fragmentos');
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
        expect(sv.saldo).toBe(175 + ({ Superclase: 25, Epico: 50, Legendario: 75, GOAT: 100 } as Record<string, number>)[await nivelDe(301)]!);
      } finally {
        await cargarCatalogo(bd.db, lote.jugadores, lote.colecciones);
      }
    });
  });

  describe('paquetes de fragmentos (US7)', () => {
    it('suma 1.000, registra compra_fragmentos simulada y no suma dos veces con el mismo idCompra', async () => {
      const u = await crearRegistradoConColeccion(srv);
      const idCompra = randomUUID();
      const r = await comprarPaquete(u, 'fragmentos-1000', idCompra);
      expect(r.estado).toBe(200);
      expect(r.cuerpo).toMatchObject({ cartas: [], fragmentos: 1000, saldo: 1000 });
      expect((await comprarPaquete(u, 'fragmentos-1000', idCompra)).cuerpo.saldo).toBe(1000);
      const c = await bd.db.execute<{ simulada: boolean }>(sql`select simulada from compras where id = ${idCompra}`);
      expect(c.rows).toEqual([{ simulada: true }]);
      expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 1000, suma: 1000 });
      expect((await tienda(u)).cuerpo.paquetes.map((p: any) => p.id)).toEqual(['fragmentos-1000', 'fragmentos-5500', 'fragmentos-12000']);
    });

    it('un paquete inexistente da 404 PRODUCTO_NO_ENCONTRADO', async () => {
      const u = await crearRegistradoConColeccion(srv);
      const r = await comprarPaquete(u, 'fragmentos-1');
      expect(r.estado).toBe(404);
      expect(r.cuerpo.error.codigo).toBe('PRODUCTO_NO_ENCONTRADO');
    });
  });
});
