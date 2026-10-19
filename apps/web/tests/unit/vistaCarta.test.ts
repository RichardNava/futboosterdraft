/** Posición de la carta ampliada (spec 003, research R15; SC-015). */
import { describe, expect, it } from 'vitest';
import { posicionarVista } from '../../src/componentes/VistaCarta';

const carta = { width: 240, height: 340 };
const dentro = (pos: { left: number; top: number }, vp: { width: number; height: number }) =>
  pos.left >= 8 && pos.top >= 8 && pos.left + carta.width <= vp.width - 8 && pos.top + carta.height <= vp.height - 8;
const solapa = (pos: { left: number; top: number }, a: { left: number; top: number; width: number; height: number }) =>
  pos.left < a.left + a.width && pos.left + carta.width > a.left && pos.top < a.top + a.height && pos.top + carta.height > a.top;

describe('posicionarVista', () => {
  for (const vp of [
    { width: 1366, height: 768 },
    { width: 360, height: 640 },
  ]) {
    it(`queda entera dentro del viewport ${vp.width}×${vp.height} con fichas en las cuatro esquinas`, () => {
      const ficha = 44;
      const esquinas = [
        { left: 4, top: 4 },
        { left: vp.width - ficha - 4, top: 4 },
        { left: 4, top: vp.height - ficha - 4 },
        { left: vp.width - ficha - 4, top: vp.height - ficha - 4 },
      ];
      for (const e of esquinas) {
        const a = { ...e, width: ficha, height: ficha };
        const pos = posicionarVista(a, carta, vp);
        expect(dentro(pos, vp)).toBe(true);
        // En portátil siempre hay un lado libre: no tapa la ficha.
        if (vp.width > 1000) expect(solapa(pos, a)).toBe(false);
      }
    });
  }

  it('prefiere la derecha si cabe', () => {
    const pos = posicionarVista({ left: 100, top: 300, width: 40, height: 40 }, carta, { width: 1366, height: 768 });
    expect(pos.left).toBe(148);
  });
});
