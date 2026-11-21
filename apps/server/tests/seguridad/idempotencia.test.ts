/**
 * Ataques a las respuestas guardadas para reintentos (spec 017, T050, FR-025).
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AlmacenPeticionesBD } from '../../src/persistencia/peticiones';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs, crearRegistrado, iniciarServidorAtaque, peticion, type ServidorAtaque } from './ayudas';

const PARTIDA = { modo: 'liga', numParticipantes: 4 };

describe('idempotencia', () => {
  let bd: BdPruebas;
  let s: ServidorAtaque;
  const filas = async () => (await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from peticiones_procesadas`)).rows[0]!.n;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    s = await iniciarServidorAtaque(bd);
  });
  beforeEach(() => bd.limpiar());
  afterAll(async () => {
    await s.cerrar();
    await bd.detener();
  });

  it('SEG-001: llenar la base de datos con claves desde rutas inexistentes y sin sesión', async () => {
    for (let i = 0; i < 20; i++) {
      await peticion(s.url, `/api/no-existe/${i}`, { metodo: 'POST', cabeceras: { 'idempotency-key': 'k'.repeat(4000) + i } });
    }
    expect(await filas()).toBe(0);
  });

  it('SEG-001: enviar una clave de más de 128 caracteres con sesión', async () => {
    const u = await crearRegistrado(s.url);
    const r = await peticion(s.url, '/api/partidas', { cookie: u.cookie, cuerpo: PARTIDA, cabeceras: { 'idempotency-key': 'k'.repeat(129) } });
    expect(r.estado).toBe(400);
    expect(r.cuerpo.error.codigo).toBe('CLAVE_INVALIDA');
    expect(await filas()).toBe(0);
  });

  it('SEG-001: las filas de más de 7 días se purgan', async () => {
    await bd.db.execute(sql`insert into peticiones_procesadas (partida_id, request_id, respuesta, creada_en) values
      ('vieja', 'a', '{}', now() - interval '8 days'), ('nueva', 'b', '{}', now() - interval '6 days')`);
    expect(await new AlmacenPeticionesBD(bd.db).purgarCaducadas()).toBe(1);
    const quedan = await bd.db.execute<{ partida_id: string }>(sql`select partida_id from peticiones_procesadas`);
    expect(quedan.rows.map((f) => f.partida_id)).toEqual(['nueva']);
  });

  it('SEG-005: repetir sin sesión la clave de un login ajeno', async () => {
    const u = await crearRegistrado(s.url);
    const clave = randomUUID();
    const victima = await peticion(s.url, '/api/auth/login', { cuerpo: { email: u.email, password: 'contraseña-segura' }, cabeceras: { 'idempotency-key': clave } });
    expect(victima.estado).toBe(200);
    expect(await filas()).toBe(0);
    const atacante = await peticion(s.url, '/api/auth/login', { cuerpo: { email: u.email, password: 'mala-contraseña' }, cabeceras: { 'idempotency-key': clave } });
    expect(atacante.estado).toBe(401);
  });

  it('SEG-005: repetir desde otra cuenta o sin sesión la clave de una acción ajena', async () => {
    const victima = await crearRegistrado(s.url);
    const otra = await crearRegistrado(s.url);
    const clave = randomUUID();
    const original = await peticion(s.url, '/api/partidas', { cookie: victima.cookie, cuerpo: PARTIDA, cabeceras: { 'idempotency-key': clave } });
    expect(original.estado).toBe(201);

    const sinSesion = await peticion(s.url, '/api/partidas', { cuerpo: PARTIDA, cabeceras: { 'idempotency-key': clave } });
    expect(sinSesion.estado).toBe(401);
    const ajena = await peticion(s.url, '/api/partidas', { cookie: otra.cookie, cuerpo: PARTIDA, cabeceras: { 'idempotency-key': clave } });
    expect(ajena.estado).toBe(201);
    expect(ajena.cuerpo.id).not.toBe(original.cuerpo.id);
    expect(ajena.respuesta.headers.get('idempotent-replay')).toBeNull();
  });

  it('SEG-005: la misma cuenta y clave sí recibe su respuesta guardada', async () => {
    const u = await crearRegistrado(s.url);
    const clave = randomUUID();
    const a = await peticion(s.url, '/api/partidas', { cookie: u.cookie, cuerpo: PARTIDA, cabeceras: { 'idempotency-key': clave } });
    const b = await peticion(s.url, '/api/partidas', { cookie: u.cookie, cuerpo: PARTIDA, cabeceras: { 'idempotency-key': clave } });
    expect(b.estado).toBe(a.estado);
    expect(b.cuerpo.id).toBe(a.cuerpo.id);
    expect(b.respuesta.headers.get('idempotent-replay')).toBe('true');
  });

  it('SEG-020: gastar por adelantado la clave con una petición sin sesión', async () => {
    const u = await crearRegistrado(s.url);
    const clave = randomUUID();
    expect((await peticion(s.url, '/api/partidas', { cuerpo: PARTIDA, cabeceras: { 'idempotency-key': clave } })).estado).toBe(401);
    expect((await peticion(s.url, '/api/partidas', { cookie: u.cookie, cuerpo: PARTIDA, cabeceras: { 'idempotency-key': clave } })).estado).toBe(201);
  });

  it('SEG-020: un error 4xx no consume la clave', async () => {
    const u = await crearRegistrado(s.url);
    const clave = randomUUID();
    expect((await peticion(s.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'no-existe' }, cabeceras: { 'idempotency-key': clave } })).estado).toBe(400);
    expect(await filas()).toBe(0);
    expect((await peticion(s.url, '/api/partidas', { cookie: u.cookie, cuerpo: PARTIDA, cabeceras: { 'idempotency-key': clave } })).estado).toBe(201);
  });

  it('SEG-020: un mensaje mal formado o de otro participante gasta el requestId', async () => {
    const a = await crearRegistrado(s.url);
    const b = await crearRegistrado(s.url);
    const p = await peticion(s.url, '/api/partidas', { cookie: a.cookie, cuerpo: { ...PARTIDA, plazasHumanas: 2 } });
    await peticion(s.url, `/api/partidas/${p.cuerpo.id}/unirse`, { metodo: 'POST', cookie: b.cookie });
    const wsA = await ClienteWs.conectar(s.urlWs, p.cuerpo.id, a.cookie);
    const wsB = await ClienteWs.conectar(s.urlWs, p.cuerpo.id, b.cookie);
    // Hasta el primer `estado`, la pasarela aún no escucha los mensajes de ese socket.
    await Promise.all([wsA.esperar('estado'), wsB.esperar('estado')]);
    const requestId = randomUUID();

    const malo = await wsA.enviarYEsperarAck({ t: 'draft.elegir', requestId, ronda: 99 });
    expect(malo.error.codigo).toBe('MENSAJE_INVALIDO');
    expect(await filas()).toBe(0);

    const valido = { t: 'draft.elegir', requestId, ronda: 1, turno: 1, jugadorId: 1 };
    const propio = await wsA.enviarYEsperarAck(valido);
    expect(propio.error.codigo).toBe('DRAFT_NO_ACTIVO');
    await wsB.enviarYEsperarAck(valido);
    // Cada participante tiene su propio ámbito: el segundo no recibe la respuesta guardada del primero.
    expect(await filas()).toBe(2);
    await wsA.cerrar();
    await wsB.cerrar();
  });
});
