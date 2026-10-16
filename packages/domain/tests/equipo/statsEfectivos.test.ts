import { describe, expect, it } from 'vitest';
import { casilla, CASILLA_CENTRAL } from '../../src/equipo/formaciones';
import { statsEfectivos } from '../../src/equipo/statsEfectivos';
import { PARAMETROS_V1 } from '../../src/parametros/index';
import { jugador } from './ayudas';

const p = PARAMETROS_V1;

describe('statsEfectivos (FR-025a, FR-027, FR-028)', () => {
  it('en una casilla de su posición no hay penalización', () => {
    const lateral = jugador('DEF', ['LD'], 80);
    const r = statsEfectivos(lateral, casilla('4-3-3', 'LD')!, p);
    expect(r.fueraDePosicion).toBe(false);
    expect(r.penalizacion).toBe(0);
    expect(r.media).toBeCloseTo(80);
  });

  it('un jugador de campo fuera de posición pierde un 25 %', () => {
    const medio = jugador('MED', ['MC'], 80);
    const r = statsEfectivos(medio, casilla('4-3-3', 'LD')!, p);
    expect(r.fueraDePosicion).toBe(true);
    expect(r.penalizacion).toBe(0.25);
    expect(Object.values(r.stats).every((v) => v === 60)).toBe(true);
    expect(r.media).toBeCloseTo(60);
  });

  it('un jugador de campo en la portería, o un portero fuera de ella, pierde un 60 %', () => {
    const defensa = jugador('DEF', ['DCI'], 80);
    expect(statsEfectivos(defensa, casilla('4-3-3', 'POR')!, p)).toMatchObject({ penalizacion: 0.6, fueraDePosicion: true });
    const portero = jugador('POR', ['POR'], 80);
    const r = statsEfectivos(portero, casilla('4-3-3', 'DC')!, p);
    expect(r.penalizacion).toBe(0.6);
    expect(r.media).toBeCloseTo(32);
  });

  it('un DCI o un DCD ocupa sin penalización la casilla central de una defensa de 3 (FR-025a)', () => {
    const central = casilla('3-5-2', CASILLA_CENTRAL)!;
    expect(statsEfectivos(jugador('DEF', ['DCI'], 80), central, p).fueraDePosicion).toBe(false);
    expect(statsEfectivos(jugador('DEF', ['DCD'], 80), central, p).fueraDePosicion).toBe(false);
    expect(statsEfectivos(jugador('MED', ['MD'], 80), central, p).penalizacion).toBe(0.25);
  });

  it('Todocampista no sufre penalización salvo en la portería', () => {
    const todo = jugador('MED', ['MC'], 80, ['Todocampista']);
    expect(statsEfectivos(todo, casilla('4-3-3', 'ED')!, p).penalizacion).toBe(0);
    expect(statsEfectivos(todo, casilla('3-5-2', CASILLA_CENTRAL)!, p).penalizacion).toBe(0);
    expect(statsEfectivos(todo, casilla('4-3-3', 'POR')!, p).penalizacion).toBe(0.6);
  });

  it('la media efectiva es el promedio de los stats efectivos, con un mínimo de 1 por stat', () => {
    const medio = jugador('MED', ['MC'], 2, [], { pase: 90 });
    const r = statsEfectivos(medio, casilla('4-3-3', 'POR')!, p);
    expect(Math.min(...Object.values(r.stats))).toBeGreaterThanOrEqual(1);
    const valores = Object.values(r.stats);
    expect(r.media).toBeCloseTo(valores.reduce((a, b) => a + b, 0) / valores.length);
  });
});
