/**
 * Integridad del draft (spec 017, T068, FR-023, FR-024): mensajes manipulados, fuera de turno o repetidos, y ninguna
 * elección ajena en lo que recibe cada participante.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs, crearRegistrado, iniciarServidorAtaque, peticion, type ServidorAtaque } from './ayudas';

describe('integridad del draft', () => {
  let bd: BdPruebas;
  let s: ServidorAtaque;
  let a: ClienteWs;
  let b: ClienteWs;
  let turnoA: Record<string, any>;
  let turnoB: Record<string, any>;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    s = await iniciarServidorAtaque(bd);
    const ua = await crearRegistrado(s.url);
    const ub = await crearRegistrado(s.url);
    const p = await peticion(s.url, '/api/partidas', { cookie: ua.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, plazasHumanas: 2 } });
    await peticion(s.url, `/api/partidas/${p.cuerpo.id}/unirse`, { metodo: 'POST', cookie: ub.cookie });
    for (let i = 0; i < 2; i++) await peticion(s.url, `/api/partidas/${p.cuerpo.id}/npc`, { cookie: ua.cookie, cuerpo: { nivel: 'intermedio' } });
    a = await ClienteWs.conectar(s.urlWs, p.cuerpo.id, ua.cookie);
    b = await ClienteWs.conectar(s.urlWs, p.cuerpo.id, ub.cookie);
    await Promise.all([a.esperar('estado'), b.esperar('estado')]);
    const [desdeA, desdeB] = [a.recibidos.length, b.recibidos.length];
    const r = await peticion(s.url, `/api/partidas/${p.cuerpo.id}/iniciar`, { metodo: 'POST', cookie: ua.cookie });
    expect(r.estado).toBe(200);
    turnoA = await a.esperar('draft.turno', { desde: desdeA });
    turnoB = await b.esperar('draft.turno', { desde: desdeB });
  });
  afterAll(async () => {
    await a.cerrar();
    await b.cerrar();
    await s.cerrar();
    await bd.detener();
  });

  const elegir = (c: ClienteWs, t: Record<string, any>, jugadorId: number, cambio: Record<string, number> = {}) =>
    c.enviarYEsperarAck({ t: 'draft.elegir', ronda: t.ronda, turno: t.turno, jugadorId, ...cambio });

  it('SEG-000: elegir una carta del sobre de otro participante', async () => {
    const mias = new Set(turnoA.sobre.cartas.map((c: any) => c.id));
    const ajena = turnoB.sobre.cartas.find((c: any) => !mias.has(c.id));
    const ack = await elegir(a, turnoA, ajena.id);
    expect(ack.ok).toBe(false);
    expect(ack.error.codigo).toBe('CARTA_NO_EN_SOBRE');
  });

  it('SEG-000: elegir una carta inexistente', async () => {
    const ack = await elegir(a, turnoA, 999_999);
    expect(ack.ok).toBe(false);
  });

  it('SEG-000: elegir con una ronda o un turno falsos', async () => {
    const ack = await elegir(a, turnoA, turnoA.sobre.cartas[0].id, { turno: turnoA.turno + 1 });
    expect(ack.ok).toBe(false);
    const otra = await elegir(a, turnoA, turnoA.sobre.cartas[0].id, { ronda: turnoA.ronda + 1 });
    expect(otra.ok).toBe(false);
  });

  it('SEG-000: elegir dos veces en el mismo turno', async () => {
    expect((await elegir(a, turnoA, turnoA.sobre.cartas[0].id)).ok).toBe(true);
    const segunda = await elegir(a, turnoA, turnoA.sobre.cartas[1].id);
    expect(segunda.ok).toBe(false);
    expect(segunda.error.codigo).toBe('YA_ELEGIDO');
  });

  it('SEG-000: ver en los mensajes qué ha elegido otro participante', () => {
    const elegida = turnoA.sobre.cartas[0].id;
    const deOtros = b.recibidos.filter((m) => m.t === 'draft.progreso');
    for (const m of deOtros) expect(JSON.stringify(m)).not.toContain(`"jugadorId":${elegida}`);
  });
});
