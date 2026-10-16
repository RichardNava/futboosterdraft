import { describe, expect, it } from 'vitest';
import { derivarSemilla, estadoDesdeSemilla, Rng, semillaDesdeTexto } from '../src/rng/xoshiro';

const SEMILLA = '0123456789abcdef0123456789abcdef';

describe('Rng xoshiro128**', () => {
  it('la misma semilla produce la misma secuencia', () => {
    const a = new Rng(SEMILLA);
    const b = new Rng(SEMILLA);
    const sa = Array.from({ length: 1000 }, () => a.siguiente());
    const sb = Array.from({ length: 1000 }, () => b.siguiente());
    expect(sa).toEqual(sb);
  });

  it('semillas distintas producen secuencias distintas', () => {
    const a = new Rng(SEMILLA);
    const b = new Rng(semillaDesdeTexto('otra'));
    expect(Array.from({ length: 10 }, () => a.siguiente())).not.toEqual(
      Array.from({ length: 10 }, () => b.siguiente()),
    );
  });

  it('el estado guardado permite reanudar la secuencia exacta', () => {
    const a = new Rng(SEMILLA);
    for (let i = 0; i < 50; i++) a.siguiente();
    const copia = new Rng(a.estado());
    expect(Array.from({ length: 20 }, () => a.siguiente())).toEqual(
      Array.from({ length: 20 }, () => copia.siguiente()),
    );
  });

  it('rechaza semillas mal formadas', () => {
    expect(() => new Rng('xyz')).toThrow();
    expect(() => estadoDesdeSemilla('0'.repeat(31))).toThrow();
  });

  it('entero() es uniforme (χ² sobre 100.000 tiradas, 10 categorías)', () => {
    const rng = new Rng(SEMILLA);
    const n = 100_000;
    const cuentas = new Array<number>(10).fill(0);
    for (let i = 0; i < n; i++) cuentas[rng.entero(0, 9)]! += 1;
    const esperado = n / 10;
    const chi2 = cuentas.reduce((acc, c) => acc + (c - esperado) ** 2 / esperado, 0);
    // Valor crítico χ²(9 g.l., p = 0,001) = 27,88
    expect(chi2).toBeLessThan(27.88);
  });

  it('entero() respeta los límites', () => {
    const rng = new Rng(SEMILLA);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.entero(-3, 3);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThanOrEqual(3);
    }
  });

  it('probabilidad() se aproxima a la frecuencia indicada', () => {
    const rng = new Rng(SEMILLA);
    let exitos = 0;
    for (let i = 0; i < 100_000; i++) if (rng.probabilidad(200)) exitos++;
    expect(exitos / 100_000).toBeCloseTo(0.2, 2);
    expect(rng.probabilidad(0)).toBe(false);
    expect(rng.probabilidad(1000)).toBe(true);
  });

  it('barajar() es una permutación y no modifica la lista original', () => {
    const rng = new Rng(SEMILLA);
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const barajada = rng.barajar(original);
    expect([...barajada].sort((a, b) => a - b)).toEqual(original);
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('derivarSemilla() es determinista y depende de la etiqueta', () => {
    expect(derivarSemilla(SEMILLA, 'mesa:0')).toBe(derivarSemilla(SEMILLA, 'mesa:0'));
    expect(derivarSemilla(SEMILLA, 'mesa:0')).not.toBe(derivarSemilla(SEMILLA, 'mesa:1'));
    expect(derivarSemilla(SEMILLA, 'mesa:0')).toMatch(/^[0-9a-f]{32}$/);
  });
});
