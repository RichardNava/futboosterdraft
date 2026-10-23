/**
 * Renombrado «special» → «virtud» (spec 005, T004; SC-001, FR-002): ningún fichero del producto ni de su
 * documentación vigente usa el término antiguo. Se busca el término inglés: la palabra española «especial»
 * (p. ej. la revelación especial de las cartas Legendario y GOAT) no cuenta.
 *
 * Excepciones, que por su naturaleza tienen que nombrarlo:
 * - las migraciones ya aplicadas (`0000_base.sql` y sus instantáneas) y la `0010`, que renombra la columna;
 * - los documentos de la spec 005, que describen el propio renombrado;
 * - la licencia de terceros de las fuentes;
 * - este fichero, `graphify-out/` y `node_modules/`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));
const RAICES = ['apps', 'packages', 'tools', 'data', 'docs', 'specs', 'README.md', 'CLAUDE.md'];
const CARPETAS_IGNORADAS = new Set(['node_modules', 'graphify-out', 'dist', '.turbo', 'test-results', 'playwright-report']);
const BINARIOS = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|mp3|ogg|wav|zip)$/i;

const EXCEPCIONES: readonly RegExp[] = [
  /^apps\/server\/drizzle\/0000_base\.sql$/,
  /^apps\/server\/drizzle\/meta\/000\d_snapshot\.json$/,
  /^apps\/server\/drizzle\/0010_virtudes_defectos\.sql$/,
  /^specs\/005-virtudes-defectos\//,
  /^apps\/web\/public\/fuentes\/LICENCIA$/,
  /^packages\/domain\/tests\/sinSpecials\.test\.ts$/,
];

function* ficheros(ruta: string): Generator<string> {
  const st = statSync(ruta, { throwIfNoEntry: false });
  if (!st) return;
  if (st.isFile()) {
    yield ruta;
    return;
  }
  for (const entrada of readdirSync(ruta, { withFileTypes: true })) {
    if (entrada.isDirectory() && CARPETAS_IGNORADAS.has(entrada.name)) continue;
    yield* ficheros(join(ruta, entrada.name));
  }
}

describe('sin «special» en el producto (SC-001)', () => {
  it('ningún fichero fuera de las excepciones contiene el término', () => {
    const encontrados: string[] = [];
    for (const raiz of RAICES) {
      for (const f of ficheros(join(RAIZ, raiz))) {
        const rel = relative(RAIZ, f).split(sep).join('/');
        if (BINARIOS.test(rel) || EXCEPCIONES.some((e) => e.test(rel))) continue;
        const lineas = readFileSync(f, 'utf-8').split('\n');
        lineas.forEach((l, i) => {
          if (/(?<!e)special/i.test(l)) encontrados.push(`${rel}:${i + 1}: ${l.trim().slice(0, 100)}`);
        });
      }
    }
    expect(encontrados).toEqual([]);
  }, 60_000);
});
