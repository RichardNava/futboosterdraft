/**
 * Curvas de la 8.0.0 (spec 015, FR-002, FR-006; contracts/motor.md M2.2 y M2.4): cada duelo, sin ajustes, cae en su
 * rango, y el remate sigue enfrentando remate contra parada.
 */
import { parametrosActuales, type AccionCurva, type ParametrosEquilibrado } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { probabilidad } from '../src/acciones/duelo';
import { atributo } from '../src/modificadores/atributos';
import { partido, titularEn } from './ayudas';

/** Probabilidad (en %) de una acción con su curva. */
function curva(p: ParametrosEquilibrado, accion: AccionCurva | 'remate', atacante: number, defensor: number): number {
  const c =
    accion === 'remate'
      ? { base: p.acciones.gol.normal, m: 1 }
      : p.curvas![accion]!;
  return probabilidad({ base: c.base, atacante, defensor, pendiente: c.m }, p) / 10;
}

/** Los nueve duelos de FR-002: acción, atacante, defensor y rango en %. */
const FR002: [AccionCurva | 'remate', number, number, number, number][] = [
  ['regate', 98, 90, 44, 54],
  ['regate', 98, 70, 65, 75],
  ['regate', 66, 90, 15, 25],
  ['pase_corto', 55, 75, 63, 73],
  ['pase_corto', 90, 75, 80, 90],
  ['remate', 90, 80, 64, 74],
  ['remate', 60, 90, 22, 32],
  ['conduccion', 90, 70, 72, 82],
  ['conduccion', 70, 90, 25, 35],
];

describe('curvas de FR-002 con la 8.0.0 (M2.2)', () => {
  it.each(FR002)('%s %i contra %i entre %i y %i %%', (accion, at, def, min, max) => {
    const v = curva(parametrosActuales(), accion, at, def);
    expect(v).toBeGreaterThanOrEqual(min);
    expect(v).toBeLessThanOrEqual(max);
  });
});

describe('remate contra parada (FR-006, M2.4)', () => {
  it('el tirador usa disparo (MED) o finalización (DEL) y el portero (agilidad + colocación) / 2', () => {
    const e = partido('remate015', { version: parametrosActuales().version, parametros: parametrosActuales() });
    const med = titularEn(e, 'local', 'MC-1');
    const del = titularEn(e, 'local', 'DC');
    const por = titularEn(e, 'visitante', 'POR');
    med.jugador = { ...med.jugador, stats: { ...med.jugador.stats, disparo: 91 } as typeof med.jugador.stats };
    del.jugador = { ...del.jugador, stats: { ...del.jugador.stats, finalizacion: 87 } as typeof del.jugador.stats };
    por.jugador = { ...por.jugador, stats: { ...por.jugador.stats, agilidad: 90, colocacion: 70 } as typeof por.jugador.stats };
    expect(atributo(e, e.equipos.local, med, 'remate')).toBeCloseTo(91);
    expect(atributo(e, e.equipos.local, del, 'remate')).toBeCloseTo(87);
    expect(atributo(e, e.equipos.visitante, por, 'parada')).toBeCloseTo(80);
  });
});
