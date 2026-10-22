/** Alineación de los NPC en el modo Duelo de jugadores (spec 005, T069). */
import { casillasEnOrden, FORMACIONES_IDS, PARAMETROS_V4, puntuacionEfectiva, validarAlineacion } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { decidirAlineacionDuelos } from '../src/duelos';
import { jugador, plantilla } from './ayudas';

const p = PARAMETROS_V4;
const suma = (a: ReturnType<typeof decidirAlineacionDuelos>, base: ReturnType<typeof plantilla>) => {
  const casillas = new Map(casillasEnOrden(a.formacion).map((c) => [c.id, c]));
  return a.titulares.reduce((s, t) => s + puntuacionEfectiva(base.find((j) => j.id === t.jugadorId)!, casillas.get(t.casillaId)!, p).base, 0);
};

describe('decidirAlineacionDuelos', () => {
  it.each(FORMACIONES_IDS)('en %s da un once válido de la formación común, sin suplentes', (f) => {
    const base = plantilla(80);
    const a = decidirAlineacionDuelos(base, f, p);
    expect(a.formacion).toBe(f);
    expect(a.titulares).toHaveLength(11);
    expect(new Set(a.titulares.map((t) => t.jugadorId)).size).toBe(11);
    expect(a.suplentes).toEqual([]);
    expect(validarAlineacion(a, base.map((j) => j.id), new Set())).toEqual([]);
  });

  it('pone a cada uno en su posición y prefiere al mejor', () => {
    const base = plantilla(80);
    const crack = jugador('DC', 95);
    const a = decidirAlineacionDuelos([...base, crack], '4-3-3', p);
    expect(a.titulares.find((t) => t.casillaId === 'DC')!.jugadorId).toBe(crack.id);
    expect(a.titulares.find((t) => t.casillaId === 'POR')!.jugadorId).toBe(base.find((j) => j.demarcacion === 'POR' && a.titulares.some((t) => t.jugadorId === j.id))!.id);
  });

  it('ningún intercambio con un no convocado mejora la suma (óptimo local)', () => {
    const base = plantilla(80);
    const a = decidirAlineacionDuelos(base, '4-4-2', p);
    const total = suma(a, base);
    const fuera = base.filter((j) => !a.titulares.some((t) => t.jugadorId === j.id));
    for (const [i, t] of a.titulares.entries()) {
      for (const o of fuera) {
        const otra = { ...a, titulares: a.titulares.map((x, k) => (k === i ? { ...x, jugadorId: o.id } : x)) };
        expect(suma(otra, base)).toBeLessThanOrEqual(total);
      }
      expect(t).toBeDefined();
    }
  });

  it('respeta las bajas y es determinista', () => {
    const base = plantilla(80);
    const a = decidirAlineacionDuelos(base, '4-3-3', p);
    const baja = a.titulares[3]!.jugadorId;
    const b = decidirAlineacionDuelos(base, '4-3-3', p, new Set([baja]));
    expect(b.titulares.map((t) => t.jugadorId)).not.toContain(baja);
    expect(decidirAlineacionDuelos(base, '4-3-3', p)).toEqual(a);
  });
});
