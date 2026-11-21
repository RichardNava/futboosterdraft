/**
 * Los buscadores solo ven la portada (spec 017, T100, FR-052, SC-010), con la regla de coincidencia más larga.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const robots = readFileSync(fileURLToPath(new URL('../../../web/public/robots.txt', import.meta.url)), 'utf8');

const reglas = robots.split(/\r?\n/).flatMap((linea) => {
  const m = /^(Allow|Disallow):\s*(\S+)$/.exec(linea.trim());
  return m ? [{ permite: m[1] === 'Allow', patron: m[2]! }] : [];
});

/** RFC 9309: gana la regla más larga; a igual longitud, `Allow`. */
function permitida(ruta: string): boolean {
  const coinciden = reglas.filter(({ patron }) => (patron.endsWith('$') ? ruta === patron.slice(0, -1) : ruta.startsWith(patron)));
  coinciden.sort((a, b) => b.patron.length - a.patron.length || Number(b.permite) - Number(a.permite));
  return coinciden[0]?.permite ?? true;
}

describe('robots.txt', () => {
  it('SEG-023: los buscadores pueden leer la portada y sus recursos', () => {
    for (const ruta of ['/', '/assets/index.js', '/fuentes/titulo.woff2', '/marca/logo.svg']) expect(permitida(ruta), ruta).toBe(true);
  });

  it.each(['/api/', '/api/partidas', '/ws', '/metrics', '/healthz', '/admin', '/partidas/x/draft', '/?restablecer=x', '/ruta-futura'])(
    'SEG-023: un buscador rastrea %s',
    (ruta) => {
      expect(permitida(ruta)).toBe(false);
    },
  );
});
