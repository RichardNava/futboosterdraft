import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { programarJornada } from '../../src/actores/preparacion';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { crearInvitado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const TURNO = 46_000;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('partido rápido (US3)', () => {
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

  /**
   * Crea una liga de 4, se conecta con cada humano y completa el draft adelantando el reloj.
   * `cruces` permite fijar los emparejamientos de la primera jornada (por defecto, el provisional).
   */
  async function hastaPreparacion(
    humanos: UsuarioPrueba[],
    opciones: { cruces?: (ids: { humanos: string[]; npc: string[] }) => { local: string; visitante: string }[]; eliminatoria?: boolean } = {},
  ) {
    const [anfitrion, ...otros] = humanos;
    const r = await peticion(srv.url, '/api/partidas', {
      cookie: anfitrion!.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 4, tipoSimulacion: 'rapida', ...(anfitrion!.tipo === 'invitado' ? {} : { plazasHumanas: humanos.length }) },
    });
    const partidaId: string = r.cuerpo.id;
    for (const o of otros) await peticion(srv.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: o.cookie });
    const clientes = await Promise.all(humanos.map((h) => ClienteWs.conectar(srv.urlWs, partidaId, h.cookie)));
    const c = await srv.gestor.obtenerOError(partidaId);
    if (opciones.cruces) {
      c.programarPrimeraJornada = async (ctx) => {
        const hum = c.participantes.filter((p) => p.tipo === 'humano').map((p) => p.id);
        const npc = c.participantes.filter((p) => p.tipo === 'npc').map((p) => p.id);
        await programarJornada(c, ctx, 1, opciones.cruces!({ humanos: hum, npc }), { inicial: true, eliminatoria: opciones.eliminatoria });
      };
    }
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: anfitrion!.cookie });
    for (let i = 0; i < 30; i++) {
      if (clientes.every((cl) => cl.recibidos.some((m) => m.t === 'preparacion.inicio'))) break;
      srv.reloj.avanzar(TURNO);
      await espera(60);
    }
    return { partidaId, clientes, c };
  }

  /** «Comenzar partido»: el humano abre su partido de la jornada (spec 002; ya no hay temporizador de preparación). */
  async function comenzar(ws: ClienteWs, u: UsuarioPrueba): Promise<string> {
    const prep = await ws.esperar('preparacion.inicio');
    const r = await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie });
    expect(r.cuerpo.modo).toBe('directo');
    return prep.partidoId as string;
  }

  it('al pulsar «Comenzar partido» empieza el partido: alineaciones reveladas, descanso en ≤ 3 s y final tras «Seguir»', async () => {
    const invitado = await crearInvitado(srv.url);
    const { partidaId, clientes } = await hastaPreparacion([invitado]);
    const ws = clientes[0]!;
    const prep = await ws.esperar('preparacion.inicio');
    expect(prep.rival.nombre).toBeTruthy();
    // Antes de empezar, nadie ve la alineación rival.
    const antes = await peticion(srv.url, `/api/partidos/${prep.partidoId}`, { cookie: invitado.cookie });
    expect(antes.cuerpo.alineaciones).toBeUndefined();

    const desde = ws.recibidos.length;
    await comenzar(ws, invitado);
    const inicio = await ws.esperar('partido.inicio', { desde });
    const t0 = Date.now();
    // Sin alineación confirmada se usa la automática.
    expect(inicio.alineaciones.local.titulares).toHaveLength(11);
    expect(inicio.alineaciones.visitante.titulares).toHaveLength(11);
    expect(Object.keys(inicio.dorsales).length).toBeGreaterThanOrEqual(22);
    const tramo = await ws.esperar('partido.tramo', { desde });
    expect(Date.now() - t0).toBeLessThanOrEqual(3000); // SC-009
    expect(tramo.fase).toBe('descanso');
    expect(tramo.eventos.every((e: any) => e.relevante)).toBe(true);
    const pausa = await ws.esperar('partido.pausa_decision', { desde });
    expect(pausa.motivo).toBe('descanso');

    // Contra un NPC, el partido sigue en cuanto el humano pulsa «Seguir».
    const ack = await ws.enviarYEsperarAck({ t: 'partido.seguir', partidoId: inicio.partidoId });
    expect(ack.ok).toBe(true);
    const fin = await ws.esperar('partido.fin', { desde });
    expect(fin.marcador).toBeDefined();
    const despues = await peticion(srv.url, `/api/partidos/${inicio.partidoId}`, { cookie: invitado.cookie });
    expect(despues.cuerpo.estado).toBe('finalizado');
    expect(despues.cuerpo.alineaciones).not.toBeNull();

    // El otro partido de la jornada (NPC contra NPC) se resolvió sin intervención.
    const filas = await bd.db.execute(sql`select estado from partidos where partida_id = ${partidaId} and jornada_numero = 1`);
    expect(filas.rows.every((f: any) => f.estado === 'finalizado')).toBe(true);
    await ws.cerrar();
  });

  it('una sustitución en el descanso se aplica en la segunda parte', async () => {
    const invitado = await crearInvitado(srv.url);
    const { clientes } = await hastaPreparacion([invitado]);
    const ws = clientes[0]!;
    const desde = ws.recibidos.length;
    await comenzar(ws, invitado);
    const inicio = await ws.esperar('partido.inicio', { desde });
    await ws.esperar('partido.pausa_decision', { desde });
    const yo = inicio.local.id === (await ws.esperar('estado')).vista.partida.miParticipanteId ? 'local' : 'visitante';
    const mia = inicio.alineaciones[yo];
    const sale = mia.titulares.find((t: any) => t.casillaId !== 'POR').jugador.id;
    const entra = mia.suplentes[0].id;
    const ack = await ws.enviarYEsperarAck({ t: 'partido.decision', partidoId: inicio.partidoId, tipo: 'sustitucion', datos: { sale, entra } });
    expect(ack.ok, JSON.stringify(ack)).toBe(true);
    await ws.enviarYEsperarAck({ t: 'partido.seguir', partidoId: inicio.partidoId });
    // El NPC rival también puede hacer cambios en el descanso: se busca el aviso de la decisión propia.
    await ws.esperar('partido.fin', { desde });
    const yoId = inicio[yo].id;
    const aplicada = ws.recibidos.slice(desde).find((m) => m.t === 'partido.decision_aplicada' && m.participanteId === yoId)!;
    expect(aplicada.datos).toEqual({ sale, entra });
    await ws.esperar('partido.fin', { desde });
    const fila = await peticion(srv.url, `/api/partidos/${inicio.partidoId}`, { cookie: invitado.cookie });
    expect(fila.cuerpo.eventos.some((e: any) => e.tipo === 'sustitucion' && e.jugadores.some((j: any) => j.jugadorId === entra))).toBe(true);
  });

  it('en el descanso, fuera de la pausa, no se admiten decisiones (SIN_PAUSA)', async () => {
    const invitado = await crearInvitado(srv.url);
    const { clientes } = await hastaPreparacion([invitado]);
    const ws = clientes[0]!;
    const desde = ws.recibidos.length;
    await comenzar(ws, invitado);
    const inicio = await ws.esperar('partido.inicio', { desde });
    await ws.esperar('partido.pausa_decision', { desde });
    await ws.enviarYEsperarAck({ t: 'partido.seguir', partidoId: inicio.partidoId });
    await ws.esperar('partido.fin', { desde });
    const tarde = await ws.enviarYEsperarAck({ t: 'partido.decision', partidoId: inicio.partidoId, tipo: 'tactica', datos: { tactica: inicio.alineaciones.local.tactica } });
    expect(tarde.ok).toBe(false);
  });

  it('si el humano no pulsa «Seguir», el partido contra el NPC continúa al vencer el descanso', async () => {
    const invitado = await crearInvitado(srv.url);
    const { clientes } = await hastaPreparacion([invitado]);
    const ws = clientes[0]!;
    const desde = ws.recibidos.length;
    await comenzar(ws, invitado);
    await ws.esperar('partido.pausa_decision', { desde });
    srv.reloj.avanzar(120_001);
    await ws.esperar('partido.fin', { desde });
  });

  it('en eliminatoria con empate hay pausa antes de la prórroga y después la tanda', async () => {
    let comprobado = false;
    // Hace falta un empate al final de la segunda parte: se repite con partidas nuevas hasta que sale.
    for (let intento = 0; intento < 20 && !comprobado; intento++) {
      await srv.cerrar();
      await bd.limpiar();
      srv = await iniciarServidorPruebas(bd);
      const invitado = await crearInvitado(srv.url);
      const { clientes } = await hastaPreparacion([invitado], {
        eliminatoria: true,
        cruces: ({ humanos, npc }) => [
          { local: humanos[0]!, visitante: npc[0]! },
          { local: npc[1]!, visitante: npc[2]! },
        ],
      });
      const ws = clientes[0]!;
      const desde = ws.recibidos.length;
      await comenzar(ws, invitado);
      const inicio = await ws.esperar('partido.inicio', { desde });
      await ws.esperar('partido.pausa_decision', { desde });
      await ws.enviarYEsperarAck({ t: 'partido.seguir', partidoId: inicio.partidoId });
      await espera(300);
      const pausas = ws.recibidos.slice(desde).filter((m) => m.t === 'partido.pausa_decision' && m.motivo === 'pre_prorroga');
      if (pausas.length) {
        await ws.enviarYEsperarAck({ t: 'partido.seguir', partidoId: inicio.partidoId });
        const fin = await ws.esperar('partido.fin', { desde });
        if (fin.marcador.penaltis) {
          expect(fin.eventos.some((e: any) => e.tipo === 'tanda_lanzamiento')).toBe(true);
        }
        expect(fin.marcador.local !== fin.marcador.visitante || fin.marcador.penaltis).toBeTruthy();
        comprobado = true;
      }
      await ws.cerrar();
    }
    expect(comprobado).toBe(true);
  });
});
