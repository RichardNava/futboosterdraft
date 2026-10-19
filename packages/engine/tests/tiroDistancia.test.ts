/**
 * Tiro decidido y resuelto con la distancia y el ángulo reales (spec 003, research R6; FR-018; T013).
 */
import { PARAMETROS_V3 } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { probabilidad } from '../src/acciones/duelo';
import { desplazamientoTiro, pesoTiro, tipoSegunPosicion } from '../src/acciones/tiro';
import { anguloTiro, decimasDeMetros, enAreaRival, zonaRemate } from '../src/espacio/campo';

const p = PARAMETROS_V3;

describe('peso de tirar por distancia y ángulo', () => {
  it('baja de forma monótona con la distancia', () => {
    let anterior = Infinity;
    for (let m = 1; m <= 50; m++) {
      const peso = pesoTiro(p, decimasDeMetros(m), 30, false);
      expect(peso, `${m} m`).toBeLessThanOrEqual(anterior);
      anterior = peso;
    }
    // Dentro de cada tramo, su peso (valores calibrados en v3.json, T033).
    expect(pesoTiro(p, decimasDeMetros(8), 30, false)).toBe(p.tiro.pesoPorTramo[0]!.peso);
    expect(pesoTiro(p, decimasDeMetros(20), 30, false)).toBe(p.tiro.pesoPorTramo[2]!.peso);
  });

  it('a más de 35 m el peso es 0, salvo con el portero rival adelantado (≥ 15 m de su línea)', () => {
    expect(pesoTiro(p, decimasDeMetros(36), 30, false)).toBe(0);
    expect(pesoTiro(p, decimasDeMetros(45), 30, false)).toBe(0);
    expect(pesoTiro(p, decimasDeMetros(45), 30, true)).toBeGreaterThan(0);
  });

  it('con un ángulo de menos de 6° el peso es 0, y con menos de 15° es la mitad', () => {
    const d = decimasDeMetros(10);
    expect(pesoTiro(p, d, 5, false)).toBe(0);
    expect(pesoTiro(p, d, 10, false)).toBe(pesoTiro(p, d, 30, false) / 2);
    expect(pesoTiro(p, d, 15, false)).toBe(pesoTiro(p, d, 30, false));
  });
});

describe('probabilidad de puerta y de gol por distancia', () => {
  it('el desplazamiento de la sigmoide y la probabilidad de gol bajan de forma monótona con la distancia', () => {
    let anteriorX = Infinity;
    let anteriorP = Infinity;
    for (let m = 5; m <= 40; m++) {
      const x = desplazamientoTiro(p, decimasDeMetros(m), 25);
      const prob = probabilidad({ base: 0, atacante: 80, defensor: 70, desplazamiento: x }, p);
      expect(x, `${m} m`).toBeLessThanOrEqual(anteriorX);
      expect(prob, `${m} m`).toBeLessThanOrEqual(anteriorP);
      anteriorX = x;
      anteriorP = prob;
    }
    expect(desplazamientoTiro(p, decimasDeMetros(11), 40)).toBe(0);
  });

  it('un ángulo más cerrado reduce la probabilidad', () => {
    expect(desplazamientoTiro(p, decimasDeMetros(12), 8)).toBeLessThan(desplazamientoTiro(p, decimasDeMetros(12), 30));
  });
});

describe('tipo y zona del remate según la posición real', () => {
  it('normal dentro del área y lejano fuera; cabeza, mano a mano, falta y penalti se conservan', () => {
    const area = { x: 9000, y: 3200 };
    const frontal = { x: 8000, y: 3200 };
    expect(enAreaRival(area)).toBe(true);
    expect(tipoSegunPosicion('normal', area)).toBe('normal');
    expect(tipoSegunPosicion('normal', frontal)).toBe('lejano');
    expect(tipoSegunPosicion('lejano', area)).toBe('normal');
    for (const t of ['cabeza', 'manoAMano', 'falta', 'penalti'] as const) expect(tipoSegunPosicion(t, frontal)).toBe(t);
  });

  it('zona del remate: área, frontal (≤ 25 m) y lejos', () => {
    expect(zonaRemate({ x: 9000, y: 3200 })).toBe('area');
    expect(zonaRemate({ x: 8000, y: 3200 })).toBe('frontal');
    expect(zonaRemate({ x: 10000 - decimasDeMetros(26), y: 3200 })).toBe('lejos');
  });

  it('el ángulo de tiro se abre al acercarse y se cierra hacia la banda', () => {
    expect(anguloTiro({ x: 8900, y: 3200 })).toBeGreaterThan(anguloTiro({ x: 7000, y: 3200 }));
    expect(anguloTiro({ x: 9000, y: 3200 })).toBeGreaterThan(anguloTiro({ x: 9000, y: 1200 }));
    expect(anguloTiro({ x: 9900, y: 400 })).toBeLessThan(6);
  });
});
