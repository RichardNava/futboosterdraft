/**
 * Tienda (spec 006, US4, US5 y US7; T065, T075, T076, T094): compras idempotentes, saldo nunca negativo, colecciones
 * con duplicados (SC-006, SC-007). Spec 011 (FR-002, T020): las cartas solo se pagan con fragmentos y los paquetes de
 * fragmentos se retiran. Spec 016 (T019, T045): expansiones con detalle, compensación y sobre de regalo, sobre
 * colecciones de pago de pruebas que no dependen del contenido de ninguna expansión (research R16).
 */
import { randomUUID } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { NIVELES, VENTA_CARTAS_CON_DINERO } from '@fbd/domain';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cargarCatalogo } from '../../src/persistencia/seed';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { cartasDePago, crearRegistradoConColeccion, darCartas, fijarSaldo, montarColeccionPago, saldoYSuma, type ColeccionPrueba } from '../helpers/economia';
import { peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('tienda (spec 006)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas;
  /** 24 cartas (6 por nivel), 2400 fragmentos, regala `sobre-28`. */
  let expA: ColeccionPrueba;
  /** 18 cartas propias y las 6 Superclase de A; 3000 fragmentos; sin regalo. */
  let expB: ColeccionPrueba;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    expA = await montarColeccionPago(bd.db, { id: 'exp-a', primerId: 9001, sobreRegalo: 'sobre-28' });
    expB = await montarColeccionPago(bd.db, { id: 'exp-b', primerId: 9101, nuevas: 18, compartidas: expA.ids.slice(18), precio: 3000 });
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
  /** Cartas de A por nivel, en orden de número. */
  const deA = (nivel: 'GOAT' | 'Legendario' | 'Crack' | 'Superclase') => expA.ids.slice(['GOAT', 'Legendario', 'Crack', 'Superclase'].indexOf(nivel) * 6).slice(0, 6);

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
      const pago = new Set(await cartasDePago(bd.db));
      expect(ids.every((id: number) => pago.has(id))).toBe(true);
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
      const otra = await comprarColeccion(u, 'exp-a', idCompra);
      expect(otra.estado).toBe(409);
      expect(otra.cuerpo.error.codigo).toBe('ID_COMPRA_REUTILIZADO');
      const mal = await comprarSobre(u, 'fragmentos', 'no-es-un-uuid');
      expect(mal.estado).toBe(400);
      expect(mal.cuerpo.error.codigo).toBe('CUERPO_INVALIDO');
      expect((await comprarSobre(u, 'dolares')).cuerpo.error.codigo).toBe('CUERPO_INVALIDO');
    });

    it('con menos de 8 cartas por conseguir: 409 SOBRE_NO_DISPONIBLE y la tienda lo marca no disponible', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await darCartas(bd.db, u.id, (await cartasDePago(bd.db)).slice(5));
      const r = await comprarSobre(u, 'fragmentos');
      expect(r.estado).toBe(409);
      expect(r.cuerpo.error).toMatchObject({ codigo: 'SOBRE_NO_DISPONIBLE', detalles: { restantes: 5 } });
      const t = (await tienda(u)).cuerpo;
      expect(t.sobre.disponible).toBe(false);
      expect(t.sobre.motivoNoDisponible).toBeTruthy();
    });
  });

  describe('expansiones (spec 006 US5; spec 016 US2)', () => {
    it.each([
      ['ninguna', 0, 0],
      ['1 GOAT, 2 Crack y 3 Superclase (US2-4)', 6, 400],
      ['todas', 24, 2400],
    ])('con %s poseídas: saldo − precio + compensación, las que faltan nuevas y el sobre de regalo (SC-004)', async (_t, n, compensacion) => {
      const u = await crearRegistradoConColeccion(srv);
      const saldoInicial = 2400;
      await fijarSaldo(bd.db, u.id, saldoInicial);
      const poseidas = n === 6 ? [...deA('GOAT').slice(0, 1), ...deA('Crack').slice(0, 2), ...deA('Superclase').slice(0, 3)] : expA.ids.slice(0, n);
      await darCartas(bd.db, u.id, poseidas);
      const producto = (await tienda(u)).cuerpo.colecciones.find((c: any) => c.id === 'exp-a');
      expect(producto).toMatchObject({ compensacion, poseidas: n, soloFragmentos: n === 24 ? 2400 : null });

      const r = await comprarColeccion(u, 'exp-a');
      expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
      expect(r.cuerpo.fragmentos).toBe(compensacion);
      expect(r.cuerpo.saldo).toBe(saldoInicial - 2400 + compensacion);
      expect(r.cuerpo.cartas).toHaveLength(24 - n);
      expect(r.cuerpo.duplicados).toHaveLength(n);
      expect(r.cuerpo.cosmeticos).toEqual(['sobre-28']);
      const nuevas = (await cartasDe(u)).filter((c) => c.via === 'coleccion');
      expect(nuevas).toHaveLength(24 - n);
      expect(nuevas.every((c) => c.activa)).toBe(true);
      const sobres = await bd.db.execute(sql`select 1 from cosmeticos_usuario where usuario_id = ${u.id} and cosmetico_id = 'sobre-28'`);
      expect(sobres.rows).toHaveLength(1);
      expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: saldoInicial - 2400 + compensacion, suma: saldoInicial - 2400 + compensacion });
      const mov = await bd.db.execute<{ importe: number }>(sql`select importe from movimientos_fragmentos where usuario_id = ${u.id} and motivo = 'compra_coleccion'`);
      expect(mov.rows).toEqual([{ importe: -2400 }]);
      // US2-6: después sale adquirida.
      expect((await tienda(u)).cuerpo.colecciones.find((c: any) => c.id === 'exp-a').adquirida).toBe(true);
    });

    it('el mismo idCompra devuelve el mismo resumen y cobra una vez; otro idCompra da 409 COLECCION_ADQUIRIDA (US2-7)', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 5000);
      const idCompra = randomUUID();
      const [a, b] = await Promise.all([comprarColeccion(u, 'exp-a', idCompra), comprarColeccion(u, 'exp-a', idCompra)]);
      expect(a.cuerpo).toEqual(b.cuerpo);
      expect((await comprarColeccion(u, 'exp-a', idCompra)).cuerpo).toEqual(a.cuerpo);
      const otra = await comprarColeccion(u, 'exp-a');
      expect(otra.estado).toBe(409);
      expect(otra.cuerpo.error.codigo).toBe('COLECCION_ADQUIRIDA');
      expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 2600, suma: 2600 });
    });

    it('un sobre de regalo ya poseído se conserva y la compra no falla (US3-4)', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 2400);
      // Comprado antes de la spec, cuando aún se vendía suelto.
      const previa = randomUUID();
      await bd.db.execute(sql`insert into compras (id, usuario_id, producto_tipo, producto_id, moneda, importe, estado, resultado)
        values (${previa}, ${u.id}, 'cosmetico', 'sobre-28', 'fragmentos', 250, 'completada', '{"cartas":[],"fragmentos":0,"duplicados":[]}'::jsonb)`);
      await bd.db.execute(sql`insert into cosmeticos_usuario (usuario_id, cosmetico_id, compra_id) values (${u.id}, 'sobre-28', ${previa})`);
      expect((await tienda(u)).cuerpo.colecciones.find((c: any) => c.id === 'exp-a').sobreRegalo).toEqual({ id: 'sobre-28', nombre: 'Sobre 28', poseido: true });
      const r = await comprarColeccion(u, 'exp-a');
      expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
      expect(r.cuerpo.cosmeticos).toEqual(['sobre-28']);
      const sobres = await bd.db.execute(sql`select 1 from cosmeticos_usuario where usuario_id = ${u.id} and cosmetico_id = 'sobre-28'`);
      expect(sobres.rows).toHaveLength(1);
    });

    it('sin saldo suficiente: 422 SALDO_INSUFICIENTE con lo que falta y no entrega nada (US2-5)', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 2399);
      const r = await comprarColeccion(u, 'exp-a');
      expect(r.estado).toBe(422);
      expect(r.cuerpo.error).toMatchObject({ codigo: 'SALDO_INSUFICIENTE', detalles: { saldo: 2399, precio: 2400, faltan: 1 } });
      expect((await cartasDe(u)).filter((c) => c.via === 'coleccion')).toEqual([]);
      const sobres = await bd.db.execute(sql`select 1 from cosmeticos_usuario where usuario_id = ${u.id}`);
      expect(sobres.rows).toEqual([]);
    });

    it('core, un id inexistente o una colección de prueba retirada: 404 PRODUCTO_NO_ENCONTRADO', async () => {
      const u = await crearRegistradoConColeccion(srv);
      expect((await comprarColeccion(u, 'core')).cuerpo.error.codigo).toBe('PRODUCTO_NO_ENCONTRADO');
      expect((await comprarColeccion(u, 'no-existe')).estado).toBe(404);
      for (const id of ['all-stars', 'top-argentinos']) expect((await comprarColeccion(u, id)).cuerpo.error.codigo).toBe('PRODUCTO_NO_ENCONTRADO');
    });

    it('GET /api/tienda: el detalle de cada expansión, en orden de número, con compensación, regalo, imágenes y sin euros', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await darCartas(bd.db, u.id, [deA('GOAT')[0]!, deA('Superclase')[0]!]);
      const t = (await tienda(u)).cuerpo;
      const a = t.colecciones.find((c: any) => c.id === 'exp-a');
      expect(a).toMatchObject({
        numCartas: 24,
        precioFragmentos: 2400,
        precioCentimos: null,
        poseidas: 2,
        adquirida: false,
        compensacion: 200,
        sobreRegalo: { id: 'sobre-28', nombre: 'Sobre 28', poseido: false },
        icono: '/expansiones/exp-a/icono-256.webp',
        iconoGrande: '/expansiones/exp-a/icono-512.webp',
        cartel: '/expansiones/exp-a/cartel.webp',
      });
      expect(NIVELES.map((n) => a.porNivel[n])).toEqual([6, 6, 6, 6]);
      expect(a.muestra).toHaveLength(3);
      expect(a.cartas.map((c: any) => c.numero)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
      expect(a.cartas.map((c: any) => c.carta.id)).toEqual(expA.ids);
      expect(a.cartas[0]).toMatchObject({ poseida: true, compensacion: 175 });
      expect(a.cartas[1]).toMatchObject({ poseida: false, compensacion: 0 });
      expect(t.colecciones.find((c: any) => c.id === 'exp-b').sobreRegalo).toBeNull();
      // Peso (plan, Performance Goals): las cuatro expansiones de 24 cartas añaden como mucho 25 KB a lo que viaja (la
      // respuesta va comprimida). Sin comprimir son ≈ 11,7 KB por expansión.
      const comprimido = (x: unknown) => gzipSync(JSON.stringify(x)).length;
      const sinDetalle = { ...a, cartas: [], compensacion: 0, sobreRegalo: null, icono: '', iconoGrande: '', cartel: '' };
      expect(4 * (comprimido(a) - comprimido(sinDetalle))).toBeLessThanOrEqual(25 * 1024);
    });

    it('comprar después B da fragmentos por las 6 compartidas con A; la tienda informa de cada colección', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 9000);
      expect((await comprarColeccion(u, 'exp-a')).estado).toBe(200);
      const antes = (await tienda(u)).cuerpo;
      const b = antes.colecciones.find((c: any) => c.id === 'exp-b');
      expect(b).toMatchObject({ numCartas: 24, adquirida: false, soloFragmentos: null, precioFragmentos: 3000, poseidas: 6, compensacion: 6 * 25 });
      expect(NIVELES.reduce((acc, n) => acc + b.porNivel[n], 0)).toBe(24);
      expect(antes.colecciones.find((c: any) => c.id === 'exp-a')).toMatchObject({ adquirida: true, poseidas: 24, soloFragmentos: 2400 });
      const r = await comprarColeccion(u, 'exp-b');
      expect(r.cuerpo.duplicados.map((d: any) => d.id).sort()).toEqual([...deA('Superclase')].sort());
      expect(r.cuerpo.cosmeticos).toEqual([]);
    });

    it('tras compras, desfragmentaciones y recompensas al azar, la suma del historial es el saldo (SC-006)', async () => {
      const u = await crearRegistradoConColeccion(srv);
      await fijarSaldo(bd.db, u.id, 9500);
      await comprarColeccion(u, 'exp-a');
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
      await fijarSaldo(bd.db, u.id, 2400);
      await fijarSaldo(bd.db, v.id, 2400);
      expect((await comprarColeccion(u, 'exp-a')).estado).toBe(200);
      expect((await comprarColeccion(v, 'exp-a')).estado).toBe(200);
      // v ya tiene una carta de B que no está en A; u no.
      const nueva = expB.ids[0]!;
      await darCartas(bd.db, v.id, [nueva]);
      const ampliada = { ...expA.coleccion, cartas: [...expA.coleccion.cartas, { id: nueva, version: 'normal' as const, numero: 25 }] };
      const jugadores = [...expA.jugadores, ...expB.jugadores];
      try {
        const { entregas } = await cargarCatalogo(bd.db, jugadores, [ampliada]);
        expect(entregas).toEqual(
          expect.arrayContaining([
            { usuarioId: u.id, coleccionId: 'exp-a', cartas: [nueva], duplicados: [] },
            { usuarioId: v.id, coleccionId: 'exp-a', cartas: [], duplicados: [nueva] },
          ]),
        );
        expect((await cartasDe(u)).find((c) => c.jugador_id === nueva)).toMatchObject({ via: 'coleccion', activa: true });
        const sv = await saldoYSuma(bd.db, v.id);
        expect(sv.saldo).toBe(sv.suma);
        // La primera carta de B es GOAT: 175 (spec 016, FR-018).
        expect(sv.saldo).toBe(175);
      } finally {
        await cargarCatalogo(bd.db, jugadores, [expA.coleccion]);
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
      const coleccion = await peticion(srv.url, '/api/tienda/colecciones/exp-a/comprar', {
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
