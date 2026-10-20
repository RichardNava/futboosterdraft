/**
 * Avanzar sin esperas (US2; FR-011 a FR-016, SC-003; T054): fuera del draft, cada botón avanza al instante;
 * en el draft, el turno se resuelve en cuanto eligen todos los humanos, y se ve a quién se espera.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { partidaTrasDraft } from '../helpers/partidas';
import { avanzarHasta, espera, jugarSolo, seguirSiempre, torneo } from '../helpers/torneo';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('avanzar sin esperas (US2)', () => {
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

  it('draft de 1 humano y 7 NPC: tras elegir, el siguiente sobre llega en menos de 1 s (SC-003, SC-004)', async () => {
    const u = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 8 } });
    const ws = await ClienteWs.conectar(srv.urlWs, r.cuerpo.id, u.cookie);
    await peticion(srv.url, `/api/partidas/${r.cuerpo.id}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    const turnos = () => ws.recibidos.filter((m) => m.t === 'draft.turno');
    const hastaQueHaya = async (n: number) => {
      for (let i = 0; i < 300 && turnos().length < n; i++) await espera(10);
      return turnos().length >= n;
    };
    for (let n = 0; n < 24; n++) {
      expect(await hastaQueHaya(n + 1)).toBe(true);
      const turno = turnos()[n]!;
      const t0 = Date.now();
      const ack = await ws.enviarYEsperarAck({ t: 'draft.elegir', ronda: turno.ronda, turno: turno.turno, jugadorId: turno.sobre.cartas[0].id });
      expect(ack.ok, JSON.stringify(ack)).toBe(true);
      if (n === 23) break;
      expect(await hastaQueHaya(n + 2)).toBe(true);
      expect(Date.now() - t0).toBeLessThan(1000);
    }
    await ws.esperar('draft.terminado');
    await ws.cerrar();
  });

  it('con dos humanos: «Esperando a…» lista solo a los humanos que faltan, y el turno se resuelve al elegir el último (FR-013)', async () => {
    const a = await crearRegistrado(srv.url);
    const b = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: a.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, plazasHumanas: 2 } });
    const partidaId: string = r.cuerpo.id;
    await peticion(srv.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: b.cookie });
    const [wa, wb] = await Promise.all([ClienteWs.conectar(srv.urlWs, partidaId, a.cookie), ClienteWs.conectar(srv.urlWs, partidaId, b.cookie)]);
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: a.cookie });
    const ta = await wa.esperar('draft.turno');
    const tb = await wb.esperar('draft.turno');
    const desde = wa.recibidos.length;
    await wa.enviarYEsperarAck({ t: 'draft.elegir', ronda: ta.ronda, turno: ta.turno, jugadorId: ta.sobre.cartas[0].id });
    const c = await srv.gestor.obtenerOError(partidaId);
    const ia = c.participanteDeUsuario(a.id)!.id;
    const ib = c.participanteDeUsuario(b.id)!.id;
    let progreso = await wa.esperar('draft.progreso', { desde });
    for (let i = 0; i < 50 && !progreso.eligieron.includes(ia); i++) {
      await espera(10);
      progreso = wa.recibidos.filter((m) => m.t === 'draft.progreso').at(-1)!;
    }
    expect(progreso.pendientes).toEqual([{ id: ib, nombre: expect.any(String) }]);
    const antes = wa.recibidos.length;
    await wb.enviarYEsperarAck({ t: 'draft.elegir', ronda: tb.ronda, turno: tb.turno, jugadorId: tb.sobre.cartas[0].id });
    const siguiente = await wa.esperar('draft.turno', { desde: antes });
    expect(siguiente.turno).toBe(ta.turno + 1);
    await wa.cerrar();
    await wb.cerrar();
  });

  it('«Seguir» en el descanso reanuda al instante (FR-012)', async () => {
    const { anfitrion: u, partida } = await partidaTrasDraft(srv, { invitado: true });
    const ws = await ClienteWs.conectar(srv.urlWs, partida.id, u.cookie);
    const prep = await ws.esperar('preparacion.inicio').catch(async () => {
      const t = await torneo(srv, partida.id, u);
      return { partidoId: t.jornadas[0].partidos.find((p: any) => p.estado === 'programado').partidoId };
    });
    const desde = ws.recibidos.length;
    await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie });
    const pausa = await ws.esperar('partido.pausa_decision', { desde });
    const t0 = Date.now();
    await ws.enviarYEsperarAck({ t: 'partido.seguir', partidoId: pausa.partidoId });
    await ws.esperar('partido.fin', { desde });
    expect(Date.now() - t0).toBeLessThan(1000);
    await ws.cerrar();
  });

  it('«Siguiente jornada»: abre la siguiente y resuelve los NPC contra NPC; errores de contracts/http-api.md', async () => {
    const { anfitrion: u, partida } = await partidaTrasDraft(srv, { invitado: true });
    const partidaId = partida.id;
    const ws = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
    const parar = seguirSiempre(ws);
    // Con la jornada 1 abierta: 409 JORNADA_ABIERTA.
    const pronto = await peticion(srv.url, `/api/partidas/${partidaId}/siguiente-jornada`, { metodo: 'POST', cookie: u.cookie });
    expect(pronto.estado).toBe(409);
    expect(pronto.cuerpo.error.codigo).toBe('JORNADA_ABIERTA');
    // Juega su partido: la jornada se cierra, pero la siguiente no se abre sola.
    await jugarSolo(srv, partidaId, u, async () => (await torneo(srv, partidaId, u)).jornadas[0].estado === 'cerrada');
    expect((await torneo(srv, partidaId, u)).jornadas[1].estado).toBe('pendiente');
    // Dos pulsaciones seguidas: una sola transición (FR-016).
    const [r1, r2] = await Promise.all([
      peticion(srv.url, `/api/partidas/${partidaId}/siguiente-jornada`, { metodo: 'POST', cookie: u.cookie }),
      peticion(srv.url, `/api/partidas/${partidaId}/siguiente-jornada`, { metodo: 'POST', cookie: u.cookie }),
    ]);
    expect([r1.estado, r2.estado].sort()).toEqual([200, 409]);
    const t = await torneo(srv, partidaId, u);
    expect(t.jornadaActual).toBe(2);
    const yo = (await srv.gestor.obtenerOError(partidaId)).participanteDeUsuario(u.id)!.id;
    for (const p of t.jornadas[1].partidos) {
      const mio = p.local.id === yo || p.visitante.id === yo;
      expect(p.estado).toBe(mio ? 'programado' : 'finalizado');
    }
    // Al terminar el torneo: 409 TORNEO_TERMINADO.
    await jugarSolo(srv, partidaId, u, async () => (await torneo(srv, partidaId, u)).campeon !== null);
    const fin = await peticion(srv.url, `/api/partidas/${partidaId}/siguiente-jornada`, { metodo: 'POST', cookie: u.cookie });
    expect(fin.estado).toBe(409);
    expect(fin.cuerpo.error.codigo).toBe('TORNEO_TERMINADO');
    parar();
    await ws.cerrar();
  });

  it('con varios humanos, «Siguiente jornada» no está disponible (403 HAY_VARIOS_HUMANOS)', async () => {
    const b: UsuarioPrueba = await crearRegistrado(srv.url);
    const { anfitrion: a, partida } = await partidaTrasDraft(srv, { cuerpo: { plazasHumanas: 2 }, otros: [b] });
    await avanzarHasta(srv, 1000, async () => (await torneo(srv, partida.id, a)).jornadaActual === 1);
    const r = await peticion(srv.url, `/api/partidas/${partida.id}/siguiente-jornada`, { metodo: 'POST', cookie: a.cookie });
    expect(r.estado).toBe(403);
    expect(r.cuerpo.error.codigo).toBe('HAY_VARIOS_HUMANOS');
  });

  it('repetir «Comenzar partido» con el mismo Idempotency-Key produce una sola transición (FR-016)', async () => {
    const { anfitrion: u, partida } = await partidaTrasDraft(srv, { invitado: true });
    const t = await torneo(srv, partida.id, u);
    const mio = t.jornadas[0].partidos.find((p: any) => p.estado === 'programado');
    const clave = 'clave-repetida-123';
    const r = await Promise.all(
      [1, 2].map(() => fetch(`${srv.url}/api/partidos/${mio.partidoId}/abrir`, { method: 'POST', headers: { cookie: u.cookie, 'idempotency-key': clave } })),
    );
    expect(r.map((x) => x.status)).toEqual([200, 200]);
    const c = await srv.gestor.obtenerOError(partida.id);
    const filas = await c.servicios.repoPartidos.resumenesDePartida(partida.id);
    expect(filas.filter((f) => f.id === mio.partidoId)).toHaveLength(1);
    expect(srv.metricas.partidosSimuladosTotal).toBeDefined();
  });
});
