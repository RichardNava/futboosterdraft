import { validarColeccion, type Demarcacion, type Nivel } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { DISTRIBUCION_CORE, generarCore } from '../src/generarCore';

describe('generarCore', () => {
  const jugadores = generarCore();

  it('genera 300 jugadores válidos', () => {
    expect(jugadores).toHaveLength(300);
    expect(validarColeccion(jugadores)).toEqual([]);
  });

  it('respeta exactamente la tabla demarcación × nivel de la especificación', () => {
    const cuenta: Record<string, number> = {};
    for (const j of jugadores) cuenta[`${j.demarcacion}/${j.nivel}`] = (cuenta[`${j.demarcacion}/${j.nivel}`] ?? 0) + 1;
    for (const [dem, niveles] of Object.entries(DISTRIBUCION_CORE)) {
      for (const [nivel, n] of Object.entries(niveles)) {
        expect(cuenta[`${dem as Demarcacion}/${nivel as Nivel}`] ?? 0, `${dem}/${nivel}`).toBe(n);
      }
    }
  });

  it('las medias caen en el rango de su nivel', () => {
    const rangos: Record<Nivel, [number, number]> = {
      Superclase: [70, 80],
      Epico: [78, 85],
      Legendario: [83, 90],
      GOAT: [88, 95],
    };
    for (const j of jugadores) {
      const [min, max] = rangos[j.nivel];
      expect(j.media).toBeGreaterThanOrEqual(min);
      expect(j.media).toBeLessThan(max);
    }
  });

  it('cubre todas las posiciones del juego', () => {
    const posiciones = new Set(jugadores.flatMap((j) => j.posicion));
    for (const p of ['POR', 'LI', 'LD', 'DCI', 'DCD', 'CI', 'CD', 'MD', 'MC', 'MII', 'MID', 'MCO', 'DC', 'SD', 'EI', 'ED']) {
      expect(posiciones.has(p as never), p).toBe(true);
    }
  });

  it('es determinista', () => {
    expect(generarCore()).toEqual(jugadores);
  });

  it('usa nombres sin repetir', () => {
    expect(new Set(jugadores.map((j) => `${j.nombre} ${j.apellidos}`)).size).toBe(300);
  });
});
