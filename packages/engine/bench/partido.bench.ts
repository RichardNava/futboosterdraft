/**
 * Coste del motor por partido (research R3, FR-028a): ≤ 25 ms sin fotogramas, ≤ 40 ms con fotogramas, ≤ 30 ms con
 * las métricas por jugador de `balance` (spec 003, T037) y `resolverResto` ≤ 30 ms. Se ejecuta con `pnpm --filter @fbd/engine bench`.
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

  bench('con métricas', () => {
    avanzar(crearPartido(entrada(`bench-${n++}`)), 'final', { metricas: true });
  });
});
