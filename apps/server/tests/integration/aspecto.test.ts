/**
 * Aspecto del perfil (spec 011, US1 y US2; T025, T041; contracts/http-api.md «Aspecto»): escudo elegido o asignado,
 * sobre favorito o carrusel y `sobre-siguiente` con la baraja bloqueada.
 */
import { randomUUID } from 'node:crypto';
import { escudoAsignado } from '@fbd/domain';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearRegistradoConColeccion } from '../helpers/economia';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('aspecto del perfil (spec 011)', () => {
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

  const leer = (u: UsuarioPrueba) => peticion(srv.url, '/api/perfil/aspecto', { cookie: u.cookie });
  const guardar = (u: UsuarioPrueba, cuerpo: Record<string, unknown>) => peticion(srv.url, '/api/perfil/aspecto', { metodo: 'PUT', cookie: u.cookie, cuerpo });
  const siguiente = async (u: UsuarioPrueba): Promise<string> =>
    (await peticion(srv.url, '/api/perfil/aspecto/sobre-siguiente', { metodo: 'POST', cookie: u.cookie })).cuerpo.diseno;
  const gratuitos = () => srv.gestor.servicios.cosmeticos.gratuitos('escudo');
  /** Da cosméticos de pago como si se hubieran comprado. */
  async function dar(u: UsuarioPrueba, ids: string[]) {
    const compra = randomUUID();
    await bd.db.execute(
      sql`insert into compras (id, usuario_id, producto_tipo, producto_id, moneda, importe, estado, resultado)
          values (${compra}, ${u.id}, 'pack_cosmeticos', 'prueba', 'eur', 1, 'completada', '{}'::jsonb)`,
    );
    for (const id of ids) await bd.db.execute(sql`insert into cosmeticos_usuario (usuario_id, cosmetico_id, compra_id) values (${u.id}, ${id}, ${compra})`);
  }

  describe('escudo (US1)', () => {
    it('cuenta nueva: el asignado; elegir uno gratuito; null vuelve al asignado', async () => {
      const u = await crearRegistrado(srv.url);
      const asignado = escudoAsignado(u.id, gratuitos());
      expect((await leer(u)).cuerpo).toEqual({
        escudo: asignado,
        escudoAsignado: true,
        sobreFavorito: 'sobre-original',
        sobreCarrusel: false,
        sobresMarcados: [],
        sobreActual: 'sobre-original',
        // Spec 012.
        celebracion: null,
        modoIncidencias: 'automatico',
      });
      const otro = gratuitos().find((e) => e !== asignado)!;
      expect((await guardar(u, { escudo: otro })).cuerpo).toMatchObject({ escudo: otro, escudoAsignado: false });
      expect((await leer(u)).cuerpo).toMatchObject({ escudo: otro, escudoAsignado: false });
      expect((await guardar(u, { escudo: null })).cuerpo).toMatchObject({ escudo: asignado, escudoAsignado: true });
    });

    it('uno de pago sin comprar, un sobre como escudo o un id inexistente: 422 COSMETICO_NO_DISPONIBLE', async () => {
      const u = await crearRegistrado(srv.url);
      for (const escudo of ['escudo-premium-1', 'sobre-original', 'no-existe']) {
        const r = await guardar(u, { escudo });
        expect(r.estado, escudo).toBe(422);
        expect(r.cuerpo.error.codigo).toBe('COSMETICO_NO_DISPONIBLE');
      }
      await dar(u, ['escudo-premium-1']);
      expect((await guardar(u, { escudo: 'escudo-premium-1' })).estado).toBe(200);
    });

    it('invitado: la respuesta fija del contrato y PUT → 403', async () => {
      const g = await crearInvitado(srv.url);
      expect((await leer(g)).cuerpo).toEqual({
        escudo: null,
        escudoAsignado: false,
        sobreFavorito: 'sobre-original',
        sobreCarrusel: false,
        sobresMarcados: [],
        sobreActual: 'sobre-original',
        // Spec 012.
        celebracion: null,
        modoIncidencias: 'automatico',
      });
      expect((await guardar(g, { escudo: gratuitos()[0] })).estado).toBe(403);
      expect(await siguiente(g)).toBe('sobre-original');
    });
  });

  describe('sobres (US2)', () => {
    it('favorito no disponible → 422; con uno comprado se elige y sale en cada apertura', async () => {
      const u = await crearRegistrado(srv.url);
      expect((await guardar(u, { sobreFavorito: 'sobre-cubismo' })).estado).toBe(422);
      expect((await guardar(u, { sobresMarcados: ['sobre-original', 'sobre-1'] })).estado).toBe(422);
      await dar(u, ['sobre-cubismo']);
      expect((await guardar(u, { sobreFavorito: 'sobre-cubismo' })).cuerpo).toMatchObject({ sobreFavorito: 'sobre-cubismo', sobreActual: 'sobre-cubismo' });
      expect([await siguiente(u), await siguiente(u)]).toEqual(['sobre-cubismo', 'sobre-cubismo']);
    });

    it('carrusel con 3 marcados: cada vuelta saca los 3 sin repetir; cambiar los marcados vacía la baraja', async () => {
      const u = await crearRegistrado(srv.url);
      const marcados = ['sobre-1', 'sobre-2', 'sobre-3'];
      await dar(u, marcados);
      expect((await guardar(u, { sobreCarrusel: true, sobresMarcados: marcados })).estado).toBe(200);
      for (let vuelta = 0; vuelta < 3; vuelta++) {
        const disenos = [await siguiente(u), await siguiente(u), await siguiente(u)];
        expect([...disenos].sort()).toEqual(marcados);
      }
      await siguiente(u);
      const baraja = async () => (await bd.db.execute<{ b: string[] }>(sql`select sobre_baraja as b from perfiles_usuario where usuario_id = ${u.id}`)).rows[0]!.b;
      expect(await baraja()).toHaveLength(2);
      await guardar(u, { sobresMarcados: ['sobre-1', 'sobre-2'] });
      expect(await baraja()).toEqual([]);
      // sobreActual no avanza la baraja.
      const actual = (await leer(u)).cuerpo.sobreActual;
      expect((await leer(u)).cuerpo.sobreActual).toBe(actual);
    });

    it('dos aperturas a la vez no sacan el mismo diseño de la misma vuelta (fila bloqueada)', async () => {
      const u = await crearRegistradoConColeccion(srv);
      const marcados = ['sobre-4', 'sobre-5'];
      await dar(u, marcados);
      await guardar(u, { sobreCarrusel: true, sobresMarcados: marcados });
      for (let i = 0; i < 5; i++) {
        const par = await Promise.all([siguiente(u), siguiente(u)]);
        expect([...par].sort()).toEqual(marcados);
      }
    });
  });
});
