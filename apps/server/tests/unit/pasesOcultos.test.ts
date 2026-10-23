/**
 * Cuadro sin revelar (spec 005, corrección): quien pasa de un cruce que el participante aún no ha visto no aparece en
 * las rondas siguientes, y esos cruces van sin ganador hasta la final.
 */
import { describe, expect, it } from 'vitest';
import { pasesOcultos } from '../../src/actores/torneo';

const cuadro = {
  rondas: [
    {
      tipo: 'semifinal' as const,
      cruces: [
        { local: 'yo', visitante: 'a', ganador: 'yo' },
        { local: 'b', visitante: 'c', ganador: 'c' },
      ],
    },
    { tipo: 'final' as const, cruces: [{ local: 'yo', visitante: 'c', ganador: 'c' }] },
  ],
};

describe('pasesOcultos', () => {
  it('sin cruces por ver, no oculta nada', () => {
    const r = pasesOcultos(cuadro, new Set());
    expect(r.ocultos.map((s) => [...s])).toEqual([[], []]);
    expect(r.sinGanador).toEqual([[false, false], [false]]);
  });

  it('un cruce sin ver oculta a quien pasa en la ronda siguiente y el ganador de los cruces que lo siguen', () => {
    const r = pasesOcultos(cuadro, new Set([['yo', 'a'].sort().join()]));
    expect(r.sinGanador).toEqual([[true, false], [true]]);
    expect([...r.ocultos[1]!]).toEqual(['yo']);
    // El otro semifinalista sí se ve: su cruce no está pendiente.
    expect(r.ocultos[1]!.has('c')).toBe(false);
  });
});
