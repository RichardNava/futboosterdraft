import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { asignarDorsal, asignarDorsalesIniciales, completarDorsales, DORSAL_FIJO, ErrorDorsales, sinDorsal, type Dorsales } from '../../src/equipo/dorsales';
import {
  equipacionEnPartido,
  equipacionesAleatorias,
  relacionContraste,
  validarEquipaciones,
} from '../../src/equipo/equipaciones';
import { FORMACIONES, CASILLA_CENTRAL } from '../../src/equipo/formaciones';
import { PARAMETROS_V2 } from '../../src/parametros/index';
import { semillaDesdeTexto } from '../../src/rng/xoshiro';
import { plantillaEquilibrada } from './ayudas';

const semilla = semillaDesdeTexto('dorsales');
const plantilla = plantillaEquilibrada();
const ids = plantilla.map((j) => j.id);

/** Coloca 11 jugadores cualesquiera (en orden) en las casillas de una formación. */
function titularesEn(formacionId: keyof typeof FORMACIONES) {
  return FORMACIONES[formacionId].casillas.map((c, i) => ({ casillaId: c.id, jugadorId: ids[i]! }));
}

describe('dorsales (FR-035 a FR-038, T129)', () => {
  it('asigna los dorsales fijos por casilla (incluidos carrileros CD → 2 y CI → 3)', () => {
    expect(DORSAL_FIJO).toMatchObject({ POR: 1, LD: 2, CD: 2, LI: 3, CI: 3, DCD: 4, DCI: 5, MD: 6, MC: 8, MII: 8, MID: 8, MCO: 10, EI: 7, DC: 9, ED: 11 });
    const titulares = titularesEn('4-3-3');
    const d = asignarDorsalesIniciales(ids, titulares, '4-3-3', semilla);
    const de = (casillaId: string) => d[titulares.find((t) => t.casillaId === casillaId)!.jugadorId];
    expect([de('POR'), de('LD'), de('LI'), de('DCD'), de('DCI'), de('MD'), de('EI'), de('DC'), de('ED')]).toEqual([1, 2, 3, 4, 5, 6, 7, 9, 11]);
  });

  it('si dos casillas comparten dorsal, lo recibe la primera en el orden de la formación', () => {
    const titulares = titularesEn('4-3-3'); // MID va antes que MII (derecha a izquierda)
    const d = asignarDorsalesIniciales(ids, titulares, '4-3-3', semilla);
    const de = (casillaId: string) => d[titulares.find((t) => t.casillaId === casillaId)!.jugadorId];
    expect(de('MID')).toBe(8);
    expect(de('MII')).not.toBe(8);
    const t442 = titularesEn('4-4-2');
    const d442 = asignarDorsalesIniciales(ids, t442, '4-4-2', semilla);
    expect(d442[t442.find((t) => t.casillaId === 'MC-1')!.jugadorId]).toBe(8);
    expect(d442[t442.find((t) => t.casillaId === 'MC-2')!.jugadorId]).not.toBe(8);
  });

  it('carrileros, central del medio, SD y suplentes', () => {
    const titulares = titularesEn('5-3-2');
    const d = asignarDorsalesIniciales(ids, titulares, '5-3-2', semilla);
    const de = (casillaId: string) => d[titulares.find((t) => t.casillaId === casillaId)!.jugadorId];
    expect(de('CD')).toBe(2);
    expect(de('CI')).toBe(3);
    expect([2, 3, 4, 5, 6, 8, 9, 1]).not.toContain(de(CASILLA_CENTRAL));
    expect(de('SD')).not.toBe(9);
  });

  it('la plantilla recibe exactamente los números del 1 al 24, y la misma semilla da la misma asignación', () => {
    for (const f of ['3-4-3', '4-3-3', '5-3-2'] as const) {
      const titulares = titularesEn(f);
      const d = asignarDorsalesIniciales(ids, titulares, f, semilla);
      expect(Object.keys(d)).toHaveLength(24);
      expect(Object.values(d).sort((a, b) => a - b)).toEqual(Array.from({ length: 24 }, (_, k) => k + 1));
      expect(asignarDorsalesIniciales(ids, titulares, f, semilla)).toEqual(d);
    }
  });

  it('los fijos se asignan por la posición efectiva del titular (colocación libre)', () => {
    const titulares = titularesEn('4-4-2');
    const mc = titulares.find((t) => t.casillaId === 'MC-1')!.jugadorId;
    // El MC-1 colocado como delantero centro lleva el 9; el DC de su casilla, el 9 si estuviera libre.
    const d = asignarDorsalesIniciales(ids, titulares, '4-4-2', semilla, (id) => (id === mc ? 'MCO' : undefined));
    expect(d[mc]).toBe(10);
  });

  const codigo = (f: () => unknown) => {
    try {
      f();
      return null;
    } catch (e) {
      return (e as ErrorDorsales).codigo;
    }
  };

  it('asignarDorsal: fuera de 1–99 → DORSAL_FUERA_DE_RANGO; quien llevaba el número se queda sin dorsal', () => {
    const d = asignarDorsalesIniciales(ids, titularesEn('4-3-3'), '4-3-3', semilla);
    const [x, y] = ids;
    expect(codigo(() => asignarDorsal(d, x!, 100))).toBe('DORSAL_FUERA_DE_RANGO');
    expect(codigo(() => asignarDorsal(d, x!, 0))).toBe('DORSAL_FUERA_DE_RANGO');
    expect(codigo(() => asignarDorsal(d, x!, 2.5))).toBe('DORSAL_FUERA_DE_RANGO');
    expect(codigo(() => asignarDorsal(d, 999_999, 5, ids))).toBe('JUGADOR_DESCONOCIDO');
    const nuevo = asignarDorsal(d, x!, d[y!]!);
    expect(nuevo[x!]).toBe(d[y!]);
    expect(nuevo[y!]).toBeUndefined();
    expect(sinDorsal(nuevo, ids)).toEqual([y]);
    // Un número libre no le quita el dorsal a nadie.
    expect(sinDorsal(asignarDorsal(d, x!, 77), ids)).toEqual([]);
  });

  it('completarDorsales: el libre más bajo del 1 al 24, o a partir del 25; los no convocados pueden seguir sin dorsal', () => {
    const d = asignarDorsalesIniciales(ids, titularesEn('4-3-3'), '4-3-3', semilla);
    const [x, y, z] = ids;
    // x se lleva el 2 de y; z se lleva el 5. y y el antiguo 5 quedan sin dorsal.
    let e = asignarDorsal(d, x!, d[y!]!);
    const cinco = ids.find((id) => e[id] === 5)!;
    e = asignarDorsal(e, z!, 5);
    const r = completarDorsales(e, [y!]);
    expect(r.asignados).toEqual([{ jugadorId: y, dorsal: d[x!] }]);
    expect(r.dorsales[cinco]).toBeUndefined();
    // Del 1 al 24 ocupados: a partir del 25.
    const lleno: Dorsales = Object.fromEntries(Array.from({ length: 24 }, (_, k) => [k + 1, k + 1]));
    expect(completarDorsales(lleno, [100, 101]).asignados).toEqual([
      { jugadorId: 100, dorsal: 25 },
      { jugadorId: 101, dorsal: 26 },
    ]);
  });

  it('propiedad: tras cualquier secuencia de operaciones, no hay dos jugadores con el mismo dorsal (SC-014)', () => {
    const inicial = asignarDorsalesIniciales(ids, titularesEn('4-4-2'), '4-4-2', semilla);
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.record({ tipo: fc.constant('asignar' as const), jugador: fc.constantFrom(...ids), n: fc.integer({ min: 1, max: 99 }) }),
            fc.record({ tipo: fc.constant('completar' as const), convocados: fc.subarray(ids, { minLength: 1, maxLength: 18 }) }),
          ),
          { maxLength: 40 },
        ),
        (operaciones) => {
          let d = inicial;
          for (const o of operaciones) d = o.tipo === 'asignar' ? asignarDorsal(d, o.jugador, o.n) : completarDorsales(d, o.convocados).dorsales;
          const valores = Object.values(d);
          expect(new Set(valores).size).toBe(valores.length);
          expect(valores.every((n) => n >= 1 && n <= 99)).toBe(true);
        },
      ),
    );
  });
});

describe('equipaciones (FR-031b)', () => {
  it('se asignan al azar con primera ≠ segunda y son válidas', () => {
    for (let i = 0; i < 50; i++) {
      const e = equipacionesAleatorias(semillaDesdeTexto(`eq${i}`), PARAMETROS_V2);
      expect(e.primera.principal).not.toBe(e.segunda.principal);
      expect(validarEquipaciones(e)).toEqual([]);
    }
  });

  it('el dorsal se lee sobre la camiseta: contraste ≥ 4,5:1 en todas las equipaciones aleatorias', () => {
    for (let i = 0; i < 200; i++) {
      const e = equipacionesAleatorias(semillaDesdeTexto(`contraste${i}`), PARAMETROS_V2);
      for (const k of [e.primera, e.segunda]) expect(relacionContraste(k.principal, k.secundario)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('valida colores y que las dos equipaciones no sean iguales', () => {
    const base = { primera: { principal: '#ff0000', secundario: '#ffffff' }, segunda: { principal: '#0000ff', secundario: '#ffffff' } };
    expect(validarEquipaciones({ ...base, primera: { principal: 'rojo', secundario: '#fff' } }).map((e) => e.codigo)).toContain('COLOR_INVALIDO');
    expect(validarEquipaciones({ ...base, segunda: base.primera }).map((e) => e.codigo)).toContain('EQUIPACIONES_IGUALES');
  });

  it('el visitante usa la segunda solo si su primera se confunde con la del local', () => {
    const local = { primera: { principal: '#d01010', secundario: '#ffffff' }, segunda: { principal: '#ffffff', secundario: '#d01010' } };
    const parecido = { primera: { principal: '#c81818', secundario: '#000000' }, segunda: { principal: '#1030d0', secundario: '#ffffff' } };
    const distinto = { primera: { principal: '#10a040', secundario: '#ffffff' }, segunda: { principal: '#202020', secundario: '#ffffff' } };
    expect(equipacionEnPartido(local, parecido, PARAMETROS_V2)).toEqual({ local: local.primera, visitante: parecido.segunda });
    expect(equipacionEnPartido(local, distinto, PARAMETROS_V2)).toEqual({ local: local.primera, visitante: distinto.primera });
  });
});
