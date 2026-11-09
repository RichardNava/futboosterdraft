import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GRADA, iniciarAmbiente, INTERVALOS, MOMENTOS } from '../../src/sonido/ambiente';

describe('ambiente de público de la 2D (spec 012, ronda 4)', () => {
  it('sin Web Audio no hace nada y no falla', () => {
    const a = iniciarAmbiente();
    expect(() => {
      a.intensidad(0.35);
      a.detener();
    }).not.toThrow();
  });

  it('cada grabación existe y los intervalos tienen sentido', () => {
    const nombres = [GRADA, ...Object.values(MOMENTOS).flatMap((m) => m.tomas)];
    for (const n of nombres) expect(existsSync(fileURLToPath(new URL(`../../public/sonidos/${n}.mp3`, import.meta.url))), n).toBe(true);
    for (const [min, max] of Object.values(INTERVALOS)) expect(min).toBeLessThan(max);
  });
});
