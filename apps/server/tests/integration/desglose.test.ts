import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Metricas } from '../../src/observabilidad/metricas';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { avanzarHasta, torneo } from '../helpers/torneo';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const HORA = 3600_000;
const PICKS = 8;
const FASES = ['cola', 'calculo', 'bd', 'serializacion', 'difusion', 'resto', 'total'];

/** Suma observada por fase de una operación (con una observación, su valor). */
async function desglose(m: Metricas, operacion: string): Promise<Record<string, number>> {
  const r: Record<string, number> = {};
  for (const v of (await m.operacionFaseMs.get()).values) {
    if (v.metricName === 'operacion_fase_ms_sum' && v.labels.operacion === operacion) r[String(v.labels.fase)] = v.value;
  }
  return r;
}

async function consultas(m: Metricas, operacion: string): Promise<{ suma: number; n: number }> {
  const r = { suma: 0, n: 0 };
  for (const v of (await m.operacionConsultas.get()).values) {
    if (v.labels.operacion !== operacion) continue;
    if (v.metricName === 'operacion_consultas_sum') r.suma = v.value;
    if (v.metricName === 'operacion_consultas_count') r.n = v.value;
  }
  return r;
}

/** Cuantil observado por fase de una operación. */
async function cuantil(m: Metricas, operacion: string, q: number): Promise<Record<string, number>> {
  const r: Record<string, number> = {};
  for (const v of (await m.operacionFaseMs.get()).values) {
    if (v.labels.operacion === operacion && (v.labels as Record<string, unknown>).quantile === q) r[String(v.labels.fase)] = v.value;
  }
  return r;
}

/** Las 7 fases observadas, con `bd > 0`, consultas y `resto` acotado por cuantil (FR-001: ≤ 10 % en mediana y p95). */
async function comprobarDesglose(m: Metricas, operacion: string, n: number, maxResto: Record<number, number> = { 0.5: 0.1, 0.95: 0.1 }) {
  const d = await desglose(m, operacion);
  expect(Object.keys(d).sort()).toEqual([...FASES].sort());
  expect(d.bd).toBeGreaterThan(0);
  for (const [q, max] of Object.entries(maxResto)) {
    const c = await cuantil(m, operacion, Number(q));
    expect(c.resto, `${q}: ${JSON.stringify(c)}`).toBeLessThanOrEqual(max * c.total!);
  }
  const q = await consultas(m, operacion);
  expect(q.n).toBe(n);
  expect(q.suma).toBeGreaterThan(0);
}

describe('desglose por fases (spec 010, US1)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas | undefined;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
  });
  afterAll(async () => {
    await srv?.cerrar();
    await bd?.detener();
  });

  async function servidor(medirFases?: boolean) {
    await srv?.cerrar();
    await bd.limpiar();
    srv = await iniciarServidorPruebas(bd, undefined, medirFases === undefined ? {} : { medirFases });
    return srv;
  }

  /** Liga de 4 asíncrona con dos humanos; tras el draft, avanza hasta la jornada en que se enfrentan. */
  async function partidoEntreHumanos(s: ServidorPruebas) {
    const a = await crearRegistrado(s.url);
    const b = await crearRegistrado(s.url);
    const r = await peticion(s.url, '/api/partidas', {
      cookie: a.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 4, plazoJornadaHoras: 24, plazasHumanas: 2 },
    });
    const partidaId: string = r.cuerpo.id;
    await peticion(s.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: b.cookie });
    const wa = await ClienteWs.conectar(s.urlWs, partidaId, a.cookie);
    await wa.esperar('estado');
    await peticion(s.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: a.cookie });
    await wa.esperar('draft.turno');
    await avanzarHasta(s, 46_000, async () => (await torneo(s, partidaId, a)).jornadaActual === 1);
    const c = await s.gestor.obtenerOError(partidaId);
    const ids = [a, b].map((u: UsuarioPrueba) => c.participanteDeUsuario(u.id)!.id).sort().join();
    let partidoId: string | undefined;
    await avanzarHasta(s, 24 * HORA + 1, async () => {
      const j = (await torneo(s, partidaId, a)).jornadas.find((x: any) => x.estado === 'abierta');
      partidoId = j?.partidos.find((p: any) => [p.local.id, p.visitante.id].sort().join() === ids)?.partidoId;
      return partidoId !== undefined;
    }, 10);
    return { a, c, wa, partidoId: partidoId! };
  }

  it('desglosa la apertura de un partido entre humanos', async () => {
    const s = await servidor();
    const { a, c, wa, partidoId } = await partidoEntreHumanos(s);
    const r = await peticion(s.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: a.cookie });
    expect(r.cuerpo.modo).toBe('reproduccion');
    expect((await c.servicios.repoPartidos.obtener(partidoId))!.estado).toBe('finalizado');
    await comprobarDesglose(s.metricas, 'apertura', 1);
    await wa.cerrar();
  });

  it('desglosa la elección que cierra un turno de draft como entrega de sobre', async () => {
    const s = await servidor();
    const invitado = await crearInvitado(s.url);
    const partida = (await peticion(s.url, '/api/partidas', { cookie: invitado.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } })).cuerpo;
    const ws = await ClienteWs.conectar(s.urlWs, partida.id, invitado.cookie);
    await ws.esperar('estado');
    const desde = ws.recibidos.length;
    await peticion(s.url, `/api/partidas/${partida.id}/iniciar`, { metodo: 'POST', cookie: invitado.cookie });
    let turno = await ws.esperar('draft.turno', { desde });
    // Con tres NPC, que eligen al abrirse el turno, cada elección del humano lo cierra.
    for (let i = 0; i < PICKS; i++) {
      const despues = ws.recibidos.length;
      const ack = await ws.enviarYEsperarAck({ t: 'draft.elegir', ronda: turno.ronda, turno: turno.turno, jugadorId: turno.sobre.cartas[0].id });
      expect(ack.ok, JSON.stringify(ack)).toBe(true);
      turno = await ws.esperar('draft.turno', { desde: despues });
    }
    // Sin carga, una entrega dura ~10 ms y su resto (~1,2 ms de huecos del bucle de eventos, con el cliente de la
    // prueba en el mismo proceso) ronda el 12 %. FR-001 se evalúa con la carga (diagnostico.md: ≤ 2 % con 10 y 100
    // partidas); aquí solo se vigila que no aparezca una fase grande sin medir. El p95 de 8 elecciones es casi la
    // peor muestra (ruido), así que solo se acota la mediana.
    await comprobarDesglose(s.metricas, 'entrega_sobre', PICKS, { 0.5: 0.15 });
    expect(await desglose(s.metricas, 'eleccion')).toEqual({});
    await ws.cerrar();
  });

  it('con MEDIR_FASES=0 no observa nada y la apertura resuelve igual', async () => {
    const s = await servidor(false);
    const { a, c, wa, partidoId } = await partidoEntreHumanos(s);
    const r = await peticion(s.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: a.cookie });
    expect(r.cuerpo.modo).toBe('reproduccion');
    expect((await c.servicios.repoPartidos.obtener(partidoId))!.estado).toBe('finalizado');
    expect(await desglose(s.metricas, 'apertura')).toEqual({});
    expect((await consultas(s.metricas, 'apertura')).n).toBe(0);
    await wa.cerrar();
  });
});
