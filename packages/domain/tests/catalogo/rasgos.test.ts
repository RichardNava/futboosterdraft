/**
 * Tabla única de rasgos (spec 005, T024; FR-050, FR-051; contracts/rasgos.md).
 */
import { describe, expect, it } from 'vitest';
import { DEFECTOS, esDefecto, esVirtud, RASGOS, rasgo, REPARTO_DEFECTOS, TODAS_LAS_VIRTUDES, type Rasgo } from '../../src/index';

const todos = Object.values(RASGOS);

describe('tabla de rasgos', () => {
  it('tiene los 54 rasgos: 39 virtudes y 15 defectos', () => {
    expect(todos).toHaveLength(54);
    expect(TODAS_LAS_VIRTUDES).toHaveLength(39);
    expect(DEFECTOS).toHaveLength(15);
  });

  it('las listas de virtudes y de defectos coinciden con las claves de la tabla por tipo', () => {
    expect(todos.filter((r) => r.tipo === 'virtud').map((r) => r.id).sort()).toEqual([...TODAS_LAS_VIRTUDES].sort());
    expect(todos.filter((r) => r.tipo === 'defecto').map((r) => r.id).sort()).toEqual([...DEFECTOS].sort());
  });

  it.each(todos.map((r) => [r.id, r] as const))('%s tiene todos sus campos', (id, r) => {
    expect(r.id).toBe(id);
    for (const campo of ['nombre', 'descripcion', 'efecto', 'activacion', 'acumulacion'] as const) expect(r[campo].trim()).not.toBe('');
    expect(r.impacto).toBeGreaterThanOrEqual(0);
    expect(r.impacto).toBeLessThanOrEqual(1);
    expect(Math.round(r.impacto * 100) / 100).toBe(r.impacto);
  });

  it('las incompatibilidades son simétricas', () => {
    for (const r of todos) for (const otro of r.incompatibles) expect(RASGOS[otro].incompatibles).toContain(r.id);
  });

  it('los defectos y las virtudes nuevas son genéricos', () => {
    for (const d of DEFECTOS) expect(RASGOS[d].ambito).toBe('generico');
    for (const v of ['DeAcero', 'Versatil', 'FairPlayer', 'Revulsivo'] as Rasgo[]) expect(RASGOS[v].ambito).toBe('generico');
    expect(RASGOS.BoxToBox.ambito).toBe('MED');
  });

  it('los nombres visibles llevan tildes y los identificadores no', () => {
    expect(rasgo('Fragil').nombre).toBe('Frágil');
    expect(rasgo('Chupon').nombre).toBe('Chupón');
    expect(rasgo('DeCristal').nombre).toBe('De cristal');
    expect(rasgo('Polemico').nombre).toBe('Polémico');
    for (const r of todos) expect(r.id).toMatch(/^[A-Za-z]+$/);
  });

  it('esVirtud y esDefecto distinguen los tipos', () => {
    expect(esVirtud('Capitania')).toBe(true);
    expect(esDefecto('Capitania')).toBe(false);
    expect(esDefecto('Torpe')).toBe(true);
    expect(esVirtud('Volar')).toBe(false);
  });

  it('el reparto de defectos crece con el nivel', () => {
    expect(REPARTO_DEFECTOS).toEqual({
      Superclase: { conDefecto: 0.15, conDos: 0 },
      Epico: { conDefecto: 0.25, conDos: 0.2 },
      Legendario: { conDefecto: 0.35, conDos: 0.3 },
      GOAT: { conDefecto: 0.5, conDos: 0.4 },
    });
  });
});
