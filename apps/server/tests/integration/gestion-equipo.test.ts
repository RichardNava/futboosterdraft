/**
 * Gestión del equipo durante el partido (spec 003, US5; FR-027 a FR-031; research R17; T063).
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { programarJornada } from '../../src/actores/preparacion';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { partidaTrasDraft } from '../helpers/partidas';
import { avanzarHasta, espera, torneo } from '../helpers/torneo';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const TURNO = 46_000;
const HORA = 3600_000;

describe('gestión del equipo durante el partido (US5)', () => {
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

  /** Liga de 4 con un invitado; abre su partido con la modalidad pedida y devuelve el inicio. */
  async function empezar(modalidad: 'rapida' | '2d', opciones: { eliminatoria?: boolean } = {}) {
    const u: UsuarioPrueba = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    const partidaId: string = r.cuerpo.id;
    const ws = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
    const c = await srv.gestor.obtenerOError(partidaId);
    if (opciones.eliminatoria) {
      c.programarPrimeraJornada = async (ctx) => {
        const hum = c.participantes.filter((p) => p.tipo === 'humano').map((p) => p.id);
        const npc = c.participantes.filter((p) => p.tipo === 'npc').map((p) => p.id);
        await programarJornada(c, ctx, 1, [{ local: hum[0]!, visitante: npc[0]! }, { local: npc[1]!, visitante: npc[2]! }], { inicial: true, eliminatoria: true });
      };
    }
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    for (let i = 0; i < 30 && !ws.recibidos.some((m) => m.t === 'preparacion.inicio'); i++) {
      srv.reloj.avanzar(TURNO);
      await espera(60);
    }
    const prep = await ws.esperar('preparacion.inicio');
    const desde = ws.recibidos.length;
    await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie, cuerpo: { modalidad } });
    const inicio = await ws.esperar('partido.inicio', { desde });
    const miId = c.participanteDeUsuario(u.id)!.id;
    const lado: 'local' | 'visitante' = inicio.local.id === miId ? 'local' : 'visitante';
    return { u, ws, inicio, desde, miId, lado, partidaId };
  }

  it('partido.inicio amplía solo la alineación propia (casilla, ancla y lanzadores) e indica que hay gestión', async () => {
    const { ws, inicio, lado } = await empezar('rapida');
    const rival = lado === 'local' ? 'visitante' : 'local';
    expect(inicio.gestionDisponible).toBe(true);
    expect(inicio.alineaciones[lado].lanzadores).toBeDefined();
    expect(inicio.alineaciones[lado].titulares.every((t: any) => typeof t.casillaId === 'string')).toBe(true);
    expect(inicio.alineaciones[rival].lanzadores).toBeUndefined();
    expect(inicio.alineaciones[rival].colocacion).toBeUndefined();
    expect(inicio.alineaciones[rival].titulares.some((t: any) => t.ancla)).toBe(false);
    await ws.cerrar();
  });

  it('en la rápida: fuera del descanso SIN_PAUSA; en el descanso el lote se aplica, una sola vez por requestId', async () => {
    const { ws, inicio, desde, miId, lado } = await empezar('rapida');
    const mia = inicio.alineaciones[lado];
    const tactica = { ...mia.tactica, alturaBloque: 'presion_alta' };
    await ws.esperar('partido.pausa_decision', { desde });
    const sale = mia.titulares.find((t: any) => t.casillaId !== 'POR').jugador.id;
    const entra = mia.suplentes[0].id;
    const requestId = randomUUID();
    const mensaje = { t: 'partido.decisiones', requestId, partidoId: inicio.partidoId, decisiones: [{ tipo: 'sustitucion', datos: { sale, entra } }, { tipo: 'tactica', datos: { tactica } }] };
    const ack1 = await ws.enviarYEsperarAck(mensaje);
    expect(ack1.ok, JSON.stringify(ack1)).toBe(true);
    const ack2 = await ws.enviarYEsperarAck(mensaje);
    expect(ack2).toEqual(ack1);
    await ws.enviarYEsperarAck({ t: 'partido.seguir', partidoId: inicio.partidoId });
    const fin = await ws.esperar('partido.fin', { desde });
    const aplicadas = ws.recibidos.slice(desde).filter((m) => m.t === 'partido.decision_aplicada' && m.participanteId === miId);
    expect(aplicadas.map((m) => m.tipo)).toEqual(['sustitucion', 'tactica']);
    expect(new Set(aplicadas.map((m) => m.aplicadaEnTick)).size).toBe(1);
    expect(fin.eventos.filter((e: any) => e.tipo === 'sustitucion' && e.jugadores.some((j: any) => j.jugadorId === entra))).toHaveLength(1);
    // Terminado, ya no admite cambios.
    const tarde = await ws.enviarYEsperarAck({ t: 'partido.decisiones', partidoId: inicio.partidoId, decisiones: [{ tipo: 'tactica', datos: { tactica } }] });
    expect(tarde.ok).toBe(false);
    await ws.cerrar();
  });

  it('en la rápida, con el balón en juego, SIN_PAUSA; un lote con una decisión inválida no aplica ninguna e indica cuál', async () => {
    const { ws, inicio, desde, lado } = await empezar('rapida');
    const mia = inicio.alineaciones[lado];
    await ws.esperar('partido.pausa_decision', { desde });
    const malo = await ws.enviarYEsperarAck({
      t: 'partido.decisiones',
      partidoId: inicio.partidoId,
      decisiones: [
        { tipo: 'tactica', datos: { tactica: mia.tactica } },
        { tipo: 'sustitucion', datos: { sale: mia.titulares[1].jugador.id, entra: mia.titulares[2].jugador.id } },
      ],
    });
    expect(malo.ok).toBe(false);
    expect(malo.error.indice).toBe(1);
    await ws.enviarYEsperarAck({ t: 'partido.seguir', partidoId: inicio.partidoId });
    await ws.esperar('partido.fin', { desde });
    await ws.cerrar();
  });

  it('en la 2D, con el balón en juego, el lote se aplica en la siguiente interrupción, que llega en ≤ 60 s', async () => {
    const { ws, inicio, desde, miId, lado } = await empezar('2d');
    const mia = inicio.alineaciones[lado];
    await ws.esperar('partido.tramo', { desde });
    const ack = await ws.enviarYEsperarAck({ t: 'partido.decisiones', partidoId: inicio.partidoId, decisiones: [{ tipo: 'tactica', datos: { tactica: { ...mia.tactica, estiloConBalon: 'combinativo' } } }] });
    expect(ack.ok, JSON.stringify(ack)).toBe(true);
    const tramos = () => ws.recibidos.slice(desde).filter((m) => m.t === 'partido.tramo');
    const pedido = tramos().at(-1)!.hastaTick;
    for (let i = 0; i < 200 && !ws.recibidos.slice(desde).some((m) => m.t === 'partido.decision_aplicada' && m.participanteId === miId); i++) {
      ws.enviar({ t: 'partido.reproduccion', partidoId: inicio.partidoId, tick: tramos().at(-1)!.hastaTick, velocidad: 8 }, false);
      await espera(30);
    }
    const aplicada = ws.recibidos.slice(desde).find((m) => m.t === 'partido.decision_aplicada' && m.participanteId === miId)!;
    expect(aplicada).toBeDefined();
    // El juego se detiene como mucho 60 s después de pedirla (002/FR-025a); la decisión cuenta como aplicada al
    // reanudarse, tras colocarse los jugadores para el saque (como mucho `esperaColocacionMaxima`, 150 ticks).
    expect(aplicada.aplicadaEnTick - pedido).toBeLessThanOrEqual(60 + 150 + 30);
    await ws.cerrar();
  });

  it('antes de la prórroga de una eliminatoria también se admite', async () => {
    let comprobado = false;
    for (let intento = 0; intento < 20 && !comprobado; intento++) {
      await srv.cerrar();
      await bd.limpiar();
      srv = await iniciarServidorPruebas(bd);
      const { ws, inicio, desde, lado } = await empezar('rapida', { eliminatoria: true });
      await ws.esperar('partido.pausa_decision', { desde });
      await ws.enviarYEsperarAck({ t: 'partido.seguir', partidoId: inicio.partidoId });
      await espera(300);
      if (ws.recibidos.slice(desde).some((m) => m.t === 'partido.pausa_decision' && m.motivo === 'pre_prorroga')) {
        const ack = await ws.enviarYEsperarAck({ t: 'partido.decisiones', partidoId: inicio.partidoId, decisiones: [{ tipo: 'tactica', datos: { tactica: inicio.alineaciones[lado].tactica } }] });
        expect(ack.ok, JSON.stringify(ack)).toBe(true);
        comprobado = true;
      }
      await ws.cerrar();
    }
    expect(comprobado).toBe(true);
  });

  it('en un partido entre humanos no hay gestión: SIN_PAUSA y gestionDisponible = false', async () => {
    const b = await crearRegistrado(srv.url);
    const { anfitrion: a, partida } = await partidaTrasDraft(srv, { cuerpo: { plazasHumanas: 2, plazoJornadaHoras: 24 }, otros: [b] });
    const c = await srv.gestor.obtenerOError(partida.id);
    const ids = [c.participanteDeUsuario(a.id)!.id, c.participanteDeUsuario(b.id)!.id].sort().join();
    let partidoId = '';
    await avanzarHasta(
      srv,
      24 * HORA + 1,
      async () => {
        const j = (await torneo(srv, partida.id, a)).jornadas.find((x: any) => x.estado === 'abierta');
        partidoId = j?.partidos.find((p: any) => [p.local.id, p.visitante.id].sort().join() === ids)?.partidoId ?? '';
        return partidoId !== '';
      },
      10,
    );
    const ws = await ClienteWs.conectar(srv.urlWs, partida.id, a.cookie);
    await ws.esperar('estado');
    const ack = await ws.enviarYEsperarAck({ t: 'partido.decisiones', partidoId, decisiones: [{ tipo: 'tactica', datos: { tactica: { sistemaDefensivo: 'zona', alturaBloque: 'medio', lineaAdelantada: false, estiloConBalon: 'equilibrado', juegoVertical: false } } }] });
    expect(ack.ok).toBe(false);
    expect(ack.error.codigo).toBe('SIN_PAUSA');
    await peticion(srv.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: a.cookie });
    const rep = await peticion(srv.url, `/api/partidos/${partidoId}/reproduccion`, { cookie: a.cookie });
    expect(rep.cuerpo.inicio.gestionDisponible).toBe(false);
    await ws.cerrar();
  });
});
