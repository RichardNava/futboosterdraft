/**
 * Invariante 10 de contracts/engine-api.md (spec 003, research R11; T017): pedir las métricas por jugador no
 * cambia el partido (no consumen números del PRNG) y solo aparecen cuando se piden.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { avanzar, crearPartido } from '../src/index';
import { entrada } from './ayudas';

describe('métricas por jugador (invariante 10)', () => {
  it('con y sin métricas, mismos eventos, marcador, estadísticas y estado final (200 semillas)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (n) => {
        const inicial = crearPartido(entrada(`metricas-${n}`, { eliminatoria: n % 4 === 0 }));
        const con = avanzar(inicial, 'final', { metricas: true });
        const sin = avanzar(inicial, 'final', { metricas: false });
        expect(con.eventos).toEqual(sin.eventos);
        expect(con.marcador).toEqual(sin.marcador);
        expect(con.estadisticas).toEqual(sin.estadisticas);
        expect(con.estado).toEqual(sin.estado);
        expect(con.metricas).toBeDefined();
        expect(sin.metricas).toBeUndefined();
      }),
      { numRuns: 200 },
    );
  }, 120_000);

  it('las métricas se acumulan desde el saque inicial al avanzar por partes', () => {
    const inicial = crearPartido(entrada('metricas-partes'));
    let estado = inicial;
    let ultimo: ReturnType<typeof avanzar> | undefined;
    for (let i = 0; i < 6 && estado.fase !== 'finalizado'; i++) {
      ultimo = avanzar(estado, 'parte', { metricas: true });
      estado = ultimo.estado;
    }
    const entero = avanzar(inicial, 'final', { metricas: true });
    expect(ultimo!.metricas).toEqual(entero.metricas);
    const total = Object.values(entero.metricas!).reduce((n, m) => n + m.pases, 0);
    expect(total).toBe(entero.estadisticas.local.pases + entero.estadisticas.visitante.pases);
  });
});
