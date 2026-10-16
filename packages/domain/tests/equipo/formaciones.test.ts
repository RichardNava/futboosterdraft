import { describe, expect, it } from 'vitest';
import { CASILLA_CENTRAL, FORMACIONES, FORMACIONES_IDS, type FormacionId } from '../../src/equipo/formaciones';

/** Tabla de Assumptions de spec.md (además de POR). "DCI/DCD" es la casilla central de una defensa de 3 o 5. */
const TABLA_SPEC: Record<FormacionId, string> = {
  '3-4-3': 'DCI, DCI/DCD, DCD · CI, MC, MC, CD · EI, DC, ED',
  '4-3-3': 'LI, DCI, DCD, LD · MD, MII, MID · EI, DC, ED',
  '4-4-2': 'LI, DCI, DCD, LD · EI, MC, MC, ED · DC, SD',
  '4-4-2-diamante': 'LI, DCI, DCD, LD · MD, MII, MID, MCO · DC, SD',
  '4-2-3-1': 'LI, DCI, DCD, LD · MD, MC · EI, MCO, ED · DC',
  '3-5-2': 'DCI, DCI/DCD, DCD · CI, MII, MD, MID, CD · DC, SD',
  '5-4-1': 'CI, DCI, DCI/DCD, DCD, CD · EI, MC, MC, ED · DC',
  '5-3-2': 'CI, DCI, DCI/DCD, DCD, CD · MD, MII, MID · DC, SD',
  '4-5-1': 'LI, DCI, DCD, LD · EI, MII, MD, MID, ED · DC',
  '3-3-3-1': 'DCI, DCI/DCD, DCD · CI, MD, CD · EI, MCO, ED · DC',
};

const OFENSIVIDAD: Record<FormacionId, number> = {
  '3-4-3': 2,
  '3-3-3-1': 2,
  '4-3-3': 1,
  '3-5-2': 1,
  '4-2-3-1': 0,
  '4-4-2': 0,
  '4-4-2-diamante': 0,
  '4-5-1': -1,
  '5-3-2': -1,
  '5-4-1': -2,
};

const ordenar = (lista: string[]) => [...lista].sort();

describe('formaciones', () => {
  it('existen las 10 formaciones de FR-025', () => {
    expect(Object.keys(FORMACIONES).sort()).toEqual([...FORMACIONES_IDS].sort());
  });

  it.each(FORMACIONES_IDS)('%s tiene 11 casillas, ids únicos y exactamente 1 POR', (id) => {
    const f = FORMACIONES[id];
    expect(f.casillas).toHaveLength(11);
    expect(new Set(f.casillas.map((c) => c.id)).size).toBe(11);
    expect(f.casillas.filter((c) => c.posicionesAdmitidas.includes('POR'))).toHaveLength(1);
  });

  it.each(FORMACIONES_IDS)('%s coincide con la tabla de la especificación', (id) => {
    const esperadas = TABLA_SPEC[id].split(/[·,]/).map((s) => s.trim());
    const reales = FORMACIONES[id].casillas.filter((c) => c.id !== 'POR').map((c) => c.etiqueta);
    expect(ordenar(reales)).toEqual(ordenar(esperadas));
  });

  it('la casilla central de las defensas de 3 o 5 admite DCI y DCD (FR-025a)', () => {
    for (const id of ['3-4-3', '3-5-2', '5-4-1', '5-3-2', '3-3-3-1'] as const) {
      const central = FORMACIONES[id].casillas.find((c) => c.id === CASILLA_CENTRAL);
      expect(central?.posicionesAdmitidas).toEqual(['DCI', 'DCD']);
    }
  });

  it('la ofensividad sigue la tabla de Assumptions (FR-034)', () => {
    for (const id of FORMACIONES_IDS) expect(FORMACIONES[id].perfil.ofensividad, id).toBe(OFENSIVIDAD[id]);
  });

  it('las zonas están dentro del campo y avanzan de la defensa al ataque', () => {
    for (const id of FORMACIONES_IDS) {
      for (const c of FORMACIONES[id].casillas) {
        expect(c.zona.x).toBeGreaterThanOrEqual(0);
        expect(c.zona.x).toBeLessThanOrEqual(1000);
        expect(c.zona.y).toBeGreaterThanOrEqual(0);
        expect(c.zona.y).toBeLessThanOrEqual(640);
      }
      const xs = FORMACIONES[id].casillas.map((c) => c.zona.x);
      expect(xs[0]).toBe(Math.min(...xs)); // el portero es el más retrasado
    }
  });
});
