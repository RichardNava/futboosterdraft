/**
 * Partido 2D en directo contra un NPC con el búfer de anticipación (research R6, FR-025a; T072).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { crearInvitado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const TURNO = 46_000;
const ANTICIPACION = 60;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('partido 2D en directo (US3, research R6)', () => {
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

  /** Liga 2D de 4 con un humano: completa el draft, pulsa «Comenzar partido» y espera el primer tramo. */
  async function partidoEnDirecto() {
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
    const abierto = await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie, cuerpo: { modalidad: '2d' } });
    expect(abierto.cuerpo.modo).toBe('directo');
    const inicio = await ws.esperar('partido.inicio', { desde });
    await ws.esperar('partido.tramo', { desde });
    await espera(100);
    return { partidaId, u, ws, inicio, desde };
  }

  const tramosDe = (ws: ClienteWs, desde = 0) => ws.recibidos.slice(desde).filter((m) => m.t === 'partido.tramo');
  const informar = (ws: ClienteWs, partidoId: string, tick: number, velocidad = 2) =>
    ws.enviar({ t: 'partido.reproduccion', partidoId, tick, velocidad }, false);

  /** Espera a que los tramos recibidos lleguen al menos hasta `tick` (o a que se detenga en una parada). */
  async function hastaTick(ws: ClienteWs, tick: number, desde = 0) {
    for (let i = 0; i < 100; i++) {
      const t = tramosDe(ws, desde);
      const ultimo = t.at(-1);
      const enJuego = ['primera_parte', 'segunda_parte', 'prorroga'].includes(ultimo?.fase);
      if (ultimo && (ultimo.hastaTick >= tick || !enJuego)) return t;
      await espera(30);
    }
    return tramosDe(ws, desde);
  }

  /** Reproduce como un cliente: informa del último tick recibido hasta llegar a `objetivo` o a una parada. */
  async function reproducirHasta(ws: ClienteWs, partidoId: string, objetivo: number, desde = 0, velocidad = 2) {
    for (let i = 0; i < 1000; i++) {
      const ultimo = tramosDe(ws, desde).at(-1)!;
      const tick = Math.min(objetivo, ultimo.hastaTick);
      if (ultimo.fase !== 'primera_parte' && ultimo.fase !== 'segunda_parte' && ultimo.fase !== 'prorroga') return tick;
      informar(ws, partidoId, tick, velocidad);
      if (tick >= objetivo) return tick;
      await hastaTick(ws, tick + ANTICIPACION, desde);
    }
    throw new Error('no se llegó al tick');
  }

  it('mantiene simulados 60 ticks por delante del último tick informado, y nunca más', async () => {
    const { ws, inicio, desde } = await partidoEnDirecto();
    expect(inicio.modalidad).toBe('2d');
    expect(inicio.ordenJugadores).toHaveLength(inicio.alineaciones.local.titulares.length + inicio.alineaciones.local.suplentes.length + inicio.alineaciones.visitante.titulares.length + inicio.alineaciones.visitante.suplentes.length);

    // Sin informes, solo los primeros 60 ticks (acabando la acción que los alcanza).
    let tramos = tramosDe(ws, desde);
    expect(tramos.at(-1)!.hastaTick).toBeGreaterThanOrEqual(ANTICIPACION);
    expect(tramos.slice(0, -1).every((t) => t.hastaTick < ANTICIPACION)).toBe(true);
    await espera(300);
    expect(tramosDe(ws, desde)).toHaveLength(tramos.length);

    // Cada informe (de un tick ya recibido) abre el búfer hasta 60 ticks por delante.
    for (let i = 0; i < 3; i++) {
      const antes = tramosDe(ws, desde).length;
      const tick = tramosDe(ws, desde).at(-1)!.hastaTick - 10;
      informar(ws, inicio.partidoId, tick);
      tramos = await hastaTick(ws, tick + ANTICIPACION, desde);
      const nuevos = tramos.slice(antes);
      expect(tramos.at(-1)!.hastaTick).toBeGreaterThanOrEqual(tick + ANTICIPACION);
      expect(nuevos.slice(0, -1).every((t) => t.hastaTick < tick + ANTICIPACION)).toBe(true);
    }

    // En orden y sin huecos de ticks, con acciones, fotogramas v2 y `provisional: false`.
    for (let i = 0; i < tramos.length; i++) {
      const t = tramos[i]!;
      if (i > 0) expect(t.desdeTick).toBe(tramos[i - 1]!.hastaTick);
      expect(t.provisional).toBe(false);
      expect(Array.isArray(t.acciones)).toBe(true);
      expect(t.fotogramas.length).toBeGreaterThan(0);
      expect(t.fotogramas[0]).toHaveLength(4 + 2 * inicio.ordenJugadores.length);
    }
    await ws.cerrar();
  });

  it('nunca adelanta el descanso: espera a «Seguir» y después sigue con el búfer', async () => {
    const { ws, inicio, desde } = await partidoEnDirecto();
    await reproducirHasta(ws, inicio.partidoId, 100_000, desde, 8);
    const pausa = await ws.esperar('partido.pausa_decision', { desde, timeoutMs: 15_000 });
    expect(pausa.motivo).toBe('descanso');
    await espera(200);
    const tramos = tramosDe(ws, desde);
    expect(tramos.at(-1)!.fase).toBe('descanso');
    expect(tramos.every((t) => t.fase === 'primera_parte' || t.fase === 'descanso')).toBe(true);

    const despues = ws.recibidos.length;
    const ack = await ws.enviarYEsperarAck({ t: 'partido.seguir', partidoId: inicio.partidoId });
    expect(ack.ok).toBe(true);
    // El cliente sigue informando desde el descanso; el servidor llena el búfer de la segunda parte.
    informar(ws, inicio.partidoId, tramos.at(-1)!.hastaTick, 8);
    const siguiente = await ws.esperar('partido.tramo', { desde: despues });
    expect(siguiente.desdeTick).toBe(tramos.at(-1)!.hastaTick);
    await reproducirHasta(ws, inicio.partidoId, 100_000, despues, 8);
    await ws.esperar('partido.fin', { desde: despues, timeoutMs: 15_000 });
    await ws.cerrar();
  });

  it('una sustitución pedida con el balón en juego se aplica en la primera interrupción aún no simulada', async () => {
    const { ws, inicio, desde } = await partidoEnDirecto();
    const estado = await ws.esperar('estado');
    const yo = inicio.local.id === estado.vista.partida.miParticipanteId ? 'local' : 'visitante';
    const mia = inicio.alineaciones[yo];
    const sale = mia.titulares.find((t: any) => t.casillaId !== 'POR').jugador.id;
    const entra = mia.suplentes[0].id;
    const simuladoAntes = tramosDe(ws, desde).at(-1)!.hastaTick;
    const ack = await ws.enviarYEsperarAck({ t: 'partido.decision', partidoId: inicio.partidoId, tipo: 'sustitucion', datos: { sale, entra } });
    expect(ack.ok, JSON.stringify(ack)).toBe(true);

    // Como a x8: el cliente avanza deprisa y el servidor va simulando.
    let aplicada: any;
    for (let tick = 60; tick < 2000 && !aplicada; tick += 60) {
      informar(ws, inicio.partidoId, tick, 8);
      await hastaTick(ws, tick + ANTICIPACION, desde);
      aplicada = ws.recibidos.slice(desde).find((m) => m.t === 'partido.decision_aplicada' && m.participanteId === inicio[yo].id);
    }
    expect(aplicada?.datos).toEqual({ sale, entra });
    expect(aplicada.aplicadaEnTick).toBeGreaterThanOrEqual(simuladoAntes);
    expect(aplicada.minuto).toMatch(/^\d+(\+\d+)?'$/);
    await ws.cerrar();
  });

  it('partido.velocidad ya no existe y partido.reproduccion solo admite x2, x4 y x8', async () => {
    const { ws, inicio } = await partidoEnDirecto();
    let desde = ws.recibidos.length;
    ws.enviar({ t: 'partido.velocidad', partidoId: inicio.partidoId, velocidad: 4 }, false);
    expect((await ws.esperar('error', { desde })).codigo).toBe('TIPO_DESCONOCIDO');
    desde = ws.recibidos.length;
    ws.enviar({ t: 'partido.reproduccion', partidoId: inicio.partidoId, tick: 10, velocidad: 16 }, false);
    expect((await ws.esperar('error', { desde })).codigo).toBe('MENSAJE_INVALIDO');
    await ws.cerrar();
  });

  it('al reconectar, el estado trae los tramos simulados y el último tick informado', async () => {
    const { partidaId, u, ws, inicio, desde } = await partidoEnDirecto();
    await reproducirHasta(ws, inicio.partidoId, 200, desde);
    const tramos = await hastaTick(ws, 260, desde);
    await ws.cerrar();
    await espera(100);
    const otra = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
    const estado = await otra.esperar('estado');
    const dosD = estado.vista.partido.dosD;
    expect(dosD.ultimoTickInformado).toBe(200);
    expect(dosD.tramos.map((t: any) => t.hastaTick)).toEqual(tramos.map((t) => t.hastaTick));
    // Los tramos que el cliente aún no ha visto conservan sus fotogramas para seguir reproduciendo.
    expect(dosD.tramos.filter((t: any) => t.hastaTick >= 200).every((t: any) => t.fotogramas?.length > 0)).toBe(true);
    expect(dosD.tramos.filter((t: any) => t.hastaTick < 200).every((t: any) => t.fotogramas === undefined)).toBe(true);
    await otra.cerrar();
  });
});
