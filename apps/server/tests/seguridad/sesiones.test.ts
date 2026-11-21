/**
 * Una sesión revocada no sigue viva en el canal en tiempo real (spec 017, T047, FR-018, SC-007): 4401 en 5 s como máximo.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearRegistrado, iniciarServidorAtaque, peticion, tokenRecuperacion, type ServidorAtaque, type UsuarioPrueba } from './ayudas';

/** Abre un socket y devuelve la promesa de su código de cierre (o `null` si sigue abierto a los 5 s). */
async function abrir(s: ServidorAtaque, u: UsuarioPrueba) {
  const r = await peticion(s.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
  const socket = new WebSocket(`${s.urlWs}/ws?partidaId=${r.cuerpo.id}`, { headers: { cookie: u.cookie } });
  await new Promise((resolve, reject) => {
    socket.once('message', resolve);
    socket.once('error', reject);
  });
  return {
    socket,
    cierre: () =>
      new Promise<number | null>((resolve) => {
        const t = setTimeout(() => resolve(null), 5_000);
        socket.once('close', (codigo) => {
          clearTimeout(t);
          resolve(codigo);
        });
      }),
  };
}

describe('sesiones revocadas en tiempo real', () => {
  let bd: BdPruebas;
  let s: ServidorAtaque;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    s = await iniciarServidorAtaque(bd);
  });
  beforeEach(() => bd.limpiar());
  afterAll(async () => {
    await s.cerrar();
    await bd.detener();
  });

  it('SEG-006: seguir conectado tras cerrar sesión', async () => {
    const u = await crearRegistrado(s.url);
    const { cierre } = await abrir(s, u);
    const codigo = cierre();
    await peticion(s.url, '/api/auth/logout', { metodo: 'POST', cookie: u.cookie });
    expect(await codigo).toBe(4401);
  });

  it('SEG-006: seguir conectado tras restablecer la contraseña', async () => {
    const u = await crearRegistrado(s.url);
    const { cierre } = await abrir(s, u);
    const codigo = cierre();
    await peticion(s.url, '/api/auth/recuperar', { cuerpo: { email: u.email } });
    const token = await tokenRecuperacion(bd);
    await peticion(s.url, '/api/auth/restablecer', { cuerpo: { token, password: 'contraseña-nueva' } });
    expect(await codigo).toBe(4401);
  });

  it('SEG-006: seguir conectado con la sesión caducada', async () => {
    const u = await crearRegistrado(s.url);
    const { cierre } = await abrir(s, u);
    const codigo = cierre();
    await bd.db.execute(sql`update sesiones set expira_en = now() - interval '1 second' where usuario_id = ${u.id}`);
    expect(await codigo).toBe(4401);
  });

  it('SEG-006: seguir conectado tras eliminar la cuenta', async () => {
    const u = await crearRegistrado(s.url);
    const { cierre } = await abrir(s, u);
    const codigo = cierre();
    await peticion(s.url, '/api/cuenta', { metodo: 'DELETE', cookie: u.cookie });
    expect(await codigo).toBe(4401);
  });

  it('SEG-006: seguir conectado con la sesión retirada desde otro proceso', async () => {
    const u = await crearRegistrado(s.url);
    const { cierre } = await abrir(s, u);
    const codigo = cierre();
    await bd.db.execute(sql`delete from sesiones where usuario_id = ${u.id}`);
    expect(await codigo).toBe(4401);
  });

  it('SEG-006: la revisión no cierra una sesión vigente', async () => {
    const u = await crearRegistrado(s.url);
    const { socket, cierre } = await abrir(s, u);
    expect(await cierre()).toBeNull();
    socket.close();
  });
});
