/**
 * Distancia, zona y tipo de los remates y estadísticas de pases y tiros nuevas (spec 003, research R11;
 * data-model §7.2 y §7.3; contracts/engine-api.md; T016).
 */
import { aportacionesDePartido, PARAMETROS_V3 } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { avanzar, crearPartido, type EstadisticasEquipo, type ResultadoTramo } from '../src/index';
import { entrada } from './ayudas';

const ZONAS = new Set(['area', 'frontal', 'lejos']);
const partidos: ResultadoTramo[] = Array.from({ length: 30 }, (_, i) => avanzar(crearPartido(entrada(`goles-${i}`, { eliminatoria: i % 3 === 0 })), 'final'));
const suma = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

describe('eventos de tiro y gol (T016)', () => {
  it('todos los tiros y goles llevan la distancia (metros enteros) y la zona del remate', () => {
    let tiros = 0;
    for (const r of partidos) {
      for (const e of r.eventos) {
        if (e.tipo !== 'tiro' && e.tipo !== 'gol') continue;
        tiros++;
        expect(Number.isInteger(e.datos.distancia), JSON.stringify(e.datos)).toBe(true);
        expect((e.datos.distancia as number) >= 0).toBe(true);
        expect(ZONAS.has(e.datos.zonaRemate as string), JSON.stringify(e.datos)).toBe(true);
      }
    }
    expect(tiros).toBeGreaterThan(100);
  });

  it('golesPorTipo y golesPorZona suman el marcador (sin la tanda de penaltis)', () => {
    for (const r of partidos) {
      for (const lado of ['local', 'visitante'] as const) {
        const s = r.estadisticas[lado];
        expect(suma(s.golesPorTipo)).toBe(r.marcador[lado]);
        expect(suma(s.golesPorZona)).toBe(r.marcador[lado]);
        expect(Object.keys(s.golesPorTipo).sort()).toEqual(['cabeza', 'falta', 'jugada', 'penalti', 'propia']);
      }
    }
  });

  it('los pases cortos y largos no superan los pases, ni los largos hacia atrás a los largos', () => {
    for (const r of partidos) {
      for (const s of [r.estadisticas.local, r.estadisticas.visitante] as EstadisticasEquipo[]) {
        expect(s.pasesCortos + s.pasesLargos).toBeLessThanOrEqual(s.pases);
        expect(s.pasesLargosAtras).toBeLessThanOrEqual(s.pasesLargos);
        expect(s.tirosArea + s.tirosFrontal + s.tirosLejos).toBe(s.tiros);
      }
    }
  });

  it('un gol en propia puerta no suma goles ni asistencias al defensor que lo marca', () => {
    const q = structuredClone(PARAMETROS_V3);
    q.tiro.autogol.desvio = 0.5;
    let vistos = 0;
    for (let i = 0; i < 6; i++) {
      const r = avanzar(crearPartido(entrada(`propia-${i}`, { version: q.version, parametros: q })), 'final');
      const propias = r.eventos.filter((e) => e.tipo === 'gol' && e.datos.tipo === 'propia');
      if (propias.length === 0) continue;
      vistos += propias.length;
      const aportaciones = aportacionesDePartido(`p${i}`, { local: 'local', visitante: 'visitante' }, r.eventos);
      for (const g of propias) expect(g.datos.enPropia).toBe(true);
      // Los goles en propia no suman nada a nadie: sin ellos, las aportaciones son las mismas (el defensor puede tener
      // otros goles o asistencias legítimos en el partido).
      const sinPropias = aportacionesDePartido(`p${i}`, { local: 'local', visitante: 'visitante' }, r.eventos.filter((e) => !propias.includes(e)));
      expect(aportaciones).toEqual(sinPropias);
      const golesJugadores = aportaciones.reduce((n, a) => n + a.goles, 0);
      expect(golesJugadores).toBe(r.marcador.local + r.marcador.visitante - propias.length);
    }
    expect(vistos).toBeGreaterThan(0);
  });
});
