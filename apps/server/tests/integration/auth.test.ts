import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearInvitado, crearRegistrado, peticion } from '../helpers/usuarios';

describe('autenticación (FR-000)', () => {
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

  it('/healthz informa de que la base de datos responde', async () => {
    const r = await peticion(srv.url, '/healthz');
    expect(r.cuerpo).toEqual({ estado: 'ok', baseDatos: 'ok' });
  });

  it('crea una sesión de invitado', async () => {
    const invitado = await crearInvitado(srv.url);
    expect(invitado.tipo).toBe('invitado');
    const me = await peticion(srv.url, '/api/me', { cookie: invitado.cookie });
    expect(me.cuerpo.usuario).toMatchObject({ tipo: 'invitado', email: null });
  });

  it('registra un usuario con apodo y le devuelve su sesión', async () => {
    const usuario = await crearRegistrado(srv.url, 'Ana Prueba');
    expect(usuario).toMatchObject({ tipo: 'registrado', apodo: 'Ana Prueba' });
  });

  it('rechaza apodos fuera de 3–20 caracteres', async () => {
    const r = await peticion(srv.url, '/api/auth/registro', {
      cuerpo: { email: 'x@pruebas.test', password: 'contraseña-segura', apodo: 'ab' },
    });
    expect(r.estado).toBe(400);
    expect(r.cuerpo.error.codigo).toBe('APODO_INVALIDO');
  });

  it('sin sesión, /api/me responde 401 con el formato común', async () => {
    const r = await peticion(srv.url, '/api/me');
    expect(r.estado).toBe(401);
    expect(r.cuerpo.error.codigo).toBe('SIN_SESION');
  });

  it('logout invalida la sesión', async () => {
    const u = await crearRegistrado(srv.url);
    await peticion(srv.url, '/api/auth/logout', { metodo: 'POST', cookie: u.cookie });
    const r = await peticion(srv.url, '/api/me', { cookie: u.cookie });
    expect(r.estado).toBe(401);
  });
});
