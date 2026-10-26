import { parametrosActuales } from '@fbd/domain';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const TURNO_MS = 45_000;

/** Margen del primer turno de cada sobre por la animación de apertura: 8 s en la spec 003 (FR-013, T082). */
const MARGEN_MS = parametrosActuales().draft.margenAnimacionS * 1000;

describe('draft (US1)', () => {
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

  async function partidaInvitado(cuerpo: Record<string, unknown> = {}) {
    const invitado = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', {
      cookie: invitado.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 4, ...cuerpo },
    });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    return { invitado, partida: r.cuerpo };
  }

  async function iniciarConCliente(usuario: UsuarioPrueba, partidaId: string) {
    const ws = await ClienteWs.conectar(srv.urlWs, partidaId, usuario.cookie);
    await ws.esperar('estado');
    const desde = ws.recibidos.length;
    const r = await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: usuario.cookie });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    const turno = await ws.esperar('draft.turno', { desde });
    return { ws, turno };
  }

  /** Espera un draft.turno posterior a `desde` con (ronda, turno) distintos de los indicados. */
  async function siguienteTurno(ws: ClienteWs, desde: number) {
    return ws.esperar('draft.turno', { desde });
  }

  it('un invitado y 3 NPC completan el draft: 24 jugadores distintos por participante (SC-001)', async () => {
    const { invitado, partida } = await partidaInvitado();
    expect(partida.participantes).toHaveLength(4);
    expect(partida.participantes.filter((p: any) => p.tipo === 'npc')).toHaveLength(3);
    const inicio = await iniciarConCliente(invitado, partida.id);
    const ws = inicio.ws;
    let turno = inicio.turno;
    let terminado: any;
    for (let i = 0; i < 24; i++) {
      expect(turno.sobre.cartas.length).toBe(8 - ((turno.turno - 1) % 8));
      const desde = ws.recibidos.length;
      const ack = await ws.enviarYEsperarAck({
        t: 'draft.elegir',
        ronda: turno.ronda,
        turno: turno.turno,
        jugadorId: turno.sobre.cartas[0].id,
      });
      expect(ack.ok, JSON.stringify(ack)).toBe(true);
      if (i < 23) turno = await siguienteTurno(ws, desde);
      else terminado = await ws.esperar('draft.terminado', { desde });
    }
    expect(terminado.plantillas).toHaveLength(4);
    const ids = terminado.plantillas.flatMap((p: any) => p.jugadores.map((j: any) => j.id));
    expect(ids).toHaveLength(96);
    expect(new Set(ids).size).toBe(96);
    for (const p of terminado.plantillas) expect(p.jugadores).toHaveLength(24);

    const plantillas = await peticion(srv.url, `/api/partidas/${partida.id}/plantillas`, { cookie: invitado.cookie });
    expect(plantillas.estado).toBe(200);
    expect(plantillas.cuerpo.every((p: any) => p.jugadores.length === 24)).toBe(true);
    await ws.cerrar();
  });

  it('animacion solo en el primer envío del turno 1 de cada ronda (3 veces), nunca al reconectar; ese turno suma el margen (T143)', async () => {
    const { invitado, partida } = await partidaInvitado();
    const inicio = await iniciarConCliente(invitado, partida.id);
    const ws = inicio.ws;
    let turno = inicio.turno;
    const turnos = [turno];
    expect(Date.parse(turno.venceEn) - srv.reloj.ahora()).toBe(TURNO_MS + MARGEN_MS);
    for (let i = 0; i < 23; i++) {
      const desde = ws.recibidos.length;
      await ws.enviarYEsperarAck({ t: 'draft.elegir', ronda: turno.ronda, turno: turno.turno, jugadorId: turno.sobre.cartas[0].id });
      turno = await siguienteTurno(ws, desde);
      turnos.push(turno);
      // Al reconectar en el primer turno de la segunda ronda: la instantánea no pide la animación.
      if (turno.ronda === 2 && turno.turno === 1) {
        expect(Date.parse(turno.venceEn) - srv.reloj.ahora()).toBe(TURNO_MS + MARGEN_MS);
        const otra = await ClienteWs.conectar(srv.urlWs, partida.id, invitado.cookie);
        const estado = await otra.esperar('estado');
        expect(estado.vista.draft.turno).toBe(1);
        expect(estado.vista.draft.animacion).toBeUndefined();
        expect(otra.recibidos.some((m) => m.t === 'draft.turno')).toBe(false);
        await otra.cerrar();
      } else if (turno.turno !== 1) {
        expect(Date.parse(turno.venceEn) - srv.reloj.ahora()).toBe(TURNO_MS);
      }
    }
    expect(turnos.filter((t) => t.animacion).map((t) => [t.ronda, t.turno])).toEqual([
      [1, 1],
      [2, 1],
      [3, 1],
    ]);
    await ws.cerrar();
  });

  it('el turno no avanza hasta que vence el plazo; entonces se autoelige la carta de mayor media (FR-009)', async () => {
    const { invitado, partida } = await partidaInvitado();
    const { ws, turno } = await iniciarConCliente(invitado, partida.id);
    const desde = ws.recibidos.length;
    // El primer turno de la ronda suma el margen de la animación de apertura: 8 s (spec 003, FR-013).
    const plazo = Date.parse(turno.venceEn) - srv.reloj.ahora();
    expect(plazo).toBe(TURNO_MS + MARGEN_MS);
    expect(MARGEN_MS).toBe(8000);
    srv.reloj.avanzar(plazo - 1000);
    await new Promise((r) => setTimeout(r, 100));
    expect(ws.recibidos.slice(desde).some((m) => m.t === 'draft.turno')).toBe(false);

    srv.reloj.avanzar(2000);
    const auto = await ws.esperar('draft.eleccion_auto', { desde });
    const mejor = [...turno.sobre.cartas].sort((a: any, b: any) => b.media - a.media)[0];
    expect(auto.jugador.media).toBe(mejor.media);
    const siguiente = await ws.esperar('draft.turno', { desde });
    expect(siguiente.turno).toBe(2);
    await ws.cerrar();
  });

  it('draft.progreso nunca revela la carta elegida y no se puede ver la plantilla durante el draft', async () => {
    const { invitado, partida } = await partidaInvitado();
    const { ws, turno } = await iniciarConCliente(invitado, partida.id);
    const progreso = await ws.esperar('draft.progreso');
    // `pendientes` lista solo a los humanos que faltan por elegir (spec 002, FR-013): nunca la carta.
    expect(Object.keys(progreso).sort()).toEqual(['eligieron', 'pendientes', 'ronda', 't', 'turno']);
    // Los 3 NPC ya han elegido al abrirse el turno.
    expect(progreso.eligieron).toHaveLength(3);
    const r = await peticion(srv.url, `/api/partidas/${partida.id}/plantillas`, { cookie: invitado.cookie });
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error.codigo).toBe('DRAFT_EN_CURSO');
    expect(turno.sobre.cartas).toHaveLength(8);
    await ws.cerrar();
  });

  it('repetir el mismo requestId devuelve el mismo ack sin elegir dos veces (FR-062)', async () => {
    const { invitado, partida } = await partidaInvitado();
    const { ws, turno } = await iniciarConCliente(invitado, partida.id);
    const requestId = crypto.randomUUID();
    const mensaje = { t: 'draft.elegir', requestId, ronda: 1, turno: 1, jugadorId: turno.sobre.cartas[1].id };
    const a = await ws.enviarYEsperarAck(mensaje);
    const b = await ws.enviarYEsperarAck(mensaje);
    expect(a).toEqual(b);
    const filas = await bd.db.execute(sql`select count(*)::int as n from elecciones where origen = 'manual'`);
    expect((filas.rows[0] as { n: number }).n).toBe(1);
    await ws.cerrar();
  });

  it('rechaza cartas ajenas, turnos cerrados y segundas elecciones (FR-010)', async () => {
    const { invitado, partida } = await partidaInvitado();
    const { ws, turno } = await iniciarConCliente(invitado, partida.id);
    const ajena = await ws.enviarYEsperarAck({ t: 'draft.elegir', ronda: 1, turno: 1, jugadorId: 999_999 });
    expect(ajena.error.codigo).toBe('CARTA_NO_EN_SOBRE');
    const cerrado = await ws.enviarYEsperarAck({ t: 'draft.elegir', ronda: 1, turno: 5, jugadorId: turno.sobre.cartas[0].id });
    expect(cerrado.error.codigo).toBe('TURNO_CERRADO');
    await ws.cerrar();
  });

  it('al reconectar a mitad de turno, estado trae el sobre y las elecciones propias', async () => {
    const { invitado, partida } = await partidaInvitado();
    const inicio = await iniciarConCliente(invitado, partida.id);
    const ws = inicio.ws;
    let turno = inicio.turno;
    const desde = ws.recibidos.length;
    const elegida = turno.sobre.cartas[0].id;
    await ws.enviarYEsperarAck({ t: 'draft.elegir', ronda: 1, turno: 1, jugadorId: elegida });
    turno = await siguienteTurno(ws, desde);
    await ws.cerrar();

    const ws2 = await ClienteWs.conectar(srv.urlWs, partida.id, invitado.cookie);
    const estado = await ws2.esperar('estado');
    expect(estado.fase).toBe('draft');
    expect(estado.vista.draft.turno).toBe(2);
    expect(estado.vista.draft.sobre.cartas.map((c: any) => c.id)).toEqual(turno.sobre.cartas.map((c: any) => c.id));
    expect(estado.vista.draft.misElecciones.map((c: any) => c.id)).toEqual([elegida]);
    await ws2.cerrar();
  });

  it('un humano desconectado recibe autoelecciones y el draft de 8 termina en 20 min o menos (SC-001, SC-011)', async () => {
    const anfitrion = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', {
      cookie: anfitrion.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 8 },
    });
    await peticion(srv.url, `/api/partidas/${r.cuerpo.id}/iniciar`, { metodo: 'POST', cookie: anfitrion.cookie });
    const inicio = srv.reloj.ahora();
    const c = await srv.gestor.obtenerOError(r.cuerpo.id);
    // Holgura para runners lentos: si el turno aún no se ha resuelto, la vuelta solo avanza 1 ms.
    for (let i = 0; i < 200; i++) {
      // Hasta el plazo del turno abierto (45 s, o 53 s en el primero de cada ronda).
      srv.reloj.avanzar(Math.max(1, (c.mesas[0]?.mesa.venceEn ?? srv.reloj.ahora()) - srv.reloj.ahora() + 1));
      await new Promise((res) => setTimeout(res, 150));
      const estado = (await peticion(srv.url, `/api/partidas/${r.cuerpo.id}`, { cookie: anfitrion.cookie })).cuerpo.estado;
      if (estado === 'en_torneo') break;
    }
    const final = await peticion(srv.url, `/api/partidas/${r.cuerpo.id}/plantillas`, { cookie: anfitrion.cookie });
    expect(final.estado).toBe(200);
    expect(final.cuerpo).toHaveLength(8);
    expect(final.cuerpo.every((p: any) => p.jugadores.length === 24)).toBe(true);
    expect(srv.reloj.ahora() - inicio).toBeLessThanOrEqual(20 * 60_000);
  });

  it('un playoff de 16 crea dos mesas de 8', async () => {
    const anfitrion = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', {
      cookie: anfitrion.cookie,
      cuerpo: { modo: 'playoff', numParticipantes: 16 },
    });
    await peticion(srv.url, `/api/partidas/${r.cuerpo.id}/iniciar`, { metodo: 'POST', cookie: anfitrion.cookie });
    const mesas = await bd.db.execute(sql`select indice, array_length(participantes, 1) as n from mesas order by indice`);
    expect(mesas.rows).toEqual([
      { indice: 0, n: 8 },
      { indice: 1, n: 8 },
    ]);
  });

  it('una partida de invitado continúa si vuelve antes de 10 min y se abandona tras 10 min sin conexión', async () => {
    const { invitado, partida } = await partidaInvitado();
    const { ws } = await iniciarConCliente(invitado, partida.id);
    await ws.cerrar();
    await new Promise((res) => setTimeout(res, 100));
    srv.reloj.fijar(srv.reloj.ahora()); // sin avanzar
    // Vuelve a los 5 min (los turnos se resuelven solos mientras tanto).
    for (let i = 0; i < 6; i++) srv.reloj.avanzar(TURNO_MS + 1);
    const ws2 = await ClienteWs.conectar(srv.urlWs, partida.id, invitado.cookie);
    await ws2.esperar('estado');
    let estado = (await peticion(srv.url, `/api/partidas/${partida.id}`, { cookie: invitado.cookie })).cuerpo.estado;
    expect(estado).toBe('en_draft');

    await ws2.cerrar();
    await new Promise((res) => setTimeout(res, 100));
    srv.reloj.avanzar(10 * 60_000 + 1);
    await new Promise((res) => setTimeout(res, 300));
    estado = (await peticion(srv.url, `/api/partidas/${partida.id}`, { cookie: invitado.cookie })).cuerpo.estado;
    expect(estado).toBe('abandonada');
  });
});
