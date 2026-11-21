/**
 * Ataques a los límites de uso (spec 017, T034, FR-013, FR-014, FR-032a). Los límites viven en memoria: cada ataque
 * arranca su propio servidor; las cuentas se preparan en otro sin límites sobre la misma base de datos.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Limitador } from '../../src/http/limitador';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearInvitado, crearRegistrado, iniciarServidorAtaque, peticion, tokenRecuperacion, type ServidorAtaque } from './ayudas';

const PARTIDA = { modo: 'liga', numParticipantes: 4 };
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('límites de uso', () => {
  let bd: BdPruebas;
  let aux: ServidorAtaque;
  const abiertos: ServidorAtaque[] = [];

  const conLimites = async (proxiesConfianza = 1) => {
    const s = await iniciarServidorAtaque(bd, { limitesReales: true, proxiesConfianza });
    abiertos.push(s);
    return s;
  };
  const login = (s: ServidorAtaque, email: string, password: string, ip: string) =>
    peticion(s.url, '/api/auth/login', { cuerpo: { email, password }, cabeceras: { 'x-forwarded-for': ip } });
  const recuperar = (s: ServidorAtaque, email: string, ip: string) =>
    peticion(s.url, '/api/auth/recuperar', { cuerpo: { email }, cabeceras: { 'x-forwarded-for': ip } });

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    aux = await iniciarServidorAtaque(bd);
  });
  beforeEach(async () => {
    for (const s of abiertos.splice(0)) await s.cerrar();
    await bd.limpiar();
  });
  afterAll(async () => {
    for (const s of abiertos) await s.cerrar();
    await aux.cerrar();
    await bd.detener();
  });

  it('SEG-003: probar 100 contraseñas cambiando la cookie y X-Forwarded-For', async () => {
    const s = await conLimites(0);
    const u = await crearRegistrado(aux.url);
    const estados: number[] = [];
    for (let i = 0; i < 100; i++) {
      const r = await peticion(s.url, '/api/auth/login', {
        cuerpo: { email: u.email, password: `mala-${i}-contraseña` },
        cabeceras: { cookie: `better-auth.session_token=falsa${i}`, 'x-forwarded-for': `203.0.113.${i}` },
      });
      estados.push(r.estado);
    }
    expect(estados.filter((e) => e === 401).length).toBeLessThanOrEqual(11);
    expect(estados.filter((e) => e === 429).length).toBeGreaterThanOrEqual(89);
  });

  it('SEG-003: repartir 25 fallos contra una cuenta entre muchas direcciones', async () => {
    const s = await conLimites();
    const u = await crearRegistrado(aux.url);
    const estados: number[] = [];
    for (let i = 0; i < 25; i++) estados.push((await login(s, u.email!, `mala-${i}-contraseña`, `198.51.100.${i + 1}`)).estado);
    expect(estados.slice(0, 20).every((e) => e === 401)).toBe(true);
    expect(estados.slice(20).every((e) => e === 429)).toBe(true);
  });

  it('SEG-003: el bloqueo por fallos responde igual exista o no la cuenta', async () => {
    const s = await conLimites();
    const u = await crearRegistrado(aux.url);
    const respuestas = [];
    for (const email of [u.email!, 'nadie@pruebas.test']) {
      for (let i = 0; i < 20; i++) await login(s, email, `mala-${i}-contraseña`, `192.0.2.${i + 1}`);
      respuestas.push(await login(s, email, 'otra-mala-contraseña', '192.0.2.200'));
    }
    expect(respuestas[0]!.estado).toBe(429);
    expect(respuestas[1]!.estado).toBe(429);
    expect(respuestas[0]!.cuerpo).toEqual(respuestas[1]!.cuerpo);
  });

  it('SEG-003: bloquear una cuenta ajena no impide recuperarla', async () => {
    const s = await conLimites();
    const u = await crearRegistrado(aux.url);
    for (let i = 0; i < 20; i++) await login(s, u.email!, `mala-${i}-contraseña`, `192.0.2.${i + 1}`);
    expect((await login(s, u.email!, 'contraseña-segura', '192.0.2.100')).estado).toBe(429);

    expect((await recuperar(s, u.email!, '192.0.2.101')).estado).toBe(200);
    const token = await tokenRecuperacion(bd);
    const r = await peticion(s.url, '/api/auth/restablecer', { cuerpo: { token, password: 'contraseña-nueva' }, cabeceras: { 'x-forwarded-for': '192.0.2.101' } });
    expect(r.estado).toBe(200);
    expect((await login(s, u.email!, 'contraseña-nueva', '192.0.2.102')).estado).toBe(200);
  });

  it('SEG-022: hacer crecer el limitador rotando direcciones', () => {
    const l = new Limitador({ capacidad: 1, porSegundo: 0, ahora: () => 0 });
    for (let i = 0; i < 25_000; i++) l.permitir(`203.0.${i >> 8}.${i & 255}`);
    expect((l as unknown as { cubos: Map<string, unknown> }).cubos.size).toBeLessThanOrEqual(10_000);
  });

  it('SEG-013: saturar la API con cookies inventadas o sin cookie', async () => {
    const s = await conLimites(0);
    // Por tandas: 700 conexiones a la vez agotan los puertos del cliente en Windows.
    const estados: number[] = [];
    for (let tanda = 0; tanda < 10; tanda++) {
      const r = await Promise.all(
        Array.from({ length: 80 }, (_, i) =>
          peticion(s.url, '/api/catalogo/formaciones', i % 2 ? { cabeceras: { cookie: `better-auth.session_token=inventada${tanda}-${i}` } } : {}),
        ),
      );
      estados.push(...r.map((x) => x.estado));
    }
    expect(estados.filter((e) => e === 429).length).toBeGreaterThan(0);
  });

  it('SEG-013: superar el cupo de una sesión real', async () => {
    const s = await conLimites();
    const u = await crearRegistrado(aux.url);
    const r = await Promise.all(Array.from({ length: 200 }, () => peticion(s.url, '/api/me', { cookie: u.cookie })));
    expect(r.filter((x) => x.estado === 429).length).toBeGreaterThan(0);
  });

  it('SEG-014: agotar la recuperación de otro cliente detrás del proxy', async () => {
    const s = await conLimites();
    for (let i = 0; i < 5; i++) expect((await recuperar(s, `a${i}@pruebas.test`, '203.0.113.1')).estado).toBe(200);
    expect((await recuperar(s, 'a6@pruebas.test', '203.0.113.1')).estado).toBe(429);
    expect((await recuperar(s, 'b@pruebas.test', '203.0.113.2')).estado).toBe(200);
  });

  it('SEG-014: falsificar la primera dirección de X-Forwarded-For', async () => {
    const s = await conLimites();
    for (let i = 0; i < 5; i++) await recuperar(s, `a${i}@pruebas.test`, `10.9.9.${i}, 203.0.113.7`);
    expect((await recuperar(s, 'a6@pruebas.test', '10.9.9.200, 203.0.113.7')).estado).toBe(429);
  });

  it('SEG-014: rotar direcciones IPv6 dentro de un mismo /64', async () => {
    const s = await conLimites();
    for (let i = 1; i <= 5; i++) await recuperar(s, `a${i}@pruebas.test`, `2001:db8:1:2::${i.toString(16)}`);
    expect((await recuperar(s, 'a6@pruebas.test', '2001:db8:1:2:ffff::9')).estado).toBe(429);
    expect((await recuperar(s, 'b@pruebas.test', '2001:db8:1:3::1')).estado).toBe(200);
  });

  it('SEG-014: pedir muchos enlaces para un mismo correo desde varias direcciones', async () => {
    const s = await conLimites();
    const u = await crearRegistrado(aux.url);
    for (let i = 0; i < 6; i++) expect((await recuperar(s, u.email!, `198.51.100.${i + 1}`)).estado).toBe(200);
    await espera(300);
    const filas = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from verificaciones where identificador like 'reset-password:%'`);
    expect(filas.rows[0]!.n).toBe(3);
  });

  it('SEG-015: crear cuentas en bucle desde el mismo cliente', async () => {
    const s = await conLimites();
    const estados: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await peticion(s.url, '/api/auth/registro', {
        cuerpo: { email: `masiva${i}@pruebas.test`, password: 'contraseña-segura', apodo: `Masiva${i}` },
        cabeceras: { 'x-forwarded-for': '203.0.113.50' },
      });
      estados.push(r.estado);
    }
    expect(estados.slice(0, 5).every((e) => e === 200)).toBe(true);
    expect(estados.slice(5).every((e) => e === 429)).toBe(true);
  });

  it('SEG-015: crear invitados en bucle desde el mismo cliente', async () => {
    const s = await conLimites();
    const estados: number[] = [];
    for (let i = 0; i < 22; i++) {
      estados.push((await peticion(s.url, '/api/auth/invitado', { metodo: 'POST', cabeceras: { 'x-forwarded-for': '203.0.113.60' } })).estado);
    }
    expect(estados.slice(0, 20).every((e) => e === 200)).toBe(true);
    expect(estados.slice(20).every((e) => e === 429)).toBe(true);
  });

  it('SEG-016: un invitado crea más de 3 partidas', async () => {
    const u = await crearInvitado(aux.url);
    const estados: number[] = [];
    for (let i = 0; i < 5; i++) estados.push((await peticion(aux.url, '/api/partidas', { cookie: u.cookie, cuerpo: PARTIDA })).estado);
    expect(estados).toEqual([201, 201, 201, 409, 409]);
  });

  it('SEG-016: una cuenta lanza 15 creaciones simultáneas', async () => {
    const u = await crearRegistrado(aux.url);
    const r = await Promise.all(Array.from({ length: 15 }, () => peticion(aux.url, '/api/partidas', { cookie: u.cookie, cuerpo: PARTIDA })));
    expect(r.filter((x) => x.estado === 201)).toHaveLength(10);
    expect(r.filter((x) => x.estado === 409).every((x) => x.cuerpo.error.codigo === 'LIMITE_PARTIDAS')).toBe(true);
    const filas = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from partidas where anfitrion_id = ${u.id}`);
    expect(filas.rows[0]!.n).toBe(10);
  });

  it('SEG-016: colgar el servidor con más creaciones simultáneas que conexiones a la base de datos', async () => {
    const u = await crearRegistrado(aux.url);
    const r = await Promise.race([
      Promise.all(Array.from({ length: 40 }, () => peticion(aux.url, '/api/partidas', { cookie: u.cookie, cuerpo: PARTIDA }))),
      espera(20_000).then(() => null),
    ]);
    expect(r, 'el servidor se ha quedado colgado').not.toBeNull();
    expect(r!.filter((x) => x.estado === 201)).toHaveLength(10);
    expect((await peticion(aux.url, '/healthz')).estado).toBe(200);
  });

  it('SEG-016: unirse a otra partida con el tope alcanzado, y la plaza se libera al abandonar', async () => {
    const u = await crearRegistrado(aux.url);
    const creadas: string[] = [];
    for (let i = 0; i < 10; i++) creadas.push((await peticion(aux.url, '/api/partidas', { cookie: u.cookie, cuerpo: PARTIDA })).cuerpo.id);
    const otro = await crearRegistrado(aux.url);
    const ajena = await peticion(aux.url, '/api/partidas', { cookie: otro.cookie, cuerpo: { ...PARTIDA, plazasHumanas: 2 } });
    const unirse = await peticion(aux.url, `/api/partidas/${ajena.cuerpo.id}/unirse`, { metodo: 'POST', cookie: u.cookie });
    expect(unirse.estado).toBe(409);
    expect(unirse.cuerpo.error.codigo).toBe('LIMITE_PARTIDAS');

    expect((await peticion(aux.url, `/api/partidas/${creadas[0]}/abandonar`, { metodo: 'POST', cookie: u.cookie })).estado).toBe(200);
    expect((await peticion(aux.url, `/api/partidas/${ajena.cuerpo.id}/unirse`, { metodo: 'POST', cookie: u.cookie })).estado).toBe(200);
  });
});
