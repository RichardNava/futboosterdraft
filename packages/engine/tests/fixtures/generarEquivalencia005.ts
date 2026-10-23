/**
 * Script de una sola ejecución (T001): congela en `equivalencia-005.json` la secuencia de eventos de los 20
 * partidos de la línea base de la spec 005, generada en el commit `5007f5a` con parámetros 3.0.0.
 *
 * Uso: `pnpm --filter @fbd/engine exec tsx tests/fixtures/generarEquivalencia005.ts`. No se vuelve a ejecutar
 * después de cambiar el motor: la fixture es la referencia de SC-003.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { jugarEquivalencia005, SEMILLAS_EQUIVALENCIA_005 } from './equiposEquivalencia005';

const partidos = SEMILLAS_EQUIVALENCIA_005.map((i) => ({ i, eventos: jugarEquivalencia005(i) }));
const ruta = fileURLToPath(new URL('./equivalencia-005.json', import.meta.url));
writeFileSync(ruta, `${JSON.stringify({ base: '5007f5a', version: '3.0.0', partidos })}\n`);
console.log(`Escrita ${ruta}: ${partidos.length} partidos, ${partidos.reduce((n, p) => n + p.eventos.length, 0)} eventos.`);
