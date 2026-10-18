/**
 * Coste del motor por partido (research R3, FR-028a): ≤ 25 ms sin fotogramas, ≤ 40 ms con fotogramas y
 * `resolverResto` ≤ 30 ms. Se ejecuta con `pnpm --filter @fbd/engine bench`.
 */
import { bench, describe } from 'vitest';
import { avanzar, crearPartido } from '../src/index';
import { entrada } from '../tests/ayudas';

let n = 0;

describe('partido completo', () => {
  bench('sin fotogramas', () => {
    avanzar(crearPartido(entrada(`bench-${n++}`)), 'final');
  });

  bench('con fotogramas', () => {
    avanzar(crearPartido(entrada(`bench-${n++}`)), 'final', { fotogramas: true });
  });
});
