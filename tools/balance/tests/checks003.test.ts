/**
 * Comprobaciones de equilibrado de la spec 003 (T018) y su informe HTML (T032a).
 */
import { describe, expect, it } from 'vitest';
import { comprobarSC001, comprobarSC002, comprobarSC003, comprobarSC004, comprobarSC005, comprobarSC006, comprobarSC007, vaciarCaches } from '../src/checks/partido003';
import type { Comprobacion } from '../src/checks/partido';
import { htmlInforme } from '../src/informe';
import { evaluarPendientes, leerOpciones, pedido } from '../src/cli';

const N = 20;
const todas = (semilla: number): Comprobacion[] => [
  ...comprobarSC001(N, semilla, true),
  comprobarSC002(N, semilla),
  comprobarSC003(N, semilla),
  comprobarSC004(N, semilla),
  comprobarSC005(N, semilla),
];

describe('comprobaciones 003 (T018)', () => {
  const primera = todas(7);

  it('devuelven id, ok booleano y detalle no vacío', () => {
    const ids = primera.map((c) => c.id);
    expect(ids).toEqual(['003/SC-001', '003/SC-001c', '003/SC-002', '003/SC-003', '003/SC-004', '003/SC-005']);
    for (const c of primera) {
      expect(typeof c.ok).toBe('boolean');
      expect(c.detalle.length).toBeGreaterThan(0);
      expect(c.descripcion.length).toBeGreaterThan(0);
    }
  });

  it('son deterministas con la misma semilla', () => {
    vaciarCaches();
    expect(todas(7)).toEqual(primera);
  });

  it('SC-006 y SC-007 dan una comprobación con un detalle por caso', () => {
    const sc006 = comprobarSC006(N, 7);
    const sc007 = comprobarSC007(N, 7);
    expect(sc006.id).toBe('003/SC-006');
    expect(sc006.detalle.split(' · ')).toHaveLength(6);
    expect(sc007.id).toBe('003/SC-007');
    expect(sc007.detalle).toContain('LanzadorFaltas');
  }, 120_000);
});

describe('informe HTML de balance (T032a)', () => {
  it('tiene una fila por comprobación ejecutada, con su resultado', () => {
    const comprobaciones: Comprobacion[] = [
      { id: '003/SC-002', descripcion: 'Goles fuera del área: entre el 22 % y el 28 %', ok: true, detalle: '24,0 %' },
      { id: '003/SC-003', descripcion: 'Variedad de goles: penaltis 6–12 %', ok: false, detalle: 'penalti 4 %' },
    ];
    const html = htmlInforme(comprobaciones, { fecha: new Date(0), seed: 3, n: 50, serie: 'sintetica' });
    expect(html.match(/<tr class="(ok|ko)"/g)).toHaveLength(2);
    expect(html).toContain('data-id="003/SC-002"');
    expect(html).toContain('✅');
    expect(html).toContain('❌');
    expect(html).toContain('Semilla: 3');
    expect(html).toContain('Serie: sintetica');
  });
});

describe('opciones del CLI (T001)', () => {
  it('--solo filtra por id o prefijo y --serie admite sintetica, core o todas', () => {
    const o = leerOpciones(['--n', '30', '--solo', '003/SC-001,SC-004', '--serie', 'todas']);
    expect(o).toMatchObject({ n: 30, solo: ['003/SC-001', 'SC-004'], serie: 'todas' });
    expect(pedido('003/SC-001c', o.solo)).toBe(true);
    expect(pedido('SC-004', o.solo)).toBe(true);
    expect(pedido('003/SC-002', o.solo)).toBe(false);
    expect(leerOpciones([]).serie).toBe('sintetica');
    expect(() => leerOpciones(['--serie', 'otra'])).toThrow();
  });

  it('--pendientes: sus fallos no bloquean; avisa de los que ya se cumplen y de los ids que no se ejecutan', () => {
    expect(leerOpciones(['--pendientes', '002/SC-008, 003/SC-009']).pendientes).toEqual(['002/SC-008', '003/SC-009']);
    expect(leerOpciones([]).pendientes).toEqual([]);
    const r = (id: string, ok: boolean): Comprobacion => ({ id, ok, descripcion: '', detalle: '' });
    const e = evaluarPendientes([r('002/SC-008', false), r('002/SC-007a', true), r('SC-004', false)], ['002/SC-008', '002/SC-007a', '002/SC-07']);
    expect(e.bloqueantes.map((c) => c.id)).toEqual(['SC-004']);
    expect(e.yaCumplen).toEqual(['002/SC-007a']);
    expect(e.desconocidos).toEqual(['002/SC-07']);
  });
});
