/**
 * Colección propia, colección activa y desfragmentar (spec 006, US1, US2 y US3; T032, T044, T055). Spec 016: las
 * cartas que no son de Core vienen de una colección de pago de pruebas (research R16) y desfragmentar da 25/75/125/175.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearRegistradoConColeccion, darCartas, montarColeccionPago, saldoYSuma } from '../helpers/economia';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('colección (spec 006)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas;
  /** Ids de la colección de pago de pruebas: 6 GOAT, 6 Legendario, 6 Crack y 6 Superclase. */
  let pago: number[];
  /** Una carta que no es de Core (la primera Superclase de la colección de pruebas). */
  let extra: number;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    pago = (await montarColeccionPago(bd.db, { id: 'coleccion-prueba', primerId: 9001 })).ids;
    extra = pago[18]!;
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

  /** Usuario con una carta que no es de Core (una de sobra en su combinación) y una carta de Core de esa combinación. */
  async function conUnaDeSobra() {
    const u = await crearRegistradoConColeccion(srv);
    await darCartas(bd.db, u.id, [extra]);
    const lista = await cartas(u);
    const otra = lista.find((c) => c.id === extra);
    const core = lista.find((c) => c.esCore && c.demarcacion === otra.demarcacion && c.nivel === otra.nivel);
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
      const ids = r.cuerpo.colecciones.map((c: any) => c.id);
      expect(ids[0]).toBe('core');
      expect(ids).toContain('coleccion-prueba');
      expect(ids).not.toContain('all-stars');
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
      expect(r.cuerpo.error.detalles).toEqual({ demarcacion: 'POR', nivel: 'Superclase', minimo: 13, activas: 13 });
      expect(r.cuerpo.error.mensaje).toBe('Mínimo de POR Superclase: 13; tienes 13 activas');
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
      const r = await cambiar(u.cookie, extra, false);
      expect(r.estado).toBe(404);
      expect(r.cuerpo.error.codigo).toBe('CARTA_NO_POSEIDA');
    });

    it('dos desactivaciones simultáneas de la última carta sobrante: solo se aplica una', async () => {
      const { u, core } = await conUnaDeSobra();
      const [a, b] = await Promise.all([cambiar(u.cookie, extra, false), cambiar(u.cookie, core, false)]);
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

    it('suma 25/75/125/175 según el nivel, quita la carta, no suma dos veces y queda en el historial (spec 016, FR-018)', async () => {
      const u = await crearRegistradoConColeccion(srv);
      // Superclase, Crack, Legendario y GOAT de la colección de pruebas (bloques de 6 por nivel).
      const ids = [pago[18]!, pago[12]!, pago[6]!, pago[0]!];
      await darCartas(bd.db, u.id, ids);
      const valores = [];
      for (const id of ids) {
        const r = await desfragmentar(u.cookie, id);
        expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
        valores.push(r.cuerpo.fragmentos);
      }
      expect(valores).toEqual([25, 75, 125, 175]);
      const otra = await desfragmentar(u.cookie, ids[0]!);
      expect(otra.estado).toBe(404);
      expect(otra.cuerpo.error.codigo).toBe('CARTA_NO_POSEIDA');
      expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 400, suma: 400 });
      expect((await cartas(u)).some((c) => ids.includes(c.id))).toBe(false);

      const h = await peticion(srv.url, '/api/fragmentos/movimientos', { cookie: u.cookie });
      expect(h.cuerpo.saldo).toBe(400);
      expect(h.cuerpo.movimientos).toHaveLength(4);
      expect(h.cuerpo.movimientos.every((m: any) => m.motivo === 'desfragmentacion' && m.descripcion.startsWith('Carta desfragmentada'))).toBe(true);
      const fechas: string[] = h.cuerpo.movimientos.map((m: any) => m.creadoEn);
      expect([...fechas].sort().reverse()).toEqual(fechas);
      expect((await peticion(srv.url, '/api/fragmentos/movimientos?limite=2', { cookie: u.cookie })).cuerpo.movimientos).toHaveLength(2);
      const antes = await peticion(srv.url, `/api/fragmentos/movimientos?antes=${encodeURIComponent(fechas[0]!)}`, { cookie: u.cookie });
      expect(antes.cuerpo.movimientos.length).toBeLessThan(4);
    });

    it('Verratti (299) ya no es del Core y da 175; Kimmich (376) sí lo es: 422 CARTA_CORE (spec 016, FR-007, FR-018)', async () => {
      const u = await crearRegistradoConColeccion(srv);
      expect((await cartas(u)).find((c) => c.id === 376)).toMatchObject({ esCore: true, valorFragmentos: null });
      const kimmich = await desfragmentar(u.cookie, 376);
      expect(kimmich.estado).toBe(422);
      expect(kimmich.cuerpo.error.codigo).toBe('CARTA_CORE');
      await darCartas(bd.db, u.id, [299]);
      const r = await desfragmentar(u.cookie, 299);
      expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
      expect(r.cuerpo.fragmentos).toBe(175);
    });

    it('desfragmentar una activa que rompería el mínimo da 422 MINIMO_ACTIVO', async () => {
      const { u, core } = await conUnaDeSobra();
      // Con una carta de Core de la misma combinación desactivada, la otra pasa a ser imprescindible.
      expect((await cambiar(u.cookie, core, false)).estado).toBe(200);
      const r = await desfragmentar(u.cookie, extra);
      expect(r.estado).toBe(422);
      expect(r.cuerpo.error.codigo).toBe('MINIMO_ACTIVO');
    });
  });
});
