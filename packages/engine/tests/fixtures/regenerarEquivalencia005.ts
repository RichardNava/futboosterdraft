/**
 * Spec 012 (T039): regenera en `equivalencia-005.json` solo los partidos de referencia que cambian al resolver las
 * lesiones y expulsiones al terminar el paso (research R2), y anota cuáles. El resto sigue siendo la línea base.
 *
 * Uso: `pnpm --filter @fbd/engine exec tsx tests/fixtures/regenerarEquivalencia005.ts`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { jugarEquivalencia005 } from './equiposEquivalencia005';

const ruta = fileURLToPath(new URL('./equivalencia-005.json', import.meta.url));
const ref = JSON.parse(readFileSync(ruta, 'utf-8')) as { partidos: { i: number; eventos: unknown }[]; regenerados?: Record<string, number[]> };
const cambiados: number[] = [];
for (const p of ref.partidos) {
  const nuevo = jugarEquivalencia005(p.i);
  if (JSON.stringify(nuevo) !== JSON.stringify(p.eventos)) {
    p.eventos = nuevo;
    cambiados.push(p.i);
  }
}
ref.regenerados = { ...ref.regenerados, 'spec-012': cambiados };
writeFileSync(ruta, `${JSON.stringify(ref)}\n`);
console.log(`Regenerados: ${cambiados.join(', ') || 'ninguno'}`);
