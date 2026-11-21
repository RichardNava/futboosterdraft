import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { espera } from '../helpers/torneo';
import { crearRegistrado, peticion } from '../helpers/usuarios';

describe('recuperar la contraseña (spec 013, FR-027)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas;
  let mailpit: StartedTestContainer;
  let urlMailpit: string;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    mailpit = await new GenericContainer('axllent/mailpit').withExposedPorts(1025, 8025).start();
    urlMailpit = `http://${mailpit.getHost()}:${mailpit.getMappedPort(8025)}`;
    srv = await iniciarServidorPruebas(bd, undefined, { smtpUrl: `smtp://${mailpit.getHost()}:${mailpit.getMappedPort(1025)}` });
  });
  afterAll(async () => {
    await srv?.cerrar();
    await bd?.detener();
    await mailpit?.stop();
  });

  /** Enlace del último correo enviado a `email` (espera hasta 5 s a que llegue). */
  async function enlaceRecibido(email: string): Promise<string | null> {
    for (let i = 0; i < 50; i++) {
      const lista = (await (await fetch(`${urlMailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()) as { messages: { ID: string }[] };
      const id = lista.messages[0]?.ID;
      if (id) {
        const correo = (await (await fetch(`${urlMailpit}/api/v1/message/${id}`)).json()) as { Text: string };
        return /http\S+\?restablecer=\S+/.exec(correo.Text)?.[0] ?? null;
      }
      await espera(100);
    }
    return null;
  }

  it('envía un enlace, cambia la contraseña con él, cierra las sesiones abiertas y el enlace no sirve dos veces', async () => {
    const u = await crearRegistrado(srv.url);
    const email = u.email!;
    const pedir = await peticion(srv.url, '/api/auth/recuperar', { cuerpo: { email } });
    expect(pedir.estado).toBe(200);

    const enlace = await enlaceRecibido(email);
    expect(enlace).toMatch(/^http:\/\/localhost:5173\/\?restablecer=/);
    const token = decodeURIComponent(new URL(enlace!).searchParams.get('restablecer')!);

    const corta = await peticion(srv.url, '/api/auth/restablecer', { cuerpo: { token, password: 'corta' } });
    expect(corta.estado).toBe(400);

    const ok = await peticion(srv.url, '/api/auth/restablecer', { cuerpo: { token, password: 'otra-contraseña' } });
    expect(ok.estado).toBe(200);
    expect((await peticion(srv.url, '/api/me', { cookie: u.cookie })).estado).toBe(401);
    expect((await peticion(srv.url, '/api/auth/login', { cuerpo: { email, password: 'contraseña-segura' } })).estado).toBe(401);
    expect((await peticion(srv.url, '/api/auth/login', { cuerpo: { email, password: 'otra-contraseña' } })).estado).toBe(200);

    const otraVez = await peticion(srv.url, '/api/auth/restablecer', { cuerpo: { token, password: 'tercera-contraseña' } });
    expect(otraVez.estado).toBe(400);
    expect(otraVez.cuerpo.code).toBe('INVALID_TOKEN');
  });

  it('responde igual con un email sin cuenta y no envía nada', async () => {
    const r = await peticion(srv.url, '/api/auth/recuperar', { cuerpo: { email: 'nadie@pruebas.test' } });
    expect(r.estado).toBe(200);
    await espera(500);
    const lista = (await (await fetch(`${urlMailpit}/api/v1/search?query=${encodeURIComponent('to:nadie@pruebas.test')}`)).json()) as { messages: unknown[] };
    expect(lista.messages).toHaveLength(0);
  });

  it('limita las peticiones por IP', async () => {
    const conLimites = await iniciarServidorPruebas(bd, undefined, { limitesReales: true });
    const estados: number[] = [];
    for (let i = 0; i < 6; i++) estados.push((await peticion(conLimites.url, '/api/auth/recuperar', { cuerpo: { email: 'nadie@pruebas.test' } })).estado);
    await conLimites.cerrar();
    expect(estados).toContain(429);
  });
});
