import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Jugador } from '../../src/catalogo/tipos';
import { PARAMETROS_V1 } from '../../src/parametros/index';
import { semillaDesdeTexto } from '../../src/rng/xoshiro';
import { ErrorPoolInsuficiente, generarMesa, generarSobre } from '../../src/sobres/generador';
import { Rng } from '../../src/rng/xoshiro';

const core = (
  JSON.parse(readFileSync(fileURLToPath(new URL('../../../../data/core.json', import.meta.url)), 'utf-8')) as {
    jugadores: Jugador[];
  }
).jugadores;
const porId = new Map(core.map((j) => [j.id, j]));

function composicion(cartas: number[]) {
  const dem: Record<string, number> = { POR: 0, DEF: 0, MED: 0, DEL: 0 };
  const niv: Record<string, number> = { Superclase: 0, Epico: 0, Legendario: 0, GOAT: 0 };
  for (const id of cartas) {
    const j = porId.get(id)!;
    dem[j.demarcacion]! += 1;
    niv[j.nivel]! += 1;
  }
  return { dem, niv };
}

describe('generarMesa (FR-011, FR-014)', () => {
  it('cada sobre: 1 "POR o DEF", 2 DEF, 3 MED, 2 DEL; 4 Superclase, 2 Épico, 1 Legendario y 1 alta', () => {
    fc.assert(
      fc.property(fc.integer({ min: 4, max: 8 }), fc.string({ minLength: 1, maxLength: 12 }), (n, texto) => {
        const sobres = generarMesa(core, n, semillaDesdeTexto(texto), PARAMETROS_V1);
        expect(sobres).toHaveLength(3 * n);
        for (const sobre of sobres) {
          expect(sobre.cartas).toHaveLength(8);
          const { dem, niv } = composicion(sobre.cartas);
          expect(dem.POR! + dem.DEF!).toBe(3);
          expect(dem.POR).toBeLessThanOrEqual(1);
          expect(dem.MED).toBe(3);
          expect(dem.DEL).toBe(2);
          expect(niv.Superclase).toBe(4);
          expect(niv.Epico).toBe(2);
          expect(niv.Legendario! + niv.GOAT!).toBe(2);
          expect(niv.GOAT).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 60 },
    );
  });

  it('ningún jugador se repite en la mesa (FR-011)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 4, max: 8 }), fc.string({ minLength: 1 }), (n, texto) => {
        const ids = generarMesa(core, n, semillaDesdeTexto(texto), PARAMETROS_V1).flatMap((s) => s.cartas);
        expect(new Set(ids).size).toBe(ids.length);
      }),
      { numRuns: 60 },
    );
  });

  it('cada asiento abre un sobre por ronda', () => {
    const sobres = generarMesa(core, 6, semillaDesdeTexto('asientos'), PARAMETROS_V1);
    for (const ronda of [1, 2, 3] as const) {
      expect(sobres.filter((s) => s.ronda === ronda).map((s) => s.asientoOrigen).sort()).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it('la misma semilla da exactamente la misma mesa', () => {
    const semilla = semillaDesdeTexto('reproducible');
    expect(generarMesa(core, 8, semilla, PARAMETROS_V1)).toEqual(generarMesa(core, 8, semilla, PARAMETROS_V1));
  });

  it('no falla en 10.000 mesas de 8 con el core.json real', { timeout: 120_000 }, () => {
    for (let i = 0; i < 10_000; i++) generarMesa(core, 8, semillaDesdeTexto(`mesa-${i}`), PARAMETROS_V1);
  });

  it('en 10.000 sobres: POR en el hueco "POR o DEF" 50 % ± 1 y GOAT en la alta 20 % ± 1 (SC-013)', () => {
    const rng = new Rng(semillaDesdeTexto('frecuencias'));
    let porteros = 0;
    let goats = 0;
    const n = 10_000;
    for (let i = 0; i < n; i++) {
      const plan = generarSobre(rng, PARAMETROS_V1);
      if (plan.huecoPorDef === 'POR') porteros++;
      if (plan.alta === 'GOAT') goats++;
    }
    expect(Math.abs(porteros / n - 0.5)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(goats / n - 0.2)).toBeLessThanOrEqual(0.01);
  });

  it('lanza ErrorPoolInsuficiente si el pool no alcanza', () => {
    expect(() => generarMesa(core.slice(0, 100), 8, semillaDesdeTexto('poco'), PARAMETROS_V1)).toThrow(
      ErrorPoolInsuficiente,
    );
  });
});
