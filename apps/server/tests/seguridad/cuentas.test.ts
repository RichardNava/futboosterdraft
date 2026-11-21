/**
 * Ataques a cuentas y sesiones (spec 017, T040, T049, FR-015 a FR-020).
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearInvitado, crearRegistrado, iniciarServidorAtaque, peticion, tokenRecuperacion, type ServidorAtaque } from './ayudas';

const mediana = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]!;

describe('cuentas', () => {
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

  it('SEG-004: usar la API interna de autenticación', async () => {
    const u = await crearRegistrado(s.url);
    const intentos: [string, string, unknown][] = [
      ['POST', '/api/auth/ba/sign-up/email', { email: 'x@pruebas.test', password: 'contraseña-segura', name: 'x' }],
      ['POST', '/api/auth/ba/sign-in/email', { email: u.email, password: 'contraseña-segura' }],
      ['POST', '/api/auth/ba/update-user', { name: '<b>apodo</b>'.repeat(30) }],
      ['POST', '/api/auth/ba/change-password', { currentPassword: 'contraseña-segura', newPassword: 'otra-contraseña' }],
      ['GET', '/api/auth/ba/list-sessions', undefined],
    ];
    for (const [metodo, ruta, cuerpo] of intentos) {
      const r = await peticion(s.url, ruta, { metodo, cookie: u.cookie, ...(cuerpo ? { cuerpo } : {}) });
      expect(r.estado, ruta).toBe(404);
    }
  });

  it('SEG-025: leer el token de sesión en la respuesta de login y registro', async () => {
    const email = 'cuerpo@pruebas.test';
    const registro = await peticion(s.url, '/api/auth/registro', { cuerpo: { email, password: 'contraseña-segura', apodo: 'SinFicha' } });
    const login = await peticion(s.url, '/api/auth/login', { cuerpo: { email, password: 'contraseña-segura' } });
    for (const r of [registro, login]) {
      expect(r.estado).toBe(200);
      expect(Object.keys(r.cuerpo)).toEqual(['usuario']);
      expect(JSON.stringify(r.cuerpo)).not.toMatch(/token/i);
    }
  });

  it('SEG-027: guardar la dirección IP en la sesión', async () => {
    const u = await crearRegistrado(s.url);
    await peticion(s.url, '/api/auth/login', {
      cuerpo: { email: u.email, password: 'contraseña-segura' },
      cabeceras: { 'x-forwarded-for': '203.0.113.77', 'x-real-ip': '203.0.113.77' },
    });
    const filas = await bd.db.execute<{ n: number; total: number }>(
      sql`select count(*) filter (where coalesce(ip, '') <> '')::int as n, count(*)::int as total from sesiones`,
    );
    expect(filas.rows[0]!.total).toBe(2);
    expect(filas.rows[0]!.n).toBe(0);
  });

  it('SEG-028: el registro no acepta un correo ya usado y no revela nada más', async () => {
    const u = await crearRegistrado(s.url);
    const r = await peticion(s.url, '/api/auth/registro', { cuerpo: { email: u.email, password: 'contraseña-segura', apodo: 'Repetido' } });
    expect(r.estado).toBe(422);
    expect(JSON.stringify(r.cuerpo)).not.toContain(u.id);
  });

  it('SEG-029: distinguir por la respuesta o el tiempo si un correo tiene cuenta al recuperar', async () => {
    const u = await crearRegistrado(s.url);
    const medir = async (email: string) => {
      const tiempos: number[] = [];
      let cuerpo: unknown;
      for (let i = 0; i < 30; i++) {
        const t = performance.now();
        const r = await peticion(s.url, '/api/auth/recuperar', { cuerpo: { email } });
        tiempos.push(performance.now() - t);
        expect(r.estado).toBe(200);
        cuerpo = r.cuerpo;
      }
      return { cuerpo, mediana: mediana(tiempos) };
    };
    const con = await medir(u.email!);
    const sin = await medir('nadie@pruebas.test');
    expect(con.cuerpo).toEqual(sin.cuerpo);
    expect(Math.abs(con.mediana - sin.mediana)).toBeLessThan(15);
  });

  it('SEG-029: distinguir por la respuesta si un correo tiene cuenta al entrar', async () => {
    const u = await crearRegistrado(s.url);
    const con = await peticion(s.url, '/api/auth/login', { cuerpo: { email: u.email, password: 'mala-contraseña' } });
    const sin = await peticion(s.url, '/api/auth/login', { cuerpo: { email: 'nadie@pruebas.test', password: 'mala-contraseña' } });
    expect(con.estado).toBe(401);
    expect(sin.estado).toBe(401);
    expect(con.cuerpo).toEqual(sin.cuerpo);
  });

  it('SEG-017: eliminar una cuenta con pase premium', async () => {
    const u = await crearRegistrado(s.url);
    await bd.db.execute(sql`insert into pases_premium (usuario_id, fin) values (${u.id}, now() + interval '30 days')`);
    const r = await peticion(s.url, '/api/cuenta', { metodo: 'DELETE', cookie: u.cookie });
    expect(r.estado).toBe(200);
    expect(r.respuesta.headers.getSetCookie().join(';')).toMatch(/session_token=;/);
    const filas = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from usuarios where id = ${u.id}`);
    expect(filas.rows[0]!.n).toBe(0);
    expect((await peticion(s.url, '/api/me', { cookie: u.cookie })).estado).toBe(401);
  });

  it('SEG-000: un invitado reclama el correo de una cuenta existente', async () => {
    const victima = await crearRegistrado(s.url);
    const invitado = await crearInvitado(s.url);
    const r = await peticion(s.url, '/api/auth/registro', {
      cookie: invitado.cookie,
      cuerpo: { email: victima.email, password: 'contraseña-del-atacante', apodo: 'Atacante' },
    });
    expect(r.estado).toBe(422);
    expect((await peticion(s.url, '/api/auth/login', { cuerpo: { email: victima.email, password: 'contraseña-del-atacante' } })).estado).toBe(401);
    expect((await peticion(s.url, '/api/auth/login', { cuerpo: { email: victima.email, password: 'contraseña-segura' } })).estado).toBe(200);
  });

  it('SEG-000: reutilizar un enlace de recuperación o usarlo caducado', async () => {
    const u = await crearRegistrado(s.url);
    await peticion(s.url, '/api/auth/recuperar', { cuerpo: { email: u.email } });
    const token = await tokenRecuperacion(bd);
    expect((await peticion(s.url, '/api/auth/restablecer', { cuerpo: { token, password: 'contraseña-nueva' } })).estado).toBe(200);
    expect((await peticion(s.url, '/api/auth/restablecer', { cuerpo: { token, password: 'otra-contraseña' } })).estado).toBe(400);

    await peticion(s.url, '/api/auth/recuperar', { cuerpo: { email: u.email } });
    const caducado = await tokenRecuperacion(bd);
    await bd.db.execute(sql`update verificaciones set expira_en = now() - interval '1 minute'`);
    expect((await peticion(s.url, '/api/auth/restablecer', { cuerpo: { token: caducado, password: 'tercera-contraseña' } })).estado).toBe(400);
  });
});
