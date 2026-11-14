/**
 * Regenera en `equivalencia-005.json` los partidos de referencia que cambian con el motor y anota cuáles: spec 012
 * (T039, lesiones y expulsiones al terminar el paso) y spec 014 (T056, motor 7.0.0; las 3.x ya no se simulan).
 *
 * Uso: `pnpm --filter @fbd/engine exec tsx tests/fixtures/regenerarEquivalencia005.ts`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parametrosActuales } from '@fbd/domain';
import { jugarEquivalencia005 } from './equiposEquivalencia005';

const ruta = fileURLToPath(new URL('./equivalencia-005.json', import.meta.url));
const ref = JSON.parse(readFileSync(ruta, 'utf-8')) as { version: string; partidos: { i: number; eventos: unknown }[]; regenerados?: Record<string, number[]> };
const cambiados: number[] = [];
for (const p of ref.partidos) {
  const nuevo = jugarEquivalencia005(p.i);
  if (JSON.stringify(nuevo) !== JSON.stringify(p.eventos)) {
    p.eventos = nuevo;
    cambiados.push(p.i);
  }
}
ref.version = parametrosActuales().version;
ref.regenerados = { ...ref.regenerados, 'spec-014': cambiados };
writeFileSync(ruta, `${JSON.stringify(ref)}\n`);
console.log(`Regenerados: ${cambiados.join(', ') || 'ninguno'}`);
