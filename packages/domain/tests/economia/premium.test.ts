import { describe, expect, it } from 'vitest';
import { nuevoFin, premiumActivo } from '../../src/economia/premium';

const ahora = Date.UTC(2026, 10, 10, 12);
const dias = (n: number) => ahora + n * 86_400_000;

describe('pase premium (spec 013, FR-034 a FR-036)', () => {
  it('premiumActivo: cortesía, o fin posterior a ahora', () => {
    expect(premiumActivo({ fin: null, cortesia: false }, ahora)).toBe(false);
    expect(premiumActivo({ fin: null, cortesia: true }, ahora)).toBe(true);
    expect(premiumActivo({ fin: dias(1), cortesia: false }, ahora)).toBe(true);
    expect(premiumActivo({ fin: ahora, cortesia: false }, ahora)).toBe(false);
  });

  it('nuevoFin: activo suma 30 días a su fin; caducado o nunca comprado, desde ahora', () => {
    expect(nuevoFin({ fin: dias(10), cortesia: false }, ahora, 30)).toBe(dias(40));
    expect(nuevoFin({ fin: dias(-5), cortesia: false }, ahora, 30)).toBe(dias(30));
    expect(nuevoFin({ fin: null, cortesia: false }, ahora, 30)).toBe(dias(30));
  });
});
