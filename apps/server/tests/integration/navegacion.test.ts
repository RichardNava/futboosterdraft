/**
 * Navegación libre: pausa en solitario, abandono en el draft y «Mis partidas» (FR-017 a FR-021; research
 * R10 y R11; T104).
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('navegación (US6)', () => {
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

  async function draftEnSolitario() {
    const u = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    const partidaId: string = r.cuerpo.id;
    const ws = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    const turno = await ws.esperar('draft.turno');
    return { u, partidaId, ws, turno };
  }

  async function draftConDosHumanos() {
    const humanos: UsuarioPrueba[] = [await crearRegistrado(srv.url), await crearRegistrado(srv.url)];
    const r = await peticion(srv.url, '/api/partidas', { cookie: humanos[0]!.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, plazasHumanas: 2 } });
    const partidaId: string = r.cuerpo.id;
    await peticion(srv.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: humanos[1]!.cookie });
    const [a, b] = await Promise.all(humanos.map((h) => ClienteWs.conectar(srv.urlWs, partidaId, h.cookie)));
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: humanos[0]!.cookie });
    const turnoA = await a!.esperar('draft.turno');
    const turnoB = await b!.esperar('draft.turno');
    return { humanos, partidaId, a: a!, b: b!, turnoA, turnoB };
  }

  it('partida.pausar en un draft de un humano detiene el turno y al reconectar sigue con el tiempo que quedaba', async () => {
    const { u, partidaId, ws, turno } = await draftEnSolitario();
    srv.reloj.avanzar(10_000);
    const desde = ws.recibidos.length;
    const ack = await ws.enviarYEsperarAck({ t: 'partida.pausar' });
    expect(ack.ok).toBe(true);
    expect((await ws.esperar('partida.pausada', { desde })).pausada).toBe(true);
    const restante = new Date(turno.venceEn).getTime() - srv.reloj.ahora();
    const fila = await bd.db.execute<{ pausada_en: Date | null; restante_ms: number | null }>(sql`select pausada_en, restante_ms from mesas where partida_id = ${partidaId}`);
    expect(fila.rows[0]!.pausada_en).not.toBeNull();
    expect(fila.rows[0]!.restante_ms).toBe(restante);

    // Mientras está pausada el turno no vence, aunque pase mucho tiempo.
    await ws.cerrar();
    srv.reloj.avanzar(120_000);
    await espera(100);
    const otra = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
    const estado = await otra.esperar('estado');
    expect(estado.vista.draft.turno).toBe(turno.turno);
    expect(new Date(estado.vista.draft.venceEn).getTime()).toBe(srv.reloj.ahora() + restante);
    expect((await otra.esperar('partida.pausada')).pausada).toBe(false);
    expect(otra.recibidos.some((m) => m.t === 'draft.eleccion_auto')).toBe(false);
    await otra.cerrar();
  });

  it('partida.pausar no tiene efecto con varios humanos', async () => {
    const { a, b, turnoA } = await draftConDosHumanos();
    const desde = a.recibidos.length;
    await a.enviarYEsperarAck({ t: 'partida.pausar' });
    expect((await a.esperar('partida.pausada', { desde })).pausada).toBe(false);
    // El turno sigue corriendo: al vencer, se elige solo.
    srv.reloj.avanzar(new Date(turnoA.venceEn).getTime() - srv.reloj.ahora() + 1);
    await a.esperar('draft.eleccion_auto', { desde });
    await a.cerrar();
    await b.cerrar();
  });

  it('abandonar en un draft con otro humano: un NPC intermedio ocupa la plaza y elige al instante', async () => {
    const { humanos, partidaId, a, b, turnoB } = await draftConDosHumanos();
    const r = await peticion(srv.url, `/api/partidas/${partidaId}/abandonar`, { metodo: 'POST', cookie: humanos[0]!.cookie });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    const fila = await bd.db.execute<{ controlado_por_npc: boolean; nivel_npc: string }>(sql`select controlado_por_npc, nivel_npc from participantes where partida_id = ${partidaId} and tipo = 'humano' and controlado_por_npc`);
    expect(fila.rows).toHaveLength(1);
    expect(fila.rows[0]!.nivel_npc).toBe('intermedio');

    // B elige y el turno se resuelve sin esperar al que se fue.
    const desdeA = a.recibidos.length;
    const desdeB = b.recibidos.length;
    const ack = await b.enviarYEsperarAck({ t: 'draft.elegir', ronda: turnoB.ronda, turno: turnoB.turno, jugadorId: turnoB.sobre.cartas[0].id });
    expect(ack.ok, JSON.stringify(ack)).toBe(true);
    const siguiente = await b.esperar('draft.turno', { desde: desdeB });
    expect(siguiente.turno).toBe(turnoB.turno + 1);
    await espera(100);
    // El que abandonó ya no recibe los mensajes del draft.
    expect(a.recibidos.slice(desdeA).some((m) => m.t === 'draft.turno' || m.t === 'draft.progreso')).toBe(false);
    await a.cerrar();
    await b.cerrar();
  });

  it('GET /api/mis-partidas devuelve las partidas en curso y terminadas con la acción pendiente', async () => {
    const { u, partidaId, ws } = await draftEnSolitario();
    const r = await peticion(srv.url, '/api/mis-partidas', { cookie: u.cookie });
    expect(r.estado).toBe(200);
    expect(r.cuerpo.terminadas).toEqual([]);
    expect(r.cuerpo.enCurso).toHaveLength(1);
    const p = r.cuerpo.enCurso[0];
    expect(p).toMatchObject({ id: partidaId, modo: 'liga', fase: 'en_draft', accionPendiente: 'elegir' });
    expect(p.nombreEquipo).toBeTruthy();
    expect(new Date(p.actualizadaEn).toString()).not.toBe('Invalid Date');
    await ws.cerrar();
  });
});
