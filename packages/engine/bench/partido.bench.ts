/**
 * Coste del motor por partido (spec 018, FR-039): ≤ 60 ms sin fotogramas, ≤ 80 ms con fotogramas y ≤ 60 ms con las
 * métricas por jugador de `balance`. Se ejecuta con `pnpm --filter @fbd/engine bench`; solo informa, y dentro de vitest
 * cada partido cuesta unos 20 ms más que fuera (los mismos equipos: 76 frente a 54 ms el 2026-11-26). La medida oficial,
 * que bloquea el CI y mide también `resolverResto`, es `umbral-motor`: `@fbd/ai` depende de `@fbd/engine` y traerlo aquí
 * crearía un ciclo entre paquetes (spec 018, T067).
 */
import { semillaDesdeTexto } from '@fbd/domain';
import { bench, describe } from 'vitest';
import { avanzar, crearPartido } from '../src/index';
import { entrada as entradaDePrueba } from '../tests/ayudas';

// Los mismos equipos con otra semilla en cada partido: `entradaDePrueba` crea jugadores con ids siempre nuevos, y por
// encima de unos 1000 V8 guarda en modo diccionario los registros por id del motor (spec 018, T066).
const base = entradaDePrueba('bench');
const entrada = (semilla: string) => ({ ...base, semilla: semillaDesdeTexto(semilla) });
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
