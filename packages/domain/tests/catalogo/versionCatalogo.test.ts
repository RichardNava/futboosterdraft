/**
 * Versión del catálogo (spec 005, T027 y T050; research R4; FR-036): las partidas anteriores a la spec 005 siguen con
 * sus cartas de entonces.
 */
import { describe, expect, it } from 'vitest';
import { cartaEnVersion, VERSION_CATALOGO_ACTUAL, VIRTUD_CEDIDA_015, type Jugador } from '../../src/index';
import { jugador } from '../equipo/ayudas';

describe('cartaEnVersion', () => {
  const carta: Jugador = { ...jugador('DEL', ['DC'], 85, ['Matador', 'DeAcero', 'Revulsivo']), defectos: ['Chupon', 'Estrellita'] };

  it('la versión actual es la 3 y devuelve la carta tal cual', () => {
    expect(VERSION_CATALOGO_ACTUAL).toBe(3);
    expect(cartaEnVersion(carta, 3)).toBe(carta);
    expect(cartaEnVersion(carta, 2)).toEqual(carta);
  });

  it('la versión 1 quita los defectos y las cuatro virtudes nuevas, y no toca nada más', () => {
    const antigua = cartaEnVersion(carta, 1);
    expect(antigua).toEqual({ ...carta, virtudes: ['Matador'], defectos: [] });
    expect(carta.defectos).toEqual(['Chupon', 'Estrellita']);
  });
});

describe('cartaEnVersion con las seis cartas de la spec 015 (contracts/catalogo.md §C3)', () => {
  const central = (id: number): Jugador => ({ ...jugador('DEF', ['DCI'], 85, ['Capitania', 'Cabeceador']), id, defectos: ['Agresivo'] });

  it.each([
    [60, 'MuroDefensivo'],
    [76, 'Volador'],
    [77, 'Potente'],
    [86, 'Intimidante'],
    [87, 'Aura'],
    [275, 'Potente'],
  ] as const)('la versión 2 devuelve a la carta %i su %s en lugar de Cabeceador', (id, cedida) => {
    expect(VIRTUD_CEDIDA_015[id]).toBe(cedida);
    expect(cartaEnVersion(central(id), 2)).toEqual({ ...central(id), virtudes: ['Capitania', cedida] });
  });

  it('las demás cartas con Cabeceador no cambian en la versión 2', () => {
    const otra = central(1);
    expect(cartaEnVersion(otra, 2)).toEqual(otra);
  });

  it('la versión 1 cambia además lo que ya cambiaba (defectos fuera)', () => {
    expect(cartaEnVersion(central(87), 1)).toEqual({ ...central(87), virtudes: ['Capitania', 'Aura'], defectos: [] });
  });
});
