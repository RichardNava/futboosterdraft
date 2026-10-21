/** Contorno de las equipaciones oscuras sobre el lienzo (spec 004, FR-034, research R11). */
import { describe, expect, it } from 'vitest';
import { contraste, necesitaContorno } from '../../src/componentes/colores';

const LIENZO = '#111111';

describe('contraste (WCAG 2.1)', () => {
  it('blanco sobre negro es 21:1 y es simétrico', () => {
    expect(contraste('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('acepta la forma corta #rgb', () => {
    expect(contraste('#fff', '#000')).toBeCloseTo(21, 5);
  });
});

describe('necesitaContorno', () => {
  it.each(['#000000', '#0b1f3a', '#222222'])('%s sobre el lienzo necesita contorno', (color) => {
    expect(necesitaContorno(color, LIENZO)).toBe(true);
  });

  it.each(['#ffffff', '#b7ff2c'])('%s sobre el lienzo no lo necesita', (color) => {
    expect(necesitaContorno(color, LIENZO)).toBe(false);
  });
});
