/**
 * Colección propia, colección activa y desfragmentar (spec 006, US1, US2 y US3; T032, T044, T055).
 */
import { DISTRIBUCION_CORE } from '@fbd/domain';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearRegistradoConColeccion, darCartas, saldoYSuma } from '../helpers/economia';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('colección (spec 006)', () => {
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

  const coleccion = (cookie: string) => peticion(srv.url, '/api/coleccion', { cookie });
  const cartas = async (u: UsuarioPrueba): Promise<any[]> => (await coleccion(u.cookie)).cuerpo.cartas;
  const cambiar = (cookie: string, id: number, activa: boolean) =>
    peticion(srv.url, `/api/coleccion/cartas/${id}`, { metodo: 'PUT', cookie, cuerpo: { activa } });
  const desfragmentar = (cookie: string, id: number) => peticion(srv.url, `/api/coleccion/cartas/${id}/desfragmentar`, { metodo: 'POST', cookie });

  /** Usuario con la carta de prueba 301 (una de sobra en su combinación) y una carta de Core de esa combinación. */
  async function conUnaDeSobra() {
    const u = await crearRegistradoConColeccion(srv);
    await darCartas(bd.db, u.id, [301]);
    const lista = await cartas(u);
    const c301 = lista.find((c) => c.id === 301);
    const core = lista.find((c) => c.esCore && c.demarcacion === c301.demarcacion && c.nivel === c301.nivel);
    return { u, core: core.id as number };
  }

  describe('GET /api/coleccion (US1)', () => {
    it('sin sesión 401 SIN_SESION; invitado 403 SOLO_REGISTRADOS', async () => {
      const sin = await peticion(srv.url, '/api/coleccion');
      expect(sin.estado).toBe(401);
      expect(sin.cuerpo.error.codigo).toBe('SIN_SESION');
      const inv = await crearInvitado(srv.url);
      const r = await coleccion(inv.cookie);
      expect(r.estado).toBe(403);
      expect(r.cuerpo.error.codigo).toBe('SOLO_REGISTRADOS');
    });

    it('un usuario nuevo tiene las 300 cartas de Core activas, cumple el mínimo y saldo 0; repetir no duplica', async () => {
      const u = await crearRegistrado(srv.url);
      const r = await coleccion(u.cookie);
      expect(r.estado).toBe(200);
      expect(r.cuerpo.cartas).toHaveLength(300);
      for (const c of r.cuerpo.cartas) {
        expect(c).toMatchObject({ activa: true, via: 'registro', esCore: true, valorFragmentos: null });
        expect(c.colecciones).toContain('core');
        expect(typeof c.nombreCarta).toBe('string');
      }
      expect(r.cuerpo.minimo).toEqual({ cumple: true, incumplidas: [] });
      expect(r.cuerpo.saldo).toBe(0);
      expect(r.cuerpo.colecciones.map((c: any) => c.id)).toEqual(['core', 'all-stars', 'top-argentinos']);
      await coleccion(u.cookie);
      const n = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from cartas_usuario where usuario_id = ${u.id}`);
      expect(n.rows[0]!.n).toBe(300);
    });
  });

  describe('PUT /api/coleccion/cartas/:id (US2)', () => {
    it('con solo Core, desactivar cualquier carta da 422 MINIMO_ACTIVO con los detalles', async () => {
      const u = await crearRegistradoConColeccion(srv);
      const r = await cambiar(u.cookie, 1, false);
      expect(r.estado).toBe(422);
      expect(r.cuerpo.error.codigo).toBe('MINIMO_ACTIVO');
      expect(r.cuerpo.error.detalles).toEqual({ demarcacion: 'POR', nivel: 'Superclase', minimo: DISTRIBUCION_CORE.POR.Superclase, activas: 14 });
      expect(r.cuerpo.error.mensaje).toBe('Mínimo de POR Superclase: 14; tienes 14 activas');
    });

    it('con cartas de sobra se desactiva y se reactiva; el mismo valor dos veces no cambia nada', async () => {
      const { u, core } = await conUnaDeSobra();
      const off = await cambiar(u.cookie, core, false);
      expect(off.estado).toBe(200);
      expect(off.cuerpo.carta.activa).toBe(false);
      expect(off.cuerpo.minimo.cumple).toBe(true);
      expect((await cambiar(u.cookie, core, false)).estado).toBe(200);
      expect((await cartas(u)).find((c) => c.id === core).activa).toBe(false);
      expect((await cambiar(u.cookie, core, true)).cuerpo.carta.activa).toBe(true);
    });

    it('una carta no poseída da 404 CARTA_NO_POSEIDA', async () => {
      const u = await crearRegistradoConColeccion(srv);
      const r = await cambiar(u.cookie, 301, false);
      expect(r.estado).toBe(404);
      expect(r.cuerpo.error.codigo).toBe('CARTA_NO_POSEIDA');
    });

    it('dos desactivaciones simultáneas de la última carta sobrante: solo se aplica una', async () => {
      const { u, core } = await conUnaDeSobra();
      const [a, b] = await Promise.all([cambiar(u.cookie, 301, false), cambiar(u.cookie, core, false)]);
      expect([a.estado, b.estado].sort()).toEqual([200, 422]);
      expect((await coleccion(u.cookie)).cuerpo.minimo.cumple).toBe(true);
    });
  });

  describe('desfragmentar e historial (US3)', () => {
    it('una carta de Core da 422 CARTA_CORE', async () => {
      const u = await crearRegistradoConColeccion(srv);
      const r = await desfragmentar(u.cookie, 1);
      expect(r.estado).toBe(422);
      expect(r.cuerpo.error.codigo).toBe('CARTA_CORE');
    });

    it('suma 25/50/75/100 según el nivel, quita la carta, no suma dos veces y queda en el historial', async () => {
      const u = await crearRegistradoConColeccion(srv);
      const catalogo: any[] = (await peticion(srv.url, '/api/catalogo/jugadores')).cuerpo.filter((c: any) => c.id > 300);
      const una = (nivel: string) => catalogo.find((c) => c.nivel === nivel).id as number;
      const ids = [una('Superclase'), una('Epico'), una('Legendario'), una('GOAT')];
      await darCartas(bd.db, u.id, ids);
      const valores = [];
      for (const id of ids) {
        const r = await desfragmentar(u.cookie, id);
        expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
        valores.push(r.cuerpo.fragmentos);
      }
      expect(valores).toEqual([25, 50, 75, 100]);
      const otra = await desfragmentar(u.cookie, ids[0]!);
      expect(otra.estado).toBe(404);
      expect(otra.cuerpo.error.codigo).toBe('CARTA_NO_POSEIDA');
      expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 250, suma: 250 });
      expect((await cartas(u)).some((c) => ids.includes(c.id))).toBe(false);

      const h = await peticion(srv.url, '/api/fragmentos/movimientos', { cookie: u.cookie });
      expect(h.cuerpo.saldo).toBe(250);
      expect(h.cuerpo.movimientos).toHaveLength(4);
      expect(h.cuerpo.movimientos.every((m: any) => m.motivo === 'desfragmentacion' && m.descripcion.startsWith('Carta desfragmentada'))).toBe(true);
      const fechas: string[] = h.cuerpo.movimientos.map((m: any) => m.creadoEn);
      expect([...fechas].sort().reverse()).toEqual(fechas);
      expect((await peticion(srv.url, '/api/fragmentos/movimientos?limite=2', { cookie: u.cookie })).cuerpo.movimientos).toHaveLength(2);
      const antes = await peticion(srv.url, `/api/fragmentos/movimientos?antes=${encodeURIComponent(fechas[0]!)}`, { cookie: u.cookie });
      expect(antes.cuerpo.movimientos.length).toBeLessThan(4);
    });

    it('desfragmentar una activa que rompería el mínimo da 422 MINIMO_ACTIVO', async () => {
      const { u, core } = await conUnaDeSobra();
      // Con una carta de Core de la misma combinación desactivada, la 301 pasa a ser imprescindible.
      expect((await cambiar(u.cookie, core, false)).estado).toBe(200);
      const r = await desfragmentar(u.cookie, 301);
      expect(r.estado).toBe(422);
      expect(r.cuerpo.error.codigo).toBe('MINIMO_ACTIVO');
    });
  });
});
