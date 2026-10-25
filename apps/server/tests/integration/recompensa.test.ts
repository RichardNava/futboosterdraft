/**
 * Recompensa de torneo (spec 006, US3; T054; R14, FR-019, SC-008): 10 fragmentos al campeón registrado, una sola vez.
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { saldoYSuma } from '../helpers/economia';
import { avanzarHasta, jugarSolo, seguirSiempre, torneo } from '../helpers/torneo';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('recompensa de torneo (spec 006)', () => {
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

  const economia = () => srv.gestor.servicios.economia;

  it('un registrado recibe 10 con referencia a la partida; repetir no duplica', async () => {
    const u = await crearRegistrado(srv.url);
    const partidaId = randomUUID();
    expect(await economia().recompensarTorneo(u.id, partidaId, 10)).toBe(true);
    expect(await economia().recompensarTorneo(u.id, partidaId, 10)).toBe(false);
    const movs = await bd.db.execute<{ importe: number; referencia: string }>(
      sql`select importe, referencia from movimientos_fragmentos where usuario_id = ${u.id} and motivo = 'recompensa_torneo'`,
    );
    expect(movs.rows).toEqual([{ importe: 10, referencia: partidaId }]);
    expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 10, suma: 10 });
    expect(await economia().recompensaDe(u.id, partidaId)).toBe(10);
  });

  it('un invitado no recibe nada', async () => {
    const u = await crearInvitado(srv.url);
    expect(await economia().recompensarTorneo(u.id, randomUUID(), 10)).toBe(false);
    expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 0, suma: 0 });
  });

  async function jugarLiga(u: UsuarioPrueba) {
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, npc: [], dificultad: 'facil' } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    const partidaId: string = r.cuerpo.id;
    const ws = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
    const parar = seguirSiempre(ws);
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, u)).jornadaActual === 1);
    await jugarSolo(srv, partidaId, u, async () => (await torneo(srv, partidaId, u)).campeon !== null);
    parar();
    await ws.cerrar();
    return { partidaId, t: await torneo(srv, partidaId, u) };
  }

  it('al terminar un torneo, la vista da 10 al campeón registrado y null si ganó otro; nunca se duplica', { timeout: 300_000 }, async () => {
    const u = await crearRegistrado(srv.url);
    const { partidaId, t } = await jugarLiga(u);
    const yoCampeon = t.campeon.id === (await bd.db.execute<{ id: string }>(sql`select id from participantes where partida_id = ${partidaId} and usuario_id = ${u.id}`)).rows[0]!.id;
    expect(t.recompensaFragmentos).toBe(yoCampeon ? 10 : null);
    expect(await saldoYSuma(bd.db, u.id)).toEqual(yoCampeon ? { saldo: 10, suma: 10 } : { saldo: 0, suma: 0 });
    // Recargar la vista no recompensa otra vez.
    expect((await torneo(srv, partidaId, u)).recompensaFragmentos).toBe(t.recompensaFragmentos);
    expect((await saldoYSuma(bd.db, u.id)).saldo).toBe(yoCampeon ? 10 : 0);
  });

  it('una partida cancelada no recompensa', async () => {
    const u = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, plazasHumanas: 2 } });
    expect(r.estado).toBe(201);
    await peticion(srv.url, `/api/partidas/${r.cuerpo.id}/abandonar`, { metodo: 'POST', cookie: u.cookie });
    expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 0, suma: 0 });
  });
});
