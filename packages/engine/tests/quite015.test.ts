/**
 * Quite por demarcación de la 8.0.0 (spec 015, FR-004, FR-005; contracts/motor.md M2.3), sin cansancio ni penalización
 * por posición. Con la 7.0.0, el quite de siempre.
 */
import { PARAMETROS_V7, PARAMETROS_V8, type Defecto, type ParametrosEquilibrado, type Posicion, type Virtud } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { atributo } from '../src/modificadores/atributos';
import { partido, titularEn } from './ayudas';

interface Carta {
  stats: Record<string, number>;
  virtudes?: Virtud[];
  defectos?: Defecto[];
  posicion?: Posicion[];
}

/** Quite del titular de una casilla del local con los stats, rasgos y posiciones indicados. */
function quite(casilla: string, carta: Carta, p: ParametrosEquilibrado = PARAMETROS_V8): number {
  const e = partido(`quite:${casilla}`, { version: p.version, parametros: p });
  const j = titularEn(e, 'local', casilla);
  j.jugador = {
    ...j.jugador,
    stats: { ...j.jugador.stats, ...carta.stats } as typeof j.jugador.stats,
    virtudes: carta.virtudes ?? [],
    defectos: carta.defectos ?? [],
    posicion: carta.posicion ?? j.jugador.posicion,
  };
  return atributo(e, e.equipos.local, j, 'quite');
}

const MED = { posicionamiento: 80, velocidad: 70 };
const DEL = { agresividad: 80, velocidad: 70 };
const DEF = { tackling: 80 };

describe('quite de la 8.0.0 (M2.3)', () => {
  it('MED sin MD: (posicionamiento + velocidad) / 2 × 0,87, ±0,05 por Presionador y Mal defensor', () => {
    expect(quite('MC-1', { stats: MED })).toBeCloseTo(65.25);
    expect(quite('MC-1', { stats: MED, virtudes: ['Presionador'] })).toBeCloseTo(69);
    expect(quite('MC-1', { stats: MED, defectos: ['MalDefensor'] })).toBeCloseTo(61.5);
    expect(quite('MC-1', { stats: MED, virtudes: ['Presionador'], defectos: ['MalDefensor'] })).toBeCloseTo(65.25);
  });

  it('MED con MD en su carta: × 0,92 aunque juegue de MC', () => {
    expect(quite('MC-1', { stats: MED, posicion: ['MD', 'MC'] })).toBeCloseTo(69);
  });

  it('DEL: (agresividad + velocidad) / 2 × 0,80', () => {
    expect(quite('DC', { stats: DEL })).toBeCloseTo(60);
    expect(quite('DC', { stats: DEL, virtudes: ['Presionador'] })).toBeCloseTo(63.75);
  });

  it('DEF: tackling × 1,00', () => {
    expect(quite('DCI', { stats: DEF })).toBeCloseTo(80);
    expect(quite('DCI', { stats: DEF, virtudes: ['Presionador'] })).toBeCloseTo(84);
    expect(quite('DCI', { stats: DEF, defectos: ['MalDefensor'] })).toBeCloseTo(76);
  });

  it('POR: su defensa', () => {
    expect(quite('POR', { stats: { defensa: 77 }, virtudes: ['Presionador'] })).toBeCloseTo(77);
  });
});

describe('quite de la 7.0.0 (sin el bloque)', () => {
  it('MED posicionamiento, DEL agresividad × 0,8, DEF tackling; los rasgos no cuentan', () => {
    expect(quite('MC-1', { stats: MED, virtudes: ['Presionador'] }, PARAMETROS_V7)).toBeCloseTo(80);
    expect(quite('DC', { stats: DEL }, PARAMETROS_V7)).toBeCloseTo(64);
    expect(quite('DCI', { stats: DEF, defectos: ['MalDefensor'] }, PARAMETROS_V7)).toBeCloseTo(80);
  });
});
