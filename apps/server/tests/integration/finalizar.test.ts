/**
 * «Finalizar partido» (FR-026 a FR-028; research R7; T098).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { crearInvitado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const TURNO = 46_000;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('finalizar partido (US5)', () => {
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

  /** Liga de 4 con un humano: completa el draft y pulsa «Comenzar partido». */
  async function empezar(modalidad: '2d' | 'rapida') {
    const u: UsuarioPrueba = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    const partidaId: string = r.cuerpo.id;
    const ws = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    for (let i = 0; i < 30 && !ws.recibidos.some((m) => m.t === 'preparacion.inicio'); i++) {
      srv.reloj.avanzar(TURNO);
      await espera(60);
    }
    const prep = await ws.esperar('preparacion.inicio');
    const desde = ws.recibidos.length;
    await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie, cuerpo: { modalidad } });
    const inicio = await ws.esperar('partido.inicio', { desde });
    await ws.esperar('partido.tramo', { desde });
    return { partidaId, u, ws, inicio, desde };
  }

  const tramosDe = (ws: ClienteWs, desde = 0) => ws.recibidos.slice(desde).filter((m) => m.t === 'partido.tramo');

  /** Reproduce la 2D como un cliente (informando de lo ya recibido) hasta el tick dado. */
  async function reproducirHasta(ws: ClienteWs, partidoId: string, objetivo: number, desde: number) {
    for (let i = 0; i < 500; i++) {
      const ultimo = tramosDe(ws, desde).at(-1)!;
      if (ultimo.hastaTick >= objetivo || ultimo.fase !== 'primera_parte') return;
      ws.enviar({ t: 'partido.reproduccion', partidoId, tick: ultimo.hastaTick, velocidad: 8 }, false);
      for (let k = 0; k < 50 && tramosDe(ws, desde).at(-1)!.hastaTick === ultimo.hastaTick; k++) await espera(20);
    }
  }

  it('en el minuto 30 de un 2D: ack, los tramos que faltan y partido.fin en < 3 s; es idempotente', async () => {
    const { ws, inicio, desde } = await empezar('2d');
    await reproducirHasta(ws, inicio.partidoId, 30 * 60, desde);
    const simulado = tramosDe(ws, desde).at(-1)!.hastaTick;
    expect(simulado).toBeGreaterThanOrEqual(30 * 60);

    const antes = ws.recibidos.length;
    const t0 = Date.now();
    const ack = await ws.enviarYEsperarAck({ t: 'partido.finalizar', partidoId: inicio.partidoId });
    expect(ack.ok, JSON.stringify(ack)).toBe(true);
    const fin = await ws.esperar('partido.fin', { desde: antes });
    expect(Date.now() - t0).toBeLessThan(3000);
    // Un tramo por parte, en orden y sin huecos desde lo ya simulado.
    const nuevos = tramosDe(ws, antes);
    expect(nuevos.length).toBeGreaterThanOrEqual(2);
    expect(nuevos[0]!.desdeTick).toBe(simulado);
    for (let i = 1; i < nuevos.length; i++) expect(nuevos[i]!.desdeTick).toBe(nuevos[i - 1]!.hastaTick);
    expect(nuevos.at(-1)!.fase).toBe('finalizado');
    expect(fin.estadisticas.local).toHaveProperty('precisionPase');
    expect(fin.estadisticas.local).toHaveProperty('centros');

    // Idempotente: otro «Finalizar» no cambia nada ni repite el final.
    const despues = ws.recibidos.length;
    const otro = await ws.enviarYEsperarAck({ t: 'partido.finalizar', partidoId: inicio.partidoId });
    expect(otro.ok).toBe(true);
    await espera(200);
    expect(ws.recibidos.slice(despues).filter((m) => m.t === 'partido.fin' || m.t === 'partido.tramo')).toHaveLength(0);
    const fila = await peticion(srv.url, `/api/partidos/${inicio.partidoId}`, { cookie: (await crearInvitado(srv.url)).cookie });
    expect([200, 403, 404]).toContain(fila.estado);
    await ws.cerrar();
  });

  it('una sustitución pendiente se aplica en la primera interrupción no simulada', async () => {
    const { ws, inicio, desde } = await empezar('2d');
    const estado = await ws.esperar('estado');
    const yo = inicio.local.id === estado.vista.partida.miParticipanteId ? 'local' : 'visitante';
    const mia = inicio.alineaciones[yo];
    const sale = mia.titulares.find((t: any) => t.casillaId !== 'POR').jugador.id;
    const entra = mia.suplentes[0].id;
    const simulado = tramosDe(ws, desde).at(-1)!.hastaTick;
    const ack = await ws.enviarYEsperarAck({ t: 'partido.decision', partidoId: inicio.partidoId, tipo: 'sustitucion', datos: { sale, entra } });
    expect(ack.ok, JSON.stringify(ack)).toBe(true);
    const antes = ws.recibidos.length;
    await ws.enviarYEsperarAck({ t: 'partido.finalizar', partidoId: inicio.partidoId });
    await ws.esperar('partido.fin', { desde: antes });
    const aplicada = ws.recibidos.slice(antes).find((m) => m.t === 'partido.decision_aplicada' && m.participanteId === inicio[yo].id);
    expect(aplicada?.datos).toEqual({ sale, entra });
    expect(aplicada!.aplicadaEnTick).toBeGreaterThanOrEqual(simulado);
    // Primera interrupción tras lo simulado: no hay ninguna entre medias.
    const interrupciones = ws.recibidos.slice(antes).filter((m) => m.t === 'partido.tramo').flatMap((t) => t.eventos).filter((e: any) => e.tipo === 'interrupcion' && e.tick < aplicada!.aplicadaEnTick);
    expect(interrupciones.filter((e: any) => e.tick > simulado)).toHaveLength(0);
    await ws.cerrar();
  });

  it('durante el descanso de un 2D cierra la ventana sin cambios y ya no llega ninguna pausa', async () => {
    const { ws, inicio, desde } = await empezar('2d');
    await reproducirHasta(ws, inicio.partidoId, 100_000, desde);
    await ws.esperar('partido.pausa_decision', { desde, timeoutMs: 15_000 });
    const antes = ws.recibidos.length;
    const ack = await ws.enviarYEsperarAck({ t: 'partido.finalizar', partidoId: inicio.partidoId });
    expect(ack.ok).toBe(true);
    await ws.esperar('partido.fin', { desde: antes });
    await espera(200);
    expect(ws.recibidos.slice(antes).some((m) => m.t === 'partido.pausa_decision')).toBe(false);
    // «Seguir» ya no tiene pausa que cerrar.
    const seguir = await ws.enviarYEsperarAck({ t: 'partido.seguir', partidoId: inicio.partidoId });
    expect(seguir.ok).toBe(false);
    await ws.cerrar();
  });

  it('en la simulación rápida, en el descanso lleva al resultado final', async () => {
    const { ws, inicio, desde } = await empezar('rapida');
    await ws.esperar('partido.pausa_decision', { desde });
    const antes = ws.recibidos.length;
    const ack = await ws.enviarYEsperarAck({ t: 'partido.finalizar', partidoId: inicio.partidoId });
    expect(ack.ok).toBe(true);
    const fin = await ws.esperar('partido.fin', { desde: antes });
    const ultimo = tramosDe(ws, antes).at(-1)!;
    expect(ultimo.fase).toBe('finalizado');
    expect(fin.marcador).toEqual(ultimo.marcador);
    expect(ws.recibidos.slice(antes).some((m) => m.t === 'partido.pausa_decision')).toBe(false);
    await ws.cerrar();
  });

  it('solo quien juega el partido puede finalizarlo', async () => {
    const { ws, inicio } = await empezar('2d');
    const otro = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: otro.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    const ajeno = await ClienteWs.conectar(srv.urlWs, r.cuerpo.id, otro.cookie);
    const desde = ajeno.recibidos.length;
    const antes = ws.recibidos.length;
    ajeno.enviar({ t: 'partido.finalizar', partidoId: inicio.partidoId });
    await espera(500);
    // Nadie de otra partida puede terminar el partido: ni respuesta positiva ni final para quien lo juega.
    expect(ajeno.recibidos.slice(desde).some((m) => m.t === 'ack' && m.ok === true)).toBe(false);
    expect(ws.recibidos.slice(antes).some((m) => m.t === 'partido.fin')).toBe(false);
    await ajeno.cerrar();
    await ws.cerrar();
  });
});
