import { describe, expect, it } from 'vitest';
import { validarDatosCosmetico } from '../../src/cosmeticos/celebraciones';

describe('datos de cosméticos (spec 012, data-model §2)', () => {
  it('una celebración necesita datos; los demás tipos no los admiten', () => {
    expect(validarDatosCosmetico('celebracion', undefined)).not.toEqual([]);
    expect(validarDatosCosmetico('celebracion', null)).not.toEqual([]);
    expect(validarDatosCosmetico('escudo', { clase: 'juego', duracionMs: 1000 })).not.toEqual([]);
    expect(validarDatosCosmetico('sobre', undefined)).toEqual([]);
    expect(validarDatosCosmetico('escudo', null)).toEqual([]);
  });

  it('las de juego duran como mucho 3000 ms; las secuencias, lo que dure el vídeo', () => {
    expect(validarDatosCosmetico('celebracion', { clase: 'juego', duracionMs: 3000 })).toEqual([]);
    expect(validarDatosCosmetico('celebracion', { clase: 'juego', duracionMs: 3001 })).not.toEqual([]);
    expect(validarDatosCosmetico('celebracion', { clase: 'secuencia', duracionMs: 4500, sonido: 'golPropio' })).toEqual([]);
  });

  it('rechaza duraciones no positivas y clases desconocidas', () => {
    expect(validarDatosCosmetico('celebracion', { clase: 'juego', duracionMs: 0 })).not.toEqual([]);
    expect(validarDatosCosmetico('celebracion', { clase: 'secuencia', duracionMs: -1 })).not.toEqual([]);
    expect(validarDatosCosmetico('celebracion', { clase: 'gif', duracionMs: 1000 })).not.toEqual([]);
  });
});
