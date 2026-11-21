/**
 * Dependencias (spec 017, T030, FR-038): sin las versiones vulnerables y sin herramientas de pruebas en producción.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url));
const lockfile = readFileSync(`${RAIZ}pnpm-lock.yaml`, 'utf8');

/** Versiones de un paquete en la sección `packages:` del lockfile. */
const versiones = (nombre: string) =>
  [...lockfile.matchAll(new RegExp(`^  '?${nombre.replace('/', '\\/')}@(\\d+)\\.(\\d+)\\.(\\d+)[^:]*:$`, 'gm'))].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const);

const alMenos = (v: readonly [number, number, number], m: readonly [number, number, number]) =>
  v[0] !== m[0] ? v[0] > m[0] : v[1] !== m[1] ? v[1] > m[1] : v[2] >= m[2];

/** Nombres de todos los paquetes de producción del servidor. */
function paquetesProduccion(): Set<string> {
  const salida = execSync('pnpm --filter @fbd/server list --prod --depth Infinity --json', { cwd: RAIZ, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const nombres = new Set<string>();
  const recorrer = (deps: Record<string, { dependencies?: Record<string, never> }> = {}) => {
    for (const [nombre, d] of Object.entries(deps)) {
      if (nombres.has(nombre)) continue;
      nombres.add(nombre);
      recorrer(d.dependencies);
    }
  };
  for (const p of JSON.parse(salida) as { dependencies?: Record<string, never> }[]) recorrer(p.dependencies);
  return nombres;
}

describe('dependencias', () => {
  it.each([
    ['nodemailer', [10, 0, 6]],
    ['@fastify/static', [10, 1, 1]],
    ['zod', [4, 6, 6]],
  ] as const)('SEG-008: desplegar %s con una versión vulnerable', (nombre, minima) => {
    const v = versiones(nombre);
    expect(v.length).toBeGreaterThan(0);
    for (const x of v) expect(alMenos(x, minima), `${nombre}@${x.join('.')}`).toBe(true);
  });

  it('SEG-009: incluir herramientas de pruebas en las dependencias de producción', () => {
    const produccion = paquetesProduccion();
    expect(produccion.has('better-auth')).toBe(true);
    for (const n of ['vitest', 'vite', 'tinypool', '@vitest/runner', 'tsx', 'rollup']) expect(produccion.has(n), n).toBe(false);
  });

  it.each([
    ['undici', [6, 29, 1]],
    ['@fastify/busboy', [3, 2, 1]],
    ['vitest', [3, 2, 6]],
  ] as const)('SEG-031: usar %s con una versión vulnerable en desarrollo', (nombre, minima) => {
    for (const x of versiones(nombre)) expect(alMenos(x, minima), `${nombre}@${x.join('.')}`).toBe(true);
  });
});
