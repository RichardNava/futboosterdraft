/**
 * Aritmética entera de la capa espacial (research R3, T064): sin coma flotante en las decisiones, para que
 * el partido sea idéntico en cualquier máquina y versión del motor de JavaScript.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { dist2, escalar, isqrt, norma } from '../../src/espacio/aritmetica';

describe('aritmética entera (T064)', () => {
  it('isqrt(n) es el mayor entero cuyo cuadrado no supera n', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2_000_000_000 }), (n) => {
        const r = isqrt(n);
        expect(Number.isInteger(r)).toBe(true);
        expect(r * r).toBeLessThanOrEqual(n);
        expect((r + 1) * (r + 1)).toBeGreaterThan(n);
      }),
    );
  });

  it('dist2 y norma son enteros y coherentes', () => {
    fc.assert(
      fc.property(fc.integer({ min: -10000, max: 10000 }), fc.integer({ min: -6400, max: 6400 }), (dx, dy) => {
        expect(dist2(0, 0, dx, dy)).toBe(dx * dx + dy * dy);
        expect(norma(dx, dy)).toBe(isqrt(dx * dx + dy * dy));
      }),
    );
  });

  it('escalar un vector conserva su dirección (error de una décima como mucho) y devuelve enteros', () => {
    fc.assert(
      fc.property(fc.integer({ min: -10000, max: 10000 }), fc.integer({ min: -6400, max: 6400 }), fc.integer({ min: 1, max: 400 }), (dx, dy, largo) => {
        fc.pre(dx !== 0 || dy !== 0);
        const [ex, ey] = escalar(dx, dy, largo);
        expect(Number.isInteger(ex) && Number.isInteger(ey)).toBe(true);
        // Mismo sentido y proporción (producto vectorial ~ 0 respecto al tamaño).
        expect(Math.abs(ex * dy - ey * dx)).toBeLessThanOrEqual(Math.abs(dx) + Math.abs(dy) + 1);
        expect(Math.abs(norma(ex, ey) - largo)).toBeLessThanOrEqual(3);
      }),
    );
  });
});
