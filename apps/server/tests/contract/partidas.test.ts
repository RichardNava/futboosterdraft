import { ResumenPartida } from '@fbd/protocol';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearInvitado, crearRegistrado, peticion } from '../helpers/usuarios';

const base = { modo: 'liga', numParticipantes: 4 };

describe('contrato HTTP de partidas', () => {
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

  it('POST /api/partidas crea la partida y devuelve un ResumenPartida', async () => {
    const u = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { ...base, npc: [{ nivel: 'PRO' }] } });
    expect(r.estado).toBe(201);
    const resumen = ResumenPartida.parse(r.cuerpo);
    expect(resumen.estado).toBe('buscando');
    expect(resumen.participantes.map((p) => p.nivelNPC)).toEqual([null, 'PRO']);
    expect(resumen.miParticipanteId).toBe(resumen.participantes[0]!.id);
  });

  it('el tipo de simulación ya no se elige al crear la partida: sin él funciona y, si se envía, se ignora (spec 003, T046)', async () => {
    const u = await crearRegistrado(srv.url);
    const sin = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: base });
    expect(sin.estado).toBe(201);
    expect(sin.cuerpo).not.toHaveProperty('tipoSimulacion');
    const con = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { ...base, tipoSimulacion: '2d' } });
    expect(con.estado).toBe(201);
    expect(con.cuerpo).not.toHaveProperty('tipoSimulacion');
    const leida = await peticion(srv.url, `/api/partidas/${con.cuerpo.id}`, { cookie: u.cookie });
    expect(leida.estado).toBe(200);
    expect(leida.cuerpo).not.toHaveProperty('tipoSimulacion');
  });

  it('la dificultad es «normal» por defecto, se devuelve en el resumen y una desconocida es un 400 (spec 003, FR-038a)', async () => {
    const u = await crearRegistrado(srv.url);
    const sin = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: base });
    expect(ResumenPartida.parse(sin.cuerpo).dificultad).toBe('normal');
    const dificil = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { ...base, dificultad: 'dificil' } });
    expect(dificil.estado).toBe(201);
    const leida = await peticion(srv.url, `/api/partidas/${dificil.cuerpo.id}`, { cookie: u.cookie });
    expect(ResumenPartida.parse(leida.cuerpo).dificultad).toBe('dificil');
    const mala = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { ...base, dificultad: 'imposible' } });
    expect(mala.estado).toBe(400);
  });

  it.each([
    ['facil', ['amateur', 'intermedio']],
    ['dificil', ['intermedio', 'avanzado']],
  ] as const)('con dificultad «%s», el relleno usa solo %j a partes iguales y conserva el PRO añadido a mano (FR-038a)', async (dificultad, permitidos) => {
    const g = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', {
      cookie: g.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 8, dificultad, npc: [{ nivel: 'PRO' }] },
    });
    expect(r.estado).toBe(201);
    const niveles = ResumenPartida.parse(r.cuerpo).participantes.map((p) => p.nivelNPC);
    expect(niveles.filter((n) => n === 'PRO')).toHaveLength(1);
    const relleno = niveles.filter((n) => n !== null && n !== 'PRO');
    expect(relleno).toHaveLength(6);
    expect(relleno.every((n) => (permitidos as readonly string[]).includes(n!))).toBe(true);
    expect(relleno.filter((n) => n === permitidos[0])).toHaveLength(3);
  });

  it('422 NUM_PARTICIPANTES_INVALIDO', async () => {
    const u = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { ...base, modo: 'playoff', numParticipantes: 6 } });
    expect(r.estado).toBe(422);
    expect(r.cuerpo.error.codigo).toBe('NUM_PARTICIPANTES_INVALIDO');
  });

  it('el ritmo ya no se elige: un cuerpo con `ritmo` o con tiempos de preparación es un 400 (research R9)', async () => {
    const u = await crearRegistrado(srv.url);
    const conRitmo = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { ...base, ritmo: 'directo' } });
    expect(conRitmo.estado).toBe(400);
    const conPreparacion = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { ...base, tiempos: { preparacionS: 60 } } });
    expect(conPreparacion.estado).toBe(400);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: base });
    expect(ResumenPartida.parse(r.cuerpo).conPlazos).toBe(false);
  });

  it('un invitado no puede crear una partida con plazas humanas (403 INVITADO_NO_PERMITIDO)', async () => {
    const g = await crearInvitado(srv.url);
    const conHumanos = await peticion(srv.url, '/api/partidas', { cookie: g.cookie, cuerpo: { ...base, plazasHumanas: 2 } });
    expect(conHumanos.estado).toBe(403);
  });

  it('la partida de un invitado se rellena con NPC al crearse', async () => {
    const g = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: g.cookie, cuerpo: base });
    expect(r.cuerpo.participantes).toHaveLength(4);
    expect(r.cuerpo.participantes.filter((p: any) => p.tipo === 'npc').every((p: any) => p.nivelNPC !== 'PRO')).toBe(true);
  });

  it('unirse: 409 PARTIDA_COMPLETA y 409 PARTIDA_INICIADA; los invitados no pueden unirse', async () => {
    const anfitrion = await crearRegistrado(srv.url);
    const p = (await peticion(srv.url, '/api/partidas', { cookie: anfitrion.cookie, cuerpo: { ...base, plazasHumanas: 2 } })).cuerpo;
    const otro = await crearRegistrado(srv.url);
    expect((await peticion(srv.url, `/api/partidas/${p.id}/unirse`, { metodo: 'POST', cookie: otro.cookie })).estado).toBe(200);
    const tercero = await crearRegistrado(srv.url);
    const completa = await peticion(srv.url, `/api/partidas/${p.id}/unirse`, { metodo: 'POST', cookie: tercero.cookie });
    expect(completa.estado).toBe(409);
    expect(completa.cuerpo.error.codigo).toBe('PARTIDA_COMPLETA');

    const g = await crearInvitado(srv.url);
    const invitado = await peticion(srv.url, `/api/partidas/${p.id}/unirse`, { metodo: 'POST', cookie: g.cookie });
    expect(invitado.estado).toBe(403);

    await peticion(srv.url, `/api/partidas/${p.id}/iniciar`, { metodo: 'POST', cookie: anfitrion.cookie });
    const tarde = await crearRegistrado(srv.url);
    const iniciada = await peticion(srv.url, `/api/partidas/${p.id}/unirse`, { metodo: 'POST', cookie: tarde.cookie });
    expect(iniciada.cuerpo.error.codigo).toBe('PARTIDA_INICIADA');
  });

  it('solo el anfitrión añade NPC (incluido PRO) e inicia la partida', async () => {
    const anfitrion = await crearRegistrado(srv.url);
    const p = (await peticion(srv.url, '/api/partidas', { cookie: anfitrion.cookie, cuerpo: base })).cuerpo;
    const otro = await crearRegistrado(srv.url);
    await peticion(srv.url, `/api/partidas/${p.id}/unirse`, { metodo: 'POST', cookie: otro.cookie });
    const ajeno = await peticion(srv.url, `/api/partidas/${p.id}/npc`, { cookie: otro.cookie, cuerpo: { nivel: 'PRO' } });
    expect(ajeno.estado).toBe(403);
    const propio = await peticion(srv.url, `/api/partidas/${p.id}/npc`, { cookie: anfitrion.cookie, cuerpo: { nivel: 'PRO' } });
    expect(propio.estado).toBe(200);
    expect(propio.cuerpo.participantes.some((x: any) => x.nivelNPC === 'PRO')).toBe(true);
    expect((await peticion(srv.url, `/api/partidas/${p.id}/iniciar`, { metodo: 'POST', cookie: otro.cookie })).estado).toBe(403);
    const iniciada = await peticion(srv.url, `/api/partidas/${p.id}/iniciar`, { metodo: 'POST', cookie: anfitrion.cookie });
    expect(iniciada.cuerpo.estado).toBe('en_draft');
    // El relleno automático nunca asigna PRO (FR-059): el único PRO es el que añadió el anfitrión.
    expect(iniciada.cuerpo.participantes.filter((x: any) => x.nivelNPC === 'PRO')).toHaveLength(1);
  });

  it('al iniciar, el relleno de las plazas libres sigue la dificultad de la partida (spec 003, FR-038a)', async () => {
    const anfitrion = await crearRegistrado(srv.url);
    const cuerpo = { modo: 'liga', numParticipantes: 8, plazasHumanas: 2, dificultad: 'facil' };
    const p = (await peticion(srv.url, '/api/partidas', { cookie: anfitrion.cookie, cuerpo })).cuerpo;
    const iniciada = await peticion(srv.url, `/api/partidas/${p.id}/iniciar`, { metodo: 'POST', cookie: anfitrion.cookie });
    const relleno = iniciada.cuerpo.participantes.map((x: any) => x.nivelNPC).filter((n: string | null) => n !== null);
    expect(relleno).toHaveLength(7);
    expect(relleno.every((n: string) => n === 'amateur' || n === 'intermedio')).toBe(true);
    expect(Math.abs(relleno.filter((n: string) => n === 'amateur').length * 2 - 7)).toBe(1);
  });

  it('al vencer la búsqueda se rellenan las plazas y empieza el draft (FR-003)', async () => {
    const anfitrion = await crearRegistrado(srv.url);
    const p = (await peticion(srv.url, '/api/partidas', { cookie: anfitrion.cookie, cuerpo: base })).cuerpo;
    srv.reloj.avanzar(180_000 + 1);
    await new Promise((r) => setTimeout(r, 300));
    const r = await peticion(srv.url, `/api/partidas/${p.id}`, { cookie: anfitrion.cookie });
    expect(r.cuerpo.estado).toBe('en_draft');
    expect(r.cuerpo.participantes).toHaveLength(4);
  });

  it('GET /api/partidas?estado=buscando solo para registrados', async () => {
    const g = await crearInvitado(srv.url);
    expect((await peticion(srv.url, '/api/partidas?estado=buscando', { cookie: g.cookie })).estado).toBe(403);
    const u = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas?estado=buscando', { cookie: u.cookie });
    expect(r.estado).toBe(200);
    expect(Array.isArray(r.cuerpo)).toBe(true);
  });
});
