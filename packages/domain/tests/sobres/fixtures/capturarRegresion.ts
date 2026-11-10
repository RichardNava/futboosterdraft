/**
 * Captura de la fixture de regresión del generador (spec 013, T001; G4, SC-005). Se ejecutó una sola vez en `e9aca5d`,
 * antes de cambiar `generador.ts`: `pnpm --filter @fbd/domain exec tsx tests/sobres/fixtures/capturarRegresion.ts`.
 * No volver a ejecutar: la fixture es la salida del generador antiguo.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Jugador } from '../../../src/catalogo/tipos';
import { PARAMETROS_V6_2 } from '../../../src/parametros/index';
import { semillaDesdeTexto } from '../../../src/rng/xoshiro';
import { generarMesa, repartoClasico } from '../../../src/sobres/generador';

const core = (
  JSON.parse(readFileSync(fileURLToPath(new URL('../../../../../data/core-real.json', import.meta.url)), 'utf-8')) as {
    jugadores: Jugador[];
  }
).jugadores;

const salida: Record<string, number[][]> = {};
for (const n of [4, 8]) {
  for (let i = 0; i < 50; i++) {
    salida[`${n}|regresion-${i}`] = generarMesa(core, n, semillaDesdeTexto(`regresion-${i}`), PARAMETROS_V6_2, repartoClasico(PARAMETROS_V6_2)).map((s) => [
      s.ronda,
      s.asientoOrigen,
      ...s.cartas,
    ]);
  }
}
writeFileSync(fileURLToPath(new URL('./regresion-e9aca5d.json', import.meta.url)), JSON.stringify(salida) + '\n');
