import { describe, expect, it } from 'vitest';
import { semillaDesdeTexto } from '../../src/rng/xoshiro';
import { clasificacion, type ResultadoLiga } from '../../src/torneo/clasificacion';

const r = (local: string, visitante: string, gl: number, gv: number): ResultadoLiga => ({ local, visitante, golesLocal: gl, golesVisitante: gv });
const semilla = semillaDesdeTexto('clasif');

describe('clasificación (FR-051)', () => {
  it('3 puntos por victoria, 1 por empate y 0 por derrota, con todas las columnas', () => {
    const t = clasificacion(['a', 'b', 'c'], [r('a', 'b', 2, 0), r('b', 'c', 1, 1), r('c', 'a', 0, 3)], semilla);
    expect(t[0]).toEqual({ participanteId: 'a', pj: 2, g: 2, e: 0, p: 0, gf: 5, gc: 0, dg: 5, pts: 6 });
    expect(t.find((x) => x.participanteId === 'b')).toMatchObject({ pj: 2, g: 0, e: 1, p: 1, pts: 1 });
  });

  it('desempata por diferencia de goles y después por goles a favor', () => {
    const porDg = clasificacion(['a', 'b', 'x'], [r('a', 'x', 3, 0), r('b', 'x', 1, 0)], semilla);
    expect(porDg.map((t) => t.participanteId)).toEqual(['a', 'b', 'x']);
    const porGf = clasificacion(['a', 'b', 'x'], [r('a', 'x', 3, 2), r('b', 'x', 1, 0)], semilla);
    expect(porGf.map((t) => t.participanteId).slice(0, 2)).toEqual(['a', 'b']);
  });

  it('con todo igual, decide el enfrentamiento directo', () => {
    // a y b: 4 puntos, 1-1 en goles (mismos puntos, dg y gf); a ganó a b en el enfrentamiento directo.
    const resultados = [r('a', 'b', 1, 0), r('x', 'a', 1, 0), r('a', 'y', 0, 0), r('b', 'x', 1, 0), r('y', 'b', 0, 0)];
    const t = clasificacion(['a', 'b', 'x', 'y'], resultados, semilla);
    const a = t.findIndex((x) => x.participanteId === 'a');
    const b = t.findIndex((x) => x.participanteId === 'b');
    expect(t[a]!.pts).toBe(t[b]!.pts);
    expect(a).toBeLessThan(b);
  });

  it('si todo sigue empatado, sorteo con la semilla (reproducible)', () => {
    const t1 = clasificacion(['a', 'b'], [], semilla).map((x) => x.participanteId);
    expect(clasificacion(['a', 'b'], [], semilla).map((x) => x.participanteId)).toEqual(t1);
  });
});
