import { ResumenPartida } from '@fbd/protocol';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearInvitado, crearRegistrado, peticion } from '../helpers/usuarios';

const base = { modo: 'liga', numParticipantes: 4, tipoSimulacion: 'rapida', ritmo: 'directo' };

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

  it('422 NUM_PARTICIPANTES_INVALIDO', async () => {
    const u = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { ...base, modo: 'playoff', numParticipantes: 6 } });
    expect(r.estado).toBe(422);
    expect(r.cuerpo.error.codigo).toBe('NUM_PARTICIPANTES_INVALIDO');
  });

  it('un invitado no puede crear una partida asíncrona ni con plazas humanas (403 INVITADO_NO_PERMITIDO)', async () => {
    const g = await crearInvitado(srv.url);
    const asincrona = await peticion(srv.url, '/api/partidas', { cookie: g.cookie, cuerpo: { ...base, ritmo: 'asincrono' } });
    expect(asincrona.estado).toBe(403);
    expect(asincrona.cuerpo.error.codigo).toBe('INVITADO_NO_PERMITIDO');
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
