/**
 * Cabeceador en los duelos aéreos de la 8.0.0 (spec 015, FR-008, FR-009; contracts/motor.md M2.5): ±0,15 a favor del
 * lado que la tiene, atacante o defensor; con la 7.0.0, nada. El aéreo de un defensa es su anticipación.
 */
import { PARAMETROS_V7, PARAMETROS_V8 } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { probabilidad } from '../src/acciones/duelo';
import { ajusteCabeceador } from '../src/acciones/tiro';
import { atributo } from '../src/modificadores/atributos';
import { partido, ponerRasgos, titularEn } from './ayudas';

const e = partido('cabeceador015', { version: PARAMETROS_V8.version, parametros: PARAMETROS_V8 });
const atacante = ponerRasgos(titularEn(e, 'local', 'DC'), { virtudes: ['Cabeceador'] });
const defensor = ponerRasgos(titularEn(e, 'visitante', 'DCI'), { virtudes: ['Cabeceador'] });
const sinVirtud = titularEn(e, 'visitante', 'DCD');

/** Probabilidad (milésimas) de un duelo igualado con el ajuste de Cabeceador. */
const duelo = (ajuste: number) => probabilidad({ base: 0, atacante: 70, defensor: 70, ajuste }, PARAMETROS_V8);

describe('Cabeceador en los duelos aéreos (M2.5)', () => {
  it('el aéreo de un DEF es su anticipación', () => {
    const j = titularEn(e, 'local', 'DCI');
    j.jugador = { ...j.jugador, stats: { ...j.jugador.stats, anticipacion: 88 } as typeof j.jugador.stats };
    expect(atributo(e, e.equipos.local, j, 'aereo')).toBeCloseTo(88);
  });

  it('+0,15 si la tiene el atacante y −0,15 si la tiene el defensor', () => {
    expect(ajusteCabeceador(PARAMETROS_V8, atacante, sinVirtud)).toBeCloseTo(0.15);
    expect(ajusteCabeceador(PARAMETROS_V8, undefined, defensor)).toBeCloseTo(-0.15);
    expect(ajusteCabeceador(PARAMETROS_V8, atacante, defensor)).toBeCloseTo(0);
    expect(duelo(ajusteCabeceador(PARAMETROS_V8, atacante, sinVirtud))).toBe(650);
    expect(duelo(ajusteCabeceador(PARAMETROS_V8, sinVirtud, defensor))).toBe(350);
  });

  it('con la 7.0.0 no cambia nada', () => {
    expect(ajusteCabeceador(PARAMETROS_V7, atacante, sinVirtud)).toBe(0);
    expect(ajusteCabeceador(PARAMETROS_V7, undefined, defensor)).toBe(0);
  });
});
