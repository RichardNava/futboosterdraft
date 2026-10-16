import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cumpleEscenario, type Escenario } from '../src/escenarios';
import { generarCore } from '../src/generarCore';

const carpeta = resolve(dirname(fileURLToPath(import.meta.url)), '../escenarios');
const escenarios = readdirSync(carpeta)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(resolve(carpeta, f), 'utf-8')) as Escenario);

describe('escenarios reproducibles (T118)', () => {
  const core = generarCore();

  it('están los cinco escenarios del quickstart', () => {
    expect(escenarios.map((e) => e.nombre).sort()).toEqual(['empate-eliminatoria', 'lesion-grave', 'lesion-larga', 'roja', 'tres-amarillas']);
  });

  it.each(escenarios.map((e) => [e.nombre, e] as const))('"%s" sigue provocando su evento', (_n, e) => {
    expect(cumpleEscenario(e, core), 'si cambian los parámetros del motor, regenera con `pnpm --filter @fbd/fixtures generar-escenarios`').toBe(true);
  });
});
