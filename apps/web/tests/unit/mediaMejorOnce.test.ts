/** Media del mejor once de una plantilla (Plantillas, spec 012, ronda 2). */
import { describe, expect, it } from 'vitest';
import { mediaMejorOnce } from '../../src/componentes/MediaEquipo';

const carta = (demarcacion: 'POR' | 'DEF' | 'MED' | 'DEL', media: number) => ({ demarcacion, media });

describe('mediaMejorOnce', () => {
  it('el mejor portero y los diez mejores de campo; el segundo portero no cuenta aunque sea mejor', () => {
    const plantilla = [carta('POR', 90), carta('POR', 88), ...Array.from({ length: 10 }, () => carta('MED', 80)), carta('DEL', 60)];
    expect(mediaMejorOnce(plantilla)).toBeCloseTo((90 + 800) / 11);
  });

  it('sin portero, los diez mejores de campo; sin jugadores, null', () => {
    expect(mediaMejorOnce([carta('DEF', 70), carta('DEL', 80)])).toBe(75);
    expect(mediaMejorOnce([])).toBeNull();
  });
});
