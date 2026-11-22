/**
 * Desmarque contra marcaje antes del pase y control con presión (spec 015, US4 y US5; invariantes M2.7 y M2.9; research
 * R7 y R8; FR-011, FR-012, FR-014, FR-019).
 */
import { parametrosActuales, type Rng } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { marcadorDe, probabilidadControl, probabilidadDesmarque } from '../src/acciones/desmarque';
import { probabilidad } from '../src/acciones/duelo';
import { controlConPresion, desmarqueDelPase } from '../src/acciones/juego';
import { atributo } from '../src/modificadores/atributos';
import type { EstadoMotor, JugadorEnPartido } from '../src/index';
import type { Metricas } from '../src/metricas';
import { contextoDe, darBalon, partido, rngDePrueba, situar, titularEn } from './ayudas';

const ACTUAL = { version: parametrosActuales().version, parametros: parametrosActuales() };
const D = parametrosActuales().desmarque!;
const M = 95.24;

/** Tiradas de duelo fijas (las de 0 a 999): con 0 gana siempre quien ataca; con 999, siempre quien defiende. */
function tiradas(valor: number | null): Rng {
  const r = rngDePrueba(`tiradas-${valor}`);
  const entero = r.entero.bind(r);
  r.entero = (min, max) => {
    if (min !== 0 || max !== 999) return entero(min, max);
    if (valor === null) throw new Error('no debe haber tirada');
    return valor;
  };
  return r;
}
const sinTiradas = tiradas(null);

/** Receptor local en la casilla `casilla` en (8.000, 3.200) y un rival de la casilla `rival` a `metros` de él. */
function escena(casilla: string, rivalCasilla: string, metros: number, parametros: typeof ACTUAL = ACTUAL) {
  const e = partido(`desmarque-${casilla}-${rivalCasilla}-${metros}`, parametros);
  const receptor = titularEn(e, 'local', casilla);
  const marcador = titularEn(e, 'visitante', rivalCasilla);
  situar(e, receptor.id, { x: 8000, y: 3200 });
  // Coordenadas del visitante: 10.000 − x.
  situar(e, marcador.id, { x: 10000 - 8000 - Math.round(metros * M), y: 3200 });
  return { e, receptor, marcador };
}

function conStats(j: JugadorEnPartido, stats: Record<string, number>): void {
  j.jugador = { ...j.jugador, stats: { ...j.jugador.stats, ...stats } as typeof j.jugador.stats };
}

describe('marcador del receptor (M2.7, M2.12)', () => {
  it('le marca el rival de campo más cercano a radioMarcaM o menos; más lejos, nadie', () => {
    const cerca = escena('DC', 'DCI', 2);
    expect(marcadorDe(cerca.e, cerca.receptor, cerca.e.equipos.visitante, D.radioMarcaM)?.id).toBe(cerca.marcador.id);
    const lejos = escena('DC', 'DCI', 4);
    expect(marcadorDe(lejos.e, lejos.receptor, lejos.e.equipos.visitante, D.radioMarcaM)).toBeNull();
  });

  it('el portero rival no marca, y al portero receptor no le marca nadie', () => {
    const portero = escena('DC', 'POR', 1);
    expect(marcadorDe(portero.e, portero.receptor, portero.e.equipos.visitante, D.radioMarcaM)).toBeNull();
    const receptorPortero = escena('POR', 'DC', 1);
    expect(marcadorDe(receptorPortero.e, receptorPortero.receptor, receptorPortero.e.equipos.visitante, D.radioMarcaM)).toBeNull();
  });
});

describe('atributos del desmarque y del marcaje (FR-012, FR-019)', () => {
  it('desmarque: DEL desmarque, MED visión, DEF velocidad (entera)', () => {
    const e = partido('atributos-desmarque', ACTUAL);
    const del = titularEn(e, 'local', 'DC');
    const med = titularEn(e, 'local', 'MC-1');
    const def = titularEn(e, 'local', 'DCI');
    conStats(del, { desmarque: 91 });
    conStats(med, { vision: 87 });
    conStats(def, { velocidad: 73 });
    expect(atributo(e, e.equipos.local, del, 'desmarque')).toBe(91);
    expect(atributo(e, e.equipos.local, med, 'desmarque')).toBe(87);
    expect(atributo(e, e.equipos.local, def, 'desmarque')).toBe(73);
  });

  it('marcaje: DEF marcaje, MED posicionamiento, DEL agresividad y POR 50', () => {
    const e = partido('atributos-marcaje', ACTUAL);
    const v = e.equipos.visitante;
    conStats(titularEn(e, 'visitante', 'DCI'), { marcaje: 88 });
    conStats(titularEn(e, 'visitante', 'MC-1'), { posicionamiento: 76 });
    conStats(titularEn(e, 'visitante', 'DC'), { agresividad: 69 });
    expect(atributo(e, v, titularEn(e, 'visitante', 'DCI'), 'marcaje')).toBe(88);
    expect(atributo(e, v, titularEn(e, 'visitante', 'MC-1'), 'marcaje')).toBe(76);
    expect(atributo(e, v, titularEn(e, 'visitante', 'DC'), 'marcaje')).toBe(69);
    expect(atributo(e, v, titularEn(e, 'visitante', 'POR'), 'marcaje')).toBe(50);
  });

  it('escenario 4 de US4: un MED receptor contra un DEL marcador enfrenta visión contra agresividad', () => {
    const { e, receptor, marcador } = escena('MC-1', 'DC', 2);
    conStats(receptor, { vision: 90 });
    conStats(marcador, { agresividad: 60 });
    const esperado = probabilidad({ base: D.base, atacante: 90, defensor: 60, pendiente: D.m }, parametrosActuales());
    const desmarque = atributo(e, e.equipos.local, receptor, 'desmarque');
    const marcaje = atributo(e, e.equipos.visitante, marcador, 'marcaje');
    expect(probabilidadDesmarque(desmarque, marcaje, parametrosActuales())).toBe(esperado);
    expect(esperado).toBeGreaterThan(500);
  });
});

describe('duelo de desmarque antes del pase (FR-011, M2.7)', () => {
  it('sin marcador recibe libre sin tirada: +bonusLibre y cuenta como libre', () => {
    const { e, receptor } = escena('DC', 'DCI', 5);
    const ctx = { ...contextoDe(e), rng: sinTiradas, metricas: {} as Metricas };
    expect(desmarqueDelPase(ctx, e.equipos.local, e.equipos.visitante, receptor)).toEqual({ marcador: null, libre: true, desplazamiento: D.bonusLibre });
    expect(ctx.metricas[receptor.id]).toMatchObject({ recibidoLibre: 1, duelosDesmarque: 0 });
  });

  it('si gana el receptor, recibe libre (+bonusLibre); si gana el marcador, −penalizacionMarcado', () => {
    const gana = escena('DC', 'DCI', 2);
    const ctxGana = { ...contextoDe(gana.e), rng: tiradas(0), metricas: {} as Metricas };
    expect(desmarqueDelPase(ctxGana, gana.e.equipos.local, gana.e.equipos.visitante, gana.receptor)).toEqual({ marcador: gana.marcador, libre: true, desplazamiento: D.bonusLibre });
    expect(ctxGana.metricas[gana.receptor.id]).toMatchObject({ duelosDesmarque: 1, recibidoLibre: 1 });
    expect(ctxGana.metricas[gana.marcador.id]).toBeUndefined();

    const pierde = escena('DC', 'DCI', 2);
    const ctxPierde = { ...contextoDe(pierde.e), rng: tiradas(999), metricas: {} as Metricas };
    expect(desmarqueDelPase(ctxPierde, pierde.e.equipos.local, pierde.e.equipos.visitante, pierde.receptor)).toEqual({
      marcador: pierde.marcador,
      libre: false,
      desplazamiento: -D.penalizacionMarcado,
    });
    expect(ctxPierde.metricas[pierde.receptor.id]).toMatchObject({ duelosDesmarque: 1, recibidoLibre: 0 });
    expect(ctxPierde.metricas[pierde.marcador.id]).toMatchObject({ marcajesGanados: 1 });
  });
});

describe('control con presión (FR-014, M2.9)', () => {
  /** Receptor marcado con el balón ya en los pies. */
  function marcado(casilla = 'DC', parametros: typeof ACTUAL = ACTUAL) {
    const s = escena(casilla, 'DCI', 2, parametros);
    darBalon(s.e, 'local', s.receptor, 5);
    return s;
  }
  const control = (e: EstadoMotor, receptor: JugadorEnPartido, marca: ReturnType<typeof desmarqueDelPase> | null, rng: Rng) => {
    const ctx = { ...contextoDe(e), rng, metricas: {} as Metricas };
    return { perdido: controlConPresion(ctx, e.equipos.local, e.equipos.visitante, receptor, marca), metricas: ctx.metricas };
  };

  it('enfrenta la técnica del receptor contra el quite del marcador', () => {
    const c = parametrosActuales().controlPresion!;
    expect(probabilidadControl(80, 70, parametrosActuales())).toBe(probabilidad({ base: c.base, atacante: 80, defensor: 70, pendiente: c.m }, parametrosActuales()));
    expect(probabilidadControl(90, 70, parametrosActuales())).toBeGreaterThan(probabilidadControl(75, 70, parametrosActuales()));
  });

  it('técnica: DEF y MED su técnica, DEL (regate + creatividad) / 2, POR distribución', () => {
    const e = partido('tecnica', ACTUAL);
    const l = e.equipos.local;
    conStats(titularEn(e, 'local', 'DCI'), { tecnica: 71 });
    conStats(titularEn(e, 'local', 'MC-1'), { tecnica: 83 });
    conStats(titularEn(e, 'local', 'DC'), { regate: 90, creatividad: 70 });
    conStats(titularEn(e, 'local', 'POR'), { distribucion: 66 });
    expect(atributo(e, l, titularEn(e, 'local', 'DCI'), 'tecnica')).toBe(71);
    expect(atributo(e, l, titularEn(e, 'local', 'MC-1'), 'tecnica')).toBe(83);
    expect(atributo(e, l, titularEn(e, 'local', 'DC'), 'tecnica')).toBe(80);
    expect(atributo(e, l, titularEn(e, 'local', 'POR'), 'tecnica')).toBe(66);
  });

  it('si pierde el control, pierde el balón y lo recupera el marcador', () => {
    const { e, receptor, marcador } = marcado();
    const { perdido, metricas } = control(e, receptor, { marcador, libre: false, desplazamiento: -D.penalizacionMarcado }, tiradas(999));
    expect(perdido).toBe(true);
    expect(e.balon.posesion).toBe('visitante');
    expect(e.balon.portadorId).toBe(marcador.id);
    expect(metricas[receptor.id]).toMatchObject({ controlesPresion: 1, controlesPerdidos: 1 });
    expect(metricas[marcador.id]).toMatchObject({ recuperaciones: 1 });
  });

  it('si gana el control, conserva el balón', () => {
    const { e, receptor, marcador } = marcado();
    const { perdido, metricas } = control(e, receptor, { marcador, libre: false, desplazamiento: -D.penalizacionMarcado }, tiradas(0));
    expect(perdido).toBe(false);
    expect(e.balon.posesion).toBe('local');
    expect(e.balon.portadorId).toBe(receptor.id);
    expect(metricas[receptor.id]).toMatchObject({ controlesPresion: 1, controlesPerdidos: 0 });
  });

  it('sin duelo si recibió libre o si nadie le marca', () => {
    const { e, receptor, marcador } = marcado();
    expect(control(e, receptor, { marcador, libre: true, desplazamiento: D.bonusLibre }, sinTiradas)).toEqual({ perdido: false, metricas: {} as Metricas });
    expect(control(e, receptor, { marcador: null, libre: true, desplazamiento: D.bonusLibre }, sinTiradas)).toEqual({ perdido: false, metricas: {} as Metricas });
    expect(control(e, receptor, null, sinTiradas)).toEqual({ perdido: false, metricas: {} as Metricas });
  });
});
