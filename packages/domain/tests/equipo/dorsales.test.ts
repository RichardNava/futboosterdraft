import { describe, expect, it } from 'vitest';
import { autoAlineacion } from '../../src/equipo/autoAlineacion';
import { asignarDorsalesIniciales, DORSAL_FIJO, editarDorsales, ErrorDorsales } from '../../src/equipo/dorsales';
import {
  equipacionEnPartido,
  equipacionesAleatorias,
  relacionContraste,
  validarEquipaciones,
} from '../../src/equipo/equipaciones';
import { FORMACIONES, CASILLA_CENTRAL } from '../../src/equipo/formaciones';
import { PARAMETROS_V1 } from '../../src/parametros/index';
import { semillaDesdeTexto } from '../../src/rng/xoshiro';
import { plantillaEquilibrada } from './ayudas';

const semilla = semillaDesdeTexto('dorsales');
const plantilla = plantillaEquilibrada();
const ids = plantilla.map((j) => j.id);

/** Coloca 11 jugadores cualesquiera (en orden) en las casillas de una formación. */
function titularesEn(formacionId: keyof typeof FORMACIONES) {
  return FORMACIONES[formacionId].casillas.map((c, i) => ({ casillaId: c.id, jugadorId: ids[i]! }));
}

describe('dorsales (FR-031a)', () => {
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

  it('los 24 tienen dorsal único entre 1 y 99, y la misma semilla da la misma asignación', () => {
    const titulares = titularesEn('3-4-3');
    const d = asignarDorsalesIniciales(ids, titulares, '3-4-3', semilla);
    expect(Object.keys(d)).toHaveLength(24);
    const valores = Object.values(d);
    expect(new Set(valores).size).toBe(24);
    expect(valores.every((n) => n >= 1 && n <= 99)).toBe(true);
    expect(asignarDorsalesIniciales(ids, titulares, '3-4-3', semilla)).toEqual(d);
  });

  it('editar: DORSAL_REPETIDO y DORSAL_FUERA_DE_RANGO', () => {
    const a = autoAlineacion(plantilla, new Set(), PARAMETROS_V1);
    const d = asignarDorsalesIniciales(ids, a.titulares, a.formacion, semilla);
    const [x, y] = ids;
    const codigo = (f: () => unknown) => {
      try {
        f();
        return null;
      } catch (e) {
        return (e as ErrorDorsales).codigo;
      }
    };
    expect(codigo(() => editarDorsales(d, { [x!]: d[y!]! }))).toBe('DORSAL_REPETIDO');
    expect(codigo(() => editarDorsales(d, { [x!]: 100 }))).toBe('DORSAL_FUERA_DE_RANGO');
    expect(codigo(() => editarDorsales(d, { [x!]: 0 }))).toBe('DORSAL_FUERA_DE_RANGO');
    // Intercambio válido.
    const nuevo = editarDorsales(d, { [x!]: d[y!]!, [y!]: d[x!]! });
    expect(nuevo[x!]).toBe(d[y!]);
  });
});

describe('equipaciones (FR-031b)', () => {
  it('se asignan al azar con primera ≠ segunda y son válidas', () => {
    for (let i = 0; i < 50; i++) {
      const e = equipacionesAleatorias(semillaDesdeTexto(`eq${i}`), PARAMETROS_V1);
      expect(e.primera.principal).not.toBe(e.segunda.principal);
      expect(validarEquipaciones(e)).toEqual([]);
    }
  });

  it('el dorsal se lee sobre la camiseta: contraste ≥ 4,5:1 en todas las equipaciones aleatorias', () => {
    for (let i = 0; i < 200; i++) {
      const e = equipacionesAleatorias(semillaDesdeTexto(`contraste${i}`), PARAMETROS_V1);
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
    expect(equipacionEnPartido(local, parecido, PARAMETROS_V1)).toEqual({ local: local.primera, visitante: parecido.segunda });
    expect(equipacionEnPartido(local, distinto, PARAMETROS_V1)).toEqual({ local: local.primera, visitante: distinto.primera });
  });
});
