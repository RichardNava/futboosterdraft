/**
 * Cabeceador en los duelos aéreos de la 8.0.0 (spec 015, FR-008, FR-009; contracts/motor.md M2.5): ±0,15 a favor del
 * lado que la tiene, atacante o defensor. El aéreo de un defensa es su anticipación.
 */
import { parametrosActuales } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { probabilidad } from '../src/acciones/duelo';
import { ajusteCabeceador } from '../src/acciones/tiro';
import { atributo } from '../src/modificadores/atributos';
import { partido, ponerRasgos, titularEn } from './ayudas';

const e = partido('cabeceador015', { version: parametrosActuales().version, parametros: parametrosActuales() });
const atacante = ponerRasgos(titularEn(e, 'local', 'DC'), { virtudes: ['Cabeceador'] });
const defensor = ponerRasgos(titularEn(e, 'visitante', 'DCI'), { virtudes: ['Cabeceador'] });
const sinVirtud = titularEn(e, 'visitante', 'DCD');

/** Probabilidad (milésimas) de un duelo igualado con el ajuste de Cabeceador. */
const duelo = (ajuste: number) => probabilidad({ base: 0, atacante: 70, defensor: 70, ajuste }, parametrosActuales());

describe('Cabeceador en los duelos aéreos (M2.5)', () => {
  it('el aéreo de un DEF es su anticipación', () => {
    const j = titularEn(e, 'local', 'DCI');
    j.jugador = { ...j.jugador, stats: { ...j.jugador.stats, anticipacion: 88 } as typeof j.jugador.stats };
    expect(atributo(e, e.equipos.local, j, 'aereo')).toBeCloseTo(88);
  });

  it('+0,15 si la tiene el atacante y −0,15 si la tiene el defensor', () => {
    expect(ajusteCabeceador(parametrosActuales(), atacante, sinVirtud)).toBeCloseTo(0.15);
    expect(ajusteCabeceador(parametrosActuales(), undefined, defensor)).toBeCloseTo(-0.15);
    expect(ajusteCabeceador(parametrosActuales(), atacante, defensor)).toBeCloseTo(0);
    expect(duelo(ajusteCabeceador(parametrosActuales(), atacante, sinVirtud))).toBe(650);
    expect(duelo(ajusteCabeceador(parametrosActuales(), sinVirtud, defensor))).toBe(350);
  });
});
