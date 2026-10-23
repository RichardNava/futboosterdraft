/**
 * Pruebas directas de las virtudes anteriores a la spec 005 que solo se medían en `balance` (spec 005, T034; FR-055):
 * ajustes de probabilidad por acción, ajustes de duelo y bonificaciones de equipo.
 */
import { describe, expect, it } from 'vitest';
import { ajusteVirtudesAccion } from '../src/acciones/juego';
import { ajusteDuelo, bonusInfranqueable, bonusPorDemarcacion } from '../src/modificadores/virtudes';
import { contextoDe, partido, ponerRasgos, titularEn } from './ayudas';

describe('virtudes de acción (juego.ts)', () => {
  const e = partido('virtudes-accion');
  const ctx = contextoDe(e);
  const s = e.parametros.virtudes;
  const medio = titularEn(e, 'local', 'MC-1');
  const extremo = titularEn(e, 'local', 'EI');
  const portero = titularEn(e, 'local', 'POR');
  const rival = titularEn(e, 'visitante', 'MC-1');

  it.each([
    ['PrimerToque', 'pase_corto', 2, 1, s.bonusProbabilidadMedio],
    ['Elegante', 'conduccion', 2, 1, s.bonusProbabilidadMedio],
    ['JugadorEntreLineas', 'pase_corto', 3, 1, s.bonusProbabilidadMedio],
    ['Desbordante', 'regate', 3, 0, s.bonusProbabilidadAlto],
    ['Potente', 'regate', 3, 1, s.bonusProbabilidadLeve],
  ] as const)('%s suma a %s', (virtud, accion, zona, carril, esperado) => {
    const j = ponerRasgos(structuredClone(virtud === 'Desbordante' ? extremo : medio), { virtudes: [virtud] });
    expect(ajusteVirtudesAccion(ctx, accion, j, zona, carril, undefined)).toBeCloseTo(esperado);
    expect(ajusteVirtudesAccion(ctx, accion, ponerRasgos(structuredClone(j), { virtudes: [] }), zona, carril, undefined)).toBe(0);
  });

  it('Jugador de campo: el portero conduce casi seguro en su área', () => {
    const j = ponerRasgos(structuredClone(portero), { virtudes: ['JugadorDeCampo'] });
    expect(ajusteVirtudesAccion(ctx, 'conduccion', j, 0, 1, undefined)).toBeCloseTo(s.bonusProbabilidadAlto);
    expect(ajusteVirtudesAccion(ctx, 'conduccion', j, 1, 1, undefined)).toBe(0);
  });

  it('Presionador resta al atacante al que defiende', () => {
    const d = ponerRasgos(structuredClone(rival), { virtudes: ['Presionador'] });
    expect(ajusteVirtudesAccion(ctx, 'pase_largo', medio, 2, 1, d)).toBeCloseTo(-s.bonusProbabilidadMedio);
  });
});

describe('virtudes de duelo y de equipo (virtudes.ts)', () => {
  it('Intimidante resta al rival del duelo y Aura suma probabilidad a quien la tiene', () => {
    const e = partido('duelo');
    const a = ponerRasgos(titularEn(e, 'local', 'DC'), { virtudes: ['Aura'] });
    const d = ponerRasgos(titularEn(e, 'visitante', 'DCI'), { virtudes: ['Intimidante'] });
    expect(ajusteDuelo(e, a, d)).toEqual({ atacante: -e.parametros.virtudes.intimidante, defensor: 0, probabilidad: e.parametros.virtudes.bonusProbabilidadLeve });
  });

  it('Infranqueable: +2 a tackling y marcaje solo frente a regate ≥ 95', () => {
    const e = partido('infranqueable');
    const d = ponerRasgos(titularEn(e, 'visitante', 'DCI'), { virtudes: ['Infranqueable'] });
    const a = titularEn(e, 'local', 'DC');
    expect(bonusInfranqueable(e, a, d)).toBe(0);
    a.jugador = { ...a.jugador, stats: { ...a.jugador.stats, regate: 95 } as typeof a.jugador.stats };
    expect(bonusInfranqueable(e, a, d)).toBe(e.parametros.virtudes.infranqueable);
  });

  it('Jerarquía, Líbero y Box-to-Box dan su bonificación a su línea', () => {
    const e = partido('lineas');
    const eq = e.equipos.local;
    expect(bonusPorDemarcacion(e, eq)).toEqual({ POR: 0, DEF: 0, MED: 0, DEL: 0 });
    ponerRasgos(titularEn(e, 'local', 'DCI'), { virtudes: ['Jerarquia', 'Libero'] });
    ponerRasgos(titularEn(e, 'local', 'MC-1'), { virtudes: ['BoxToBox'] });
    const s = e.parametros.virtudes;
    expect(bonusPorDemarcacion(e, eq)).toEqual({ POR: 0, DEF: s.jerarquia + s.boxToBox, MED: s.libero, DEL: s.boxToBox });
  });
});
