/**
 * Interpolación de los fotogramas v2 (research R5; T071).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { agregarFotogramas, indiceFotograma, posicionesEn, RADIO_CHAPA, type Fotograma } from '../../src/campo2d/interpolacion';

const ORDEN = [10, 20];

/** Fotogramas cada 2 ticks con dos jugadores que siguen las funciones dadas (y el balón quieto en el suelo). */
function fotogramas(n: number, x: (t: number) => number, y: (t: number) => number): Fotograma[] {
  return Array.from({ length: n }, (_, k) => {
    const t = 2 * k;
    return [t, 500, 320, 0, x(t), y(t), 1000 - x(t), 640 - y(t)];
  });
}

describe('interpolación (T071)', () => {
  it('Hermite cúbica: posición y velocidad continuas al pasar por cada fotograma', () => {
    const fs = fotogramas(
      40,
      (t) => 100 + 3 * t + 20 * Math.sin(t / 7),
      (t) => 300 + 40 * Math.cos(t / 9),
    );
    const eps = 1e-6;
    for (let k = 1; k < fs.length - 1; k++) {
      const t = fs[k]![0]!;
      const antes = posicionesEn(fs, ORDEN, t - eps)!;
      const despues = posicionesEn(fs, ORDEN, t + eps)!;
      for (const id of ORDEN) {
        const [xa, ya] = antes.jugadores.get(id)!;
        const [xd, yd] = despues.jugadores.get(id)!;
        expect(Math.hypot(xa - xd, ya - yd)).toBeLessThan(1e-3);
        const [vxa, vya] = antes.velocidades.get(id)!;
        const [vxd, vyd] = despues.velocidades.get(id)!;
        expect(Math.hypot(vxa - vxd, vya - vyd)).toBeLessThan(1e-3);
      }
      // En el propio fotograma, exactamente su posición.
      const en = posicionesEn(fs, ORDEN, t)!;
      expect(en.jugadores.get(10)).toEqual([fs[k]![4], fs[k]![5]]);
    }
  });

  it('una trayectoria recta a velocidad constante se reproduce sin ondulaciones', () => {
    const fs = fotogramas(
      20,
      (t) => 100 + 5 * t,
      () => 300,
    );
    for (let t = 2; t < 36; t += 0.25) {
      const [x, y] = posicionesEn(fs, ORDEN, t)!.jugadores.get(10)!;
      expect(x).toBeCloseTo(100 + 5 * t, 6);
      expect(y).toBeCloseTo(300, 6);
    }
  });

  it('el balón aéreo sigue una parábola en z dentro de la acción', () => {
    // Centro de 20 ticks con altura máxima 40: z = 4·40·s·(1 − s), muestreado cada 2 ticks.
    const total = 20;
    const z = (t: number) => (t < 0 || t > total ? 0 : (4 * 40 * t * (total - t)) / (total * total));
    const fs: Fotograma[] = Array.from({ length: total / 2 + 1 }, (_, k) => [2 * k, 100 + 20 * k, 320, Math.round(z(2 * k) * 1000) / 1000, 0, 0, 0, 0]);
    for (let t = 0; t <= total; t += 0.5) {
      const [, , bz] = posicionesEn(fs, ORDEN, t)!.balon;
      expect(bz).toBeCloseTo(z(t), 2);
    }
    // En el suelo, nada de alturas inventadas.
    const raso = fotogramas(10, (t) => t, () => 0);
    for (let t = 0; t < 18; t += 0.5) expect(posicionesEn(raso, ORDEN, t)!.balon[2]).toBe(0);
  });

  it('nunca se sale más de un radio de chapa del tramo entre dos fotogramas', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.integer({ min: 0, max: 1000 }), fc.integer({ min: 0, max: 640 })), { minLength: 4, maxLength: 30 }), (puntos) => {
        const fs: Fotograma[] = puntos.map(([x, y], k) => [2 * k, 0, 0, 0, x, y, 0, 0]);
        for (let k = 0; k < fs.length - 1; k++) {
          for (const s of [0.1, 0.25, 0.5, 0.75, 0.9]) {
            const [x, y] = posicionesEn(fs, ORDEN, 2 * k + 2 * s)!.jugadores.get(10)!;
            const [a, b] = [fs[k]!, fs[k + 1]!];
            expect(x).toBeGreaterThanOrEqual(Math.min(a[4]!, b[4]!) - RADIO_CHAPA - 1e-9);
            expect(x).toBeLessThanOrEqual(Math.max(a[4]!, b[4]!) + RADIO_CHAPA + 1e-9);
            expect(y).toBeGreaterThanOrEqual(Math.min(a[5]!, b[5]!) - RADIO_CHAPA - 1e-9);
            expect(y).toBeLessThanOrEqual(Math.max(a[5]!, b[5]!) + RADIO_CHAPA + 1e-9);
          }
        }
      }),
    );
  });

  it('quien entra aparece en su sitio y quien sale desaparece; los ticks repetidos no se duplican', () => {
    const fs: Fotograma[] = [
      [0, 0, 0, 0, 100, 100, -1, -1],
      [2, 0, 0, 0, 110, 100, 300, 300],
      [4, 0, 0, 0, -1, -1, 310, 300],
    ];
    expect(posicionesEn(fs, ORDEN, 0.5)!.jugadores.get(20)).toEqual([300, 300]);
    expect(posicionesEn(fs, ORDEN, 3)!.jugadores.get(10)).toEqual([110, 100]);
    expect(posicionesEn(fs, ORDEN, 4)!.jugadores.has(10)).toBe(false);

    const lista: Fotograma[] = [];
    agregarFotogramas(lista, fs);
    agregarFotogramas(lista, [[4, 1, 1, 0, 0, 0, 0, 0], [6, 1, 1, 0, 0, 0, 0, 0]]);
    expect(lista.map((f) => f[0])).toEqual([0, 2, 4, 6]);
    expect(indiceFotograma(lista, 5)).toBe(2);
    expect(indiceFotograma(lista, -1)).toBe(-1);
  });
});
