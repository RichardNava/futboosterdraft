import { PARAMETROS_V3, type Jugador } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { cobertura, escasezPorteros, sinergia, valorCarta, valorRasgos } from '../src/evaluador';
import { PERFILES, TODAS_LAS_FORMACIONES } from '../src/perfiles';
import { jugador } from './ayudas';

const p = PARAMETROS_V3;
const pesos = PERFILES.PRO.pesos;

describe('evaluador de los NPC (T119)', () => {
  it('una carta que cubre una posición que falta puntúa más que otra de media similar que no la cubre', () => {
    // Plantilla con muchos centrocampistas y ningún lateral.
    const parcial: Jugador[] = [jugador('POR'), jugador('POR'), ...Array.from({ length: 8 }, () => jugador('MC')), jugador('DCI'), jugador('DCD'), jugador('DC')];
    const lateral = jugador('LD', 80);
    const otroMC = jugador('MC', 81);
    expect(cobertura(lateral, parcial, TODAS_LAS_FORMACIONES)).toBeGreaterThan(cobertura(otroMC, parcial, TODAS_LAS_FORMACIONES));
    expect(valorCarta(lateral, parcial, pesos, TODAS_LAS_FORMACIONES, p)).toBeGreaterThan(valorCarta(otroMC, parcial, pesos, TODAS_LAS_FORMACIONES, p));
  });

  it('con 0 porteros en la plantilla, la escasez sube el valor de un POR', () => {
    const portero = jugador('POR', 78);
    const sinPorteros = [jugador('DCI'), jugador('MC'), jugador('DC')];
    const conPorteros = [...sinPorteros, jugador('POR'), jugador('POR')];
    expect(escasezPorteros(portero, sinPorteros)).toBe(1);
    expect(valorCarta(portero, sinPorteros, pesos, TODAS_LAS_FORMACIONES, p)).toBeGreaterThan(valorCarta(portero, conPorteros, pesos, TODAS_LAS_FORMACIONES, p));
    // Y con la plantilla sin porteros, el POR gana a un jugador de campo de más media.
    expect(valorCarta(portero, sinPorteros, pesos, TODAS_LAS_FORMACIONES, p)).toBeGreaterThan(valorCarta(jugador('MC', 82), sinPorteros, pesos, TODAS_LAS_FORMACIONES, p));
  });

  it('la sinergia de virtudes puntúa, y una virtud de equipo nueva vale más que una repetida', () => {
    const parcial = [jugador('DCI', 80, ['Capitania'])];
    const conVirtud = jugador('MC', 80, ['Jerarquia']);
    const repetido = jugador('MC', 80, ['Capitania']);
    const sinVirtud = jugador('MC', 80);
    expect(sinergia(conVirtud, parcial)).toBeGreaterThan(sinergia(repetido, parcial));
    expect(sinergia(repetido, parcial)).toBeGreaterThan(sinergia(sinVirtud, parcial));
    expect(valorCarta(conVirtud, parcial, pesos, TODAS_LAS_FORMACIONES, p)).toBeGreaterThan(valorCarta(sinVirtud, parcial, pesos, TODAS_LAS_FORMACIONES, p));
  });

  it('el amateur solo mira la media', () => {
    const sinPorteros = [jugador('DCI'), jugador('MC')];
    const portero = jugador('POR', 78);
    const mc = jugador('MC', 82);
    const a = PERFILES.amateur.pesos;
    expect(valorCarta(mc, sinPorteros, a, TODAS_LAS_FORMACIONES, p)).toBeGreaterThan(valorCarta(portero, sinPorteros, a, TODAS_LAS_FORMACIONES, p));
  });
});

describe('rasgos en el valor de la carta (spec 005, T055; FR-043)', () => {
  it('suma el impacto de las virtudes y resta 1 − impacto de cada defecto', () => {
    const j = { ...jugador('DC', 85, ['Matador', 'Capitania']), defectos: ['Polemico' as const] };
    expect(valorRasgos(j)).toBeCloseTo(0.65 + 0.8 - (1 - 0.25));
    expect(valorRasgos(jugador('DC', 85))).toBe(0);
  });

  it('entre dos cartas iguales, la que tiene un defecto vale menos, y más cuanto más perjudica', () => {
    const base = jugador('DC', 85);
    const conPolemico = { ...base, defectos: ['Polemico' as const] };
    const conProvocador = { ...base, defectos: ['Provocador' as const] };
    const a = PERFILES.avanzado.pesos;
    const v = (c: Jugador) => valorCarta(c, [], a, TODAS_LAS_FORMACIONES, p);
    expect(v(conProvocador)).toBeLessThan(v(base));
    expect(v(conPolemico)).toBeLessThan(v(conProvocador));
  });

  it('los niveles bajos ponderan menos los rasgos', () => {
    const k = (n: keyof typeof PERFILES) => PERFILES[n].pesos.rasgos;
    expect(k('amateur')).toBeLessThan(k('intermedio'));
    expect(k('intermedio')).toBeLessThan(k('avanzado'));
    expect(k('avanzado')).toBeLessThan(k('PRO'));
  });
});
