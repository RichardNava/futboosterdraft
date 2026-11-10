import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Jugador } from '../../src/catalogo/tipos';
import { PARAMETROS_V3, PARAMETROS_V6_2, PARAMETROS_V6_3, repartoDe } from '../../src/parametros/index';
import { NIVELES_RAREZA } from '../../src/sobres/rareza';
import { semillaDesdeTexto } from '../../src/rng/xoshiro';
import { ErrorPoolInsuficiente, generarMesa, generarSobre, repartoClasico } from '../../src/sobres/generador';
import { Rng } from '../../src/rng/xoshiro';

const core = (
  JSON.parse(readFileSync(fileURLToPath(new URL('../../../../data/core-real.json', import.meta.url)), 'utf-8')) as {
    jugadores: Jugador[];
  }
).jugadores;
const porId = new Map(core.map((j) => [j.id, j]));

function composicion(cartas: number[]) {
  const dem: Record<string, number> = { POR: 0, DEF: 0, MED: 0, DEL: 0 };
  const niv: Record<string, number> = { Superclase: 0, Crack: 0, Legendario: 0, GOAT: 0 };
  for (const id of cartas) {
    const j = porId.get(id)!;
    dem[j.demarcacion]! += 1;
    niv[j.nivel]! += 1;
  }
  return { dem, niv };
}

describe('generarMesa (FR-011, FR-014)', () => {
  it('cada sobre: 1 "POR o DEF", 2 DEF, 3 MED, 2 DEL; 4 Superclase, 2 Crack, 1 Legendario y 1 alta', () => {
    fc.assert(
      fc.property(fc.integer({ min: 4, max: 8 }), fc.string({ minLength: 1, maxLength: 12 }), (n, texto) => {
        const sobres = generarMesa(core, n, semillaDesdeTexto(texto), PARAMETROS_V3, repartoClasico(PARAMETROS_V3));
        expect(sobres).toHaveLength(3 * n);
        for (const sobre of sobres) {
          expect(sobre.cartas).toHaveLength(8);
          const { dem, niv } = composicion(sobre.cartas);
          expect(dem.POR! + dem.DEF!).toBe(3);
          expect(dem.POR).toBeLessThanOrEqual(1);
          expect(dem.MED).toBe(3);
          expect(dem.DEL).toBe(2);
          expect(niv.Superclase).toBe(4);
          expect(niv.Crack).toBe(2);
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
        const ids = generarMesa(core, n, semillaDesdeTexto(texto), PARAMETROS_V3, repartoClasico(PARAMETROS_V3)).flatMap((s) => s.cartas);
        expect(new Set(ids).size).toBe(ids.length);
      }),
      { numRuns: 60 },
    );
  });

  it('cada asiento abre un sobre por ronda', () => {
    const sobres = generarMesa(core, 6, semillaDesdeTexto('asientos'), PARAMETROS_V3, repartoClasico(PARAMETROS_V3));
    for (const ronda of [1, 2, 3] as const) {
      expect(sobres.filter((s) => s.ronda === ronda).map((s) => s.asientoOrigen).sort()).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it('la misma semilla da exactamente la misma mesa', () => {
    const semilla = semillaDesdeTexto('reproducible');
    expect(generarMesa(core, 8, semilla, PARAMETROS_V3, repartoClasico(PARAMETROS_V3))).toEqual(generarMesa(core, 8, semilla, PARAMETROS_V3, repartoClasico(PARAMETROS_V3)));
  });

  it('no falla en 10.000 mesas de 8 con el core-real.json', { timeout: 120_000 }, () => {
    for (let i = 0; i < 10_000; i++) generarMesa(core, 8, semillaDesdeTexto(`mesa-${i}`), PARAMETROS_V3, repartoClasico(PARAMETROS_V3));
  });

  // Spec 012, ronda 2: con la 6.2.0 sale portero en el 70 % de los huecos; si el pool se queda sin porteros, va un DEF.
  it('con la 6.2.0, si el pool se queda sin porteros, el hueco "POR o DEF" es un defensa', () => {
    const pocos = new Set(core.filter((j) => j.demarcacion === 'POR').slice(0, 4).map((j) => j.id));
    const pool = core.filter((j) => j.demarcacion !== 'POR' || pocos.has(j.id));
    for (let i = 0; i < 300; i++) {
      const mesa = generarMesa(pool, 8, semillaDesdeTexto(`sin-porteros-${i}`), PARAMETROS_V6_2, repartoClasico(PARAMETROS_V6_2));
      expect(mesa).toHaveLength(24);
      expect(mesa.every((s) => s.cartas.length === 8)).toBe(true);
    }
  });

  it('con la 6.2.0, el hueco "POR o DEF" es portero el 70 % ± 1 de las veces', () => {
    const rng = new Rng(semillaDesdeTexto('frecuencias-6.2'));
    const n = 10_000;
    let porteros = 0;
    for (let i = 0; i < n; i++) if (generarSobre(rng, PARAMETROS_V6_2, repartoClasico(PARAMETROS_V6_2)).huecoPorDef === 'POR') porteros++;
    expect(Math.abs(porteros / n - 0.7)).toBeLessThanOrEqual(0.01);
  });

  it('en 10.000 sobres: POR en el hueco "POR o DEF" 50 % ± 1 y GOAT en la alta 20 % ± 1 (SC-013)', () => {
    const rng = new Rng(semillaDesdeTexto('frecuencias'));
    let porteros = 0;
    let goats = 0;
    const n = 10_000;
    for (let i = 0; i < n; i++) {
      const plan = generarSobre(rng, PARAMETROS_V3, repartoClasico(PARAMETROS_V3));
      if (plan.huecoPorDef === 'POR') porteros++;
      if (plan.altas[0] === 'GOAT') goats++;
    }
    expect(Math.abs(porteros / n - 0.5)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(goats / n - 0.2)).toBeLessThanOrEqual(0.01);
  });

  it('lanza ErrorPoolInsuficiente si el pool no alcanza', () => {
    expect(() => generarMesa(core.slice(0, 100), 8, semillaDesdeTexto('poco'), PARAMETROS_V3, repartoClasico(PARAMETROS_V3))).toThrow(
      ErrorPoolInsuficiente,
    );
  });
});

// ---------- Spec 013: nivel de rareza del draft (contracts/generador.md) ----------

const altas = (cartas: number[]) => cartas.filter((id) => ['Legendario', 'GOAT'].includes(porId.get(id)!.nivel));

describe('generarMesa por nivel de rareza (spec 013)', () => {
  it('G4: con el reparto de antes, la salida es idéntica a la de e9aca5d (SC-005)', () => {
    const fixture = JSON.parse(
      readFileSync(fileURLToPath(new URL('./fixtures/regresion-e9aca5d.json', import.meta.url)), 'utf-8'),
    ) as Record<string, number[][]>;
    const reparto = { superclase: 4, crack: 2, legendario: 1, altas: 1, probGoatEnAlta: 0.2 };
    expect(Object.keys(fixture)).toHaveLength(100);
    for (const [clave, esperado] of Object.entries(fixture)) {
      const [n, texto] = clave.split('|') as [string, string];
      const mesa = generarMesa(core, Number(n), semillaDesdeTexto(texto), PARAMETROS_V6_2, reparto);
      expect(mesa.map((s) => [s.ronda, s.asientoOrigen, ...s.cartas]), clave).toEqual(esperado);
    }
  });

  for (const nivel of NIVELES_RAREZA) {
    it(`G1/G2/G3 ${nivel}: cupos de demarcación, 8 cartas, sin repetidos y determinista`, () => {
      const reparto = repartoDe(PARAMETROS_V6_3, nivel);
      for (const n of [4, 8]) {
        for (let i = 0; i < 20; i++) {
          const semilla = semillaDesdeTexto(`${nivel}-${n}-${i}`);
          const mesa = generarMesa(core, n, semilla, PARAMETROS_V6_3, reparto);
          expect(mesa).toHaveLength(3 * n);
          const ids = mesa.flatMap((s) => s.cartas);
          expect(new Set(ids).size).toBe(ids.length);
          for (const sobre of mesa) {
            expect(sobre.cartas).toHaveLength(8);
            const { dem, niv } = composicion(sobre.cartas);
            expect(dem.POR! + dem.DEF!).toBe(3);
            expect(dem.POR).toBeLessThanOrEqual(1);
            expect([dem.MED, dem.DEL]).toEqual([3, 2]);
            // Sin sustituciones (todos menos Rico con Core), el reparto exacto; en Rico, las que faltan son Crack.
            expect(niv.Superclase).toBe(reparto.superclase);
            expect(niv.Legendario! + niv.GOAT! + niv.Crack!).toBe(reparto.crack + reparto.legendario + reparto.altas);
            if (nivel !== 'rico') expect(niv.Crack).toBe(reparto.crack);
          }
          if (i === 0) expect(generarMesa(core, n, semilla, PARAMETROS_V6_3, reparto)).toEqual(mesa);
        }
      }
    });
  }

  it('G5: con 4 GOAT en el pool, los huecos GOAT pasan a Legendario (y luego a Crack), nunca a Superclase', () => {
    const goats = core.filter((j) => j.nivel === 'GOAT').slice(0, 4).map((j) => j.id);
    const pocosGoat = core.filter((j) => j.nivel !== 'GOAT' || goats.includes(j.id));
    const reparto = repartoDe(PARAMETROS_V6_3, 'abundante');
    for (let i = 0; i < 20; i++) {
      const mesa = generarMesa(pocosGoat, 8, semillaDesdeTexto(`g5-${i}`), PARAMETROS_V6_3, reparto);
      for (const sobre of mesa) {
        const { niv } = composicion(sobre.cartas);
        expect(niv.Superclase).toBe(reparto.superclase);
        expect(niv.Legendario! + niv.GOAT! + niv.Crack!).toBe(reparto.crack + reparto.legendario + reparto.altas);
      }
      // 72 altas pedidas y 54 + 4 en el pool: todas salen y las 14 que faltan son Crack.
      expect(altas(mesa.flatMap((s) => s.cartas))).toHaveLength(58);
    }
  });

  it('G6: Rico con Core en una mesa de 8 ⇒ las 90 L + G una vez y 6 Crack de sustitución; con 96 L + G, ninguna', () => {
    const reparto = repartoDe(PARAMETROS_V6_3, 'rico');
    const altasCore = core.filter((j) => j.nivel === 'Legendario' || j.nivel === 'GOAT').map((j) => j.id);
    expect(altasCore).toHaveLength(90);
    for (let i = 0; i < 30; i++) {
      const ids = generarMesa(core, 8, semillaDesdeTexto(`rico-${i}`), PARAMETROS_V6_3, reparto).flatMap((s) => s.cartas);
      expect(altas(ids).sort((a, b) => a - b)).toEqual([...altasCore].sort((a, b) => a - b));
      expect(ids.filter((id) => porId.get(id)!.nivel === 'Crack')).toHaveLength(8 * 3 * reparto.crack + 6);
    }
    // Seis altas más en el pool (copias de Legendario de campo con otro id).
    const extra = core
      .filter((j) => j.nivel === 'Legendario' && j.demarcacion !== 'POR')
      .slice(0, 6)
      .map((j, k) => ({ ...j, id: 10_000 + k }));
    for (const j of extra) porId.set(j.id, j);
    for (let i = 0; i < 30; i++) {
      const ids = generarMesa([...core, ...extra], 8, semillaDesdeTexto(`rico96-${i}`), PARAMETROS_V6_3, reparto).flatMap((s) => s.cartas);
      expect(altas(ids)).toHaveLength(96);
    }
  });

  it('G7: si ni degradando las altas se completa un sobre ⇒ ErrorPoolInsuficiente', () => {
    expect(() =>
      generarMesa(core.slice(0, 100), 8, semillaDesdeTexto('g7'), PARAMETROS_V6_3, repartoDe(PARAMETROS_V6_3, 'rico')),
    ).toThrow(ErrorPoolInsuficiente);
  });
});
