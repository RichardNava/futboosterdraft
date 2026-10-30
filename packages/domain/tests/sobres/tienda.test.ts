import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Demarcacion, Jugador, Nivel } from '../../src/catalogo/tipos';
import { PARAMETROS_V3 } from '../../src/parametros/index';
import { semillaDesdeTexto } from '../../src/rng/xoshiro';
import { ErrorPoolInsuficiente } from '../../src/sobres/generador';
import { generarSobreTienda } from '../../src/sobres/tienda';

const prueba = (
  JSON.parse(readFileSync(fileURLToPath(new URL('../../../../data/cartas-prueba.json', import.meta.url)), 'utf-8')) as { jugadores: Jugador[] }
).jugadores;
const porId = new Map(prueba.map((j) => [j.id, j]));
const cuenta = (ids: number[], campo: 'demarcacion' | 'nivel') =>
  ids.reduce<Record<string, number>>((r, id) => ({ ...r, [porId.get(id)![campo]]: (r[porId.get(id)![campo]] ?? 0) + 1 }), {});

describe('generarSobreTienda (R13; FR-029)', () => {
  it('con cartas de todo: 8 cartas distintas, de disponibles y con los cupos del draft', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 12 }), (texto) => {
        const ids = generarSobreTienda(prueba, semillaDesdeTexto(texto), PARAMETROS_V3);
        expect(ids).toHaveLength(8);
        expect(new Set(ids).size).toBe(8);
        expect(ids.every((id) => porId.has(id))).toBe(true);
        const dem = cuenta(ids, 'demarcacion');
        const niv = cuenta(ids, 'nivel');
        expect((dem.POR ?? 0) + (dem.DEF ?? 0)).toBe(3);
        expect(dem.MED).toBe(3);
        expect(dem.DEL).toBe(2);
        expect(niv.Superclase).toBe(4);
        expect(niv.Crack).toBe(2);
        expect((niv.Legendario ?? 0) + (niv.GOAT ?? 0)).toBe(2);
      }),
      { numRuns: 200 },
    );
  });

  it('misma semilla, mismas cartas', () => {
    const s = semillaDesdeTexto('compra-1');
    expect(generarSobreTienda(prueba, s, PARAMETROS_V3)).toEqual(generarSobreTienda(prueba, s, PARAMETROS_V3));
  });

  const carta = (id: number, demarcacion: Demarcacion, nivel: Nivel) => ({ id, demarcacion, nivel });

  it('sin Superclase de MED usa otro Superclase; sin Superclase, el nivel inferior no existe y usa el superior', () => {
    // Solo Cracks y un GOAT: las casillas Superclase se cubren con Crack (el superior más cercano).
    const pool = [
      ...Array.from({ length: 10 }, (_, i) => carta(i + 1, (['POR', 'DEF', 'MED', 'DEL'] as const)[i % 4]!, 'Crack')),
      carta(20, 'DEL', 'GOAT'),
    ];
    const ids = generarSobreTienda(pool, semillaDesdeTexto('x'), PARAMETROS_V3);
    expect(new Set(ids).size).toBe(8);
    const niveles = ids.map((id) => pool.find((c) => c.id === id)!.nivel);
    expect(niveles.filter((n) => n === 'Crack').length).toBeGreaterThanOrEqual(7);
  });

  it('sin la combinación pedida prefiere el mismo nivel en otra demarcación antes que bajar de nivel', () => {
    // Ningún MED Superclase, pero sí otros Superclase de sobra; y ningún Crack de ninguna demarcación salvo DEF.
    const pool = [
      ...Array.from({ length: 6 }, (_, i) => carta(100 + i, 'DEF', 'Superclase')),
      ...Array.from({ length: 6 }, (_, i) => carta(200 + i, 'DEL', 'Superclase')),
      ...Array.from({ length: 3 }, (_, i) => carta(300 + i, 'DEF', 'Crack')),
      ...Array.from({ length: 3 }, (_, i) => carta(400 + i, 'MED', 'Legendario')),
      carta(500, 'DEL', 'GOAT'),
    ];
    const ids = generarSobreTienda(pool, semillaDesdeTexto('y'), PARAMETROS_V3);
    const niveles = ids.map((id) => pool.find((c) => c.id === id)!.nivel);
    expect(niveles.filter((n) => n === 'Superclase')).toHaveLength(4);
    expect(niveles.filter((n) => n === 'Crack')).toHaveLength(2);
  });

  it('con menos de 8 cartas lanza ErrorPoolInsuficiente', () => {
    expect(() => generarSobreTienda(prueba.slice(0, 7), semillaDesdeTexto('z'), PARAMETROS_V3)).toThrow(ErrorPoolInsuficiente);
  });
});
