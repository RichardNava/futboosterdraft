import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DISTRIBUCION_CORE, recuentoPorDemarcacionYNivel } from '../../src/catalogo/coleccionCore';
import { DEMARCACIONES, NIVELES, type Demarcacion, type Nivel } from '../../src/catalogo/tipos';
import { comprobarMinimoActivo, estadoMinimo } from '../../src/coleccion/minimo';

/** Colección activa: Core exacta más `extra` cartas de cada combinación. */
function coleccion(extra: number) {
  const cartas: { id: number; demarcacion: Demarcacion; nivel: Nivel }[] = [];
  for (const d of DEMARCACIONES) {
    for (const n of NIVELES) for (let i = 0; i < DISTRIBUCION_CORE[d][n] + extra; i++) cartas.push({ id: cartas.length + 1, demarcacion: d, nivel: n });
  }
  return cartas;
}

describe('mínimo de la colección activa (R11; SC-004)', () => {
  it('ninguna secuencia de retiradas aceptadas baja de DISTRIBUCION_CORE', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3 }), fc.array(fc.nat(), { maxLength: 200 }), (extra, elecciones) => {
        let activas = coleccion(extra);
        for (const e of elecciones) {
          if (!activas.length) break;
          const carta = activas[e % activas.length]!;
          // Desactivar y desfragmentar retiran igual una carta de las activas.
          if (comprobarMinimoActivo(recuentoPorDemarcacionYNivel(activas), carta).ok) activas = activas.filter((c) => c !== carta);
        }
        expect(estadoMinimo(recuentoPorDemarcacionYNivel(activas)).cumple).toBe(true);
      }),
    );
  });

  it('el rechazo informa de la combinación, el mínimo y las activas', () => {
    expect(comprobarMinimoActivo(recuentoPorDemarcacionYNivel(coleccion(0)), { demarcacion: 'DEF', nivel: 'Crack' })).toEqual({
      ok: false,
      demarcacion: 'DEF',
      nivel: 'Crack',
      minimo: 22,
      activas: 22,
    });
    expect(comprobarMinimoActivo(recuentoPorDemarcacionYNivel(coleccion(1)), { demarcacion: 'DEF', nivel: 'Crack' })).toEqual({ ok: true });
  });

  it('estadoMinimo lista las combinaciones por debajo', () => {
    const activas = coleccion(0).filter((c) => !(c.demarcacion === 'POR' && c.nivel === 'GOAT'));
    expect(estadoMinimo(recuentoPorDemarcacionYNivel(activas))).toEqual({
      cumple: false,
      incumplidas: [{ demarcacion: 'POR', nivel: 'GOAT', minimo: 3, activas: 0 }],
    });
  });

  it('con otros mínimos (el recuento de la Core real, spec 008) se aplican esos', () => {
    const activas = recuentoPorDemarcacionYNivel(coleccion(0));
    const minimos = { ...activas, POR: { ...activas.POR, Superclase: 13 } };
    expect(comprobarMinimoActivo(activas, { demarcacion: 'POR', nivel: 'Superclase' }, minimos)).toEqual({ ok: true });
    expect(estadoMinimo({ ...activas, POR: { ...activas.POR, Superclase: 12 } }, minimos).incumplidas).toEqual([
      { demarcacion: 'POR', nivel: 'Superclase', minimo: 13, activas: 12 },
    ]);
  });
});
