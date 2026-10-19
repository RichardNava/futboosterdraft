/** Equipaciones v2 (spec 003, FR-045 a FR-047; research R24, data-model §4; T108). */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  chocan,
  colorDorsal,
  DISENOS_CAMISETA,
  desdeV1,
  equipacionEnPartido,
  equipacionesAleatorias,
  firmaPatron,
  PALETA,
  parecido,
  patronDiseno,
  pesosSuperficie,
  relacionContraste,
  UMBRAL_PARECIDO,
  validarEquipaciones,
  type Equipacion,
  type Equipaciones,
} from '../../src/equipo/equipaciones';
import { PARAMETROS_V3 } from '../../src/parametros/index';
import { semillaDesdeTexto } from '../../src/rng/xoshiro';

const p = PARAMETROS_V3;
const lisa = (...colores: string[]) => ({ diseno: 'lisa', colores }) as Equipacion;

const color = fc.constantFrom(...PALETA);
const equipacion = fc.record({
  diseno: fc.constantFrom(...DISENOS_CAMISETA),
  colores: fc.array(color, { minLength: 1, maxLength: 3 }),
}) as fc.Arbitrary<Equipacion>;

describe('equipaciones v2 (T108)', () => {
  it('desdeV1 convierte v1 en lisas con [principal, secundario] y deja igual una v2', () => {
    const v1 = { primera: { principal: '#d01010', secundario: '#ffffff' }, segunda: { principal: '#1030d0', secundario: '#ffffff' } };
    const v2 = desdeV1(v1)!;
    expect(v2).toEqual({ primera: lisa('#d01010', '#ffffff'), segunda: lisa('#1030d0', '#ffffff') });
    expect(desdeV1(v2)).toEqual(v2);
    expect(desdeV1(null)).toBeNull();
    expect(desdeV1({ primera: 1 })).toBeNull();
  });

  it('pesosSuperficie sigue la tabla de R24 y suma a c1 los colores que faltan', () => {
    expect(pesosSuperficie({ diseno: 'lisa', colores: ['#d01010', '#ffffff'] })).toEqual([0.9, 0.1]);
    expect(pesosSuperficie({ diseno: 'rayas', colores: ['#d01010', '#ffffff', '#202020'] })).toEqual([0.5, 0.4, 0.1]);
    expect(pesosSuperficie({ diseno: 'franjas', colores: ['#d01010', '#ffffff', '#202020'] })).toEqual([0.5, 0.4, 0.1]);
    expect(pesosSuperficie({ diseno: 'banda', colores: ['#d01010', '#ffffff', '#202020'] })).toEqual([0.75, 0.2, 0.05]);
    expect(pesosSuperficie({ diseno: 'mitades', colores: ['#d01010', '#ffffff', '#202020'] })).toEqual([0.5, 0.45, 0.05]);
    const [a, b] = pesosSuperficie({ diseno: 'rayas', colores: ['#d01010', '#ffffff'] });
    expect(a).toBeCloseTo(0.6);
    expect(b).toBeCloseTo(0.4);
    expect(pesosSuperficie({ diseno: 'banda', colores: ['#d01010'] })[0]).toBeCloseTo(1);
  });

  it('parecido está en [0, 1] y es simétrico; chocan desde 0,45', () => {
    fc.assert(
      fc.property(equipacion, equipacion, (a, b) => {
        const x = parecido(a, b, p);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
        expect(parecido(b, a, p)).toBeCloseTo(x, 10);
        // Lejos del umbral (los pesos suman con coma flotante), chocan ⇔ parecido ≥ 0,45.
        if (Math.abs(x - UMBRAL_PARECIDO) > 1e-6) expect(chocan(a, b, p)).toBe(x >= UMBRAL_PARECIDO);
      }),
    );
    expect(chocan(lisa('#d01010', '#ffffff'), lisa('#c81818', '#000000'), p)).toBe(true);
    // Rayas rojas y blancas frente a lisa roja: comparten la mitad de la superficie.
    expect(chocan({ diseno: 'rayas', colores: ['#d01010', '#ffffff'] }, lisa('#d01010', '#202020'), p)).toBe(true);
    expect(chocan(lisa('#d01010', '#ffffff'), lisa('#1030d0', '#f0c000'), p)).toBe(false);
  });

  it('el visitante usa la segunda si la primera choca; si chocan las dos, una lisa con el color más alejado', () => {
    const local: Equipaciones = { primera: lisa('#d01010', '#ffffff'), segunda: lisa('#ffffff', '#d01010') };
    const parecida: Equipaciones = { primera: lisa('#c81818', '#000000'), segunda: lisa('#1030d0', '#ffffff') };
    const distinta: Equipaciones = { primera: lisa('#10a040', '#ffffff'), segunda: lisa('#202020', '#ffffff') };
    expect(equipacionEnPartido(local, parecida, p)).toEqual({ local: local.primera, visitante: parecida.segunda });
    expect(equipacionEnPartido(local, distinta, p)).toEqual({ local: local.primera, visitante: distinta.primera });
    const rojas: Equipaciones = { primera: lisa('#c81818'), segunda: lisa('#d01010', '#c81818') };
    const r = equipacionEnPartido(local, rojas, p);
    expect(r.visitante.diseno).toBe('lisa');
    expect(chocan(local.primera, r.visitante, p)).toBe(false);
    expect(equipacionEnPartido(local, rojas, p)).toEqual(r);
  });

  it('validarEquipaciones: COLOR_INVALIDO, DISENO_INVALIDO, NUM_COLORES_INVALIDO y EQUIPACIONES_PARECIDAS', () => {
    const base: Equipaciones = { primera: lisa('#d01010', '#ffffff'), segunda: lisa('#1030d0', '#ffffff') };
    expect(validarEquipaciones(base, p)).toEqual([]);
    const codigos = (e: unknown) => validarEquipaciones(e as Equipaciones, p).map((x) => x.codigo);
    expect(codigos({ ...base, primera: lisa('rojo') })).toContain('COLOR_INVALIDO');
    expect(codigos({ ...base, primera: { diseno: 'cuadros', colores: ['#d01010'] } })).toContain('DISENO_INVALIDO');
    expect(codigos({ ...base, primera: { diseno: 'lisa', colores: [] } })).toContain('NUM_COLORES_INVALIDO');
    expect(codigos({ ...base, primera: lisa('#d01010', '#ffffff', '#202020', '#1030d0') })).toContain('NUM_COLORES_INVALIDO');
    expect(codigos({ ...base, segunda: base.primera })).toContain('EQUIPACIONES_PARECIDAS');
  });

  it('las aleatorias son lisas, válidas y con dorsal legible (≥ 4,5:1)', () => {
    for (let i = 0; i < 100; i++) {
      const e = equipacionesAleatorias(semillaDesdeTexto(`eq${i}`), p);
      expect(e.primera.diseno).toBe('lisa');
      expect(validarEquipaciones(e, p)).toEqual([]);
      for (const k of [e.primera, e.segunda]) expect(relacionContraste(k.colores[0], colorDorsal(k))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('patronDiseno devuelve regiones para los 5 diseños, con el principal de fondo', () => {
    for (const diseno of DISENOS_CAMISETA) {
      const e: Equipacion = { diseno, colores: ['#d01010', '#ffffff', '#202020'] };
      const regiones = patronDiseno(e);
      expect(regiones.length).toBeGreaterThanOrEqual(2);
      expect(regiones[0]!.color).toBe('#d01010');
      for (const r of regiones) {
        for (const v of r.puntos.flat()) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
      expect(firmaPatron(e)).toContain(`${diseno}:`);
    }
    expect(firmaPatron({ diseno: 'rayas', colores: ['#d01010', '#ffffff'] })).not.toBe(firmaPatron({ diseno: 'franjas', colores: ['#d01010', '#ffffff'] }));
  });
});
