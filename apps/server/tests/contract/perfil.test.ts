/** Contrato del perfil de usuario (spec 003, FR-042a, FR-045; T110). */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearInvitado, crearRegistrado, peticion } from '../helpers/usuarios';

describe('contrato HTTP del perfil (T110)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    srv = await iniciarServidorPruebas(bd);
  });
  afterAll(async () => {
    await srv?.cerrar();
    await bd?.detener();
  });

  it('sin perfil, GET devuelve nulos; PUT válido guarda y GET lo devuelve', async () => {
    const u = await crearRegistrado(srv.url);
    expect((await peticion(srv.url, '/api/perfil', { cookie: u.cookie })).cuerpo).toEqual({ nombreEquipo: null, equipaciones: null });
    const equipaciones = { primera: { diseno: 'rayas', colores: ['#ffffff', '#d01010'] }, segunda: { diseno: 'lisa', colores: ['#1030d0'] } };
    const r = await peticion(srv.url, '/api/perfil', { metodo: 'PUT', cookie: u.cookie, cuerpo: { nombreEquipo: ' Los  Halcones ', equipaciones } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    expect((await peticion(srv.url, '/api/perfil', { cookie: u.cookie })).cuerpo).toEqual({ nombreEquipo: 'Los Halcones', equipaciones });
  });

  it('un invitado recibe 403 SOLO_REGISTRADOS', async () => {
    const g = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/perfil', { cookie: g.cookie });
    expect(r.estado).toBe(403);
    expect(r.cuerpo.error.codigo).toBe('SOLO_REGISTRADOS');
    expect((await peticion(srv.url, '/api/perfil', { metodo: 'PUT', cookie: g.cookie, cuerpo: { nombreEquipo: 'Hola', equipaciones: null } })).estado).toBe(403);
  });

  it('un nombre o unas equipaciones inválidas dan 422', async () => {
    const u = await crearRegistrado(srv.url);
    const corto = await peticion(srv.url, '/api/perfil', { metodo: 'PUT', cookie: u.cookie, cuerpo: { nombreEquipo: 'Ab', equipaciones: null } });
    expect(corto.estado).toBe(422);
    expect(corto.cuerpo.error.codigo).toBe('NOMBRE_CORTO');
    const parecidas = await peticion(srv.url, '/api/perfil', {
      metodo: 'PUT',
      cookie: u.cookie,
      cuerpo: { nombreEquipo: null, equipaciones: { primera: { diseno: 'lisa', colores: ['#d01010'] }, segunda: { diseno: 'lisa', colores: ['#c81818'] } } },
    });
    expect(parecidas.estado).toBe(422);
    expect(parecidas.cuerpo.error.codigo).toBe('EQUIPACIONES_PARECIDAS');
  });
});
