import { PARAMETROS_V3, type Jugador } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { cobertura, escasezPorteros, sinergia, valorCarta } from '../src/evaluador';
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

  it('la sinergia de specials puntúa, y un special de equipo nuevo vale más que uno repetido', () => {
    const parcial = [jugador('DCI', 80, ['Capitania'])];
    const conSpecial = jugador('MC', 80, ['Jerarquia']);
    const repetido = jugador('MC', 80, ['Capitania']);
    const sinSpecial = jugador('MC', 80);
    expect(sinergia(conSpecial, parcial)).toBeGreaterThan(sinergia(repetido, parcial));
    expect(sinergia(repetido, parcial)).toBeGreaterThan(sinergia(sinSpecial, parcial));
    expect(valorCarta(conSpecial, parcial, pesos, TODAS_LAS_FORMACIONES, p)).toBeGreaterThan(valorCarta(sinSpecial, parcial, pesos, TODAS_LAS_FORMACIONES, p));
  });

  it('el amateur solo mira la media', () => {
    const sinPorteros = [jugador('DCI'), jugador('MC')];
    const portero = jugador('POR', 78);
    const mc = jugador('MC', 82);
    const a = PERFILES.amateur.pesos;
    expect(valorCarta(mc, sinPorteros, a, TODAS_LAS_FORMACIONES, p)).toBeGreaterThan(valorCarta(portero, sinPorteros, a, TODAS_LAS_FORMACIONES, p));
  });
});
