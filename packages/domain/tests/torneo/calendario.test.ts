import { describe, expect, it } from 'vitest';
import { semillaDesdeTexto } from '../../src/rng/xoshiro';
import { calendarioLiga, partidosTotales } from '../../src/torneo/calendario';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

describe('calendario de liga (FR-051, SC-012)', () => {
  it.each([4, 5, 6, 7, 8])('liga de %i: 2 × (N − 1) partidos por participante, ida y vuelta', (n) => {
    const jornadas = calendarioLiga(ids(n), semillaDesdeTexto(`cal-${n}`));
    const partidos = jornadas.flatMap((j) => j.partidos);
    for (const p of ids(n)) {
      const suyos = partidos.filter((x) => x.local === p || x.visitante === p);
      expect(suyos).toHaveLength(2 * (n - 1));
      for (const rival of ids(n).filter((r) => r !== p)) {
        // Un partido en casa y otro fuera contra cada rival.
        expect(partidos.filter((x) => x.local === p && x.visitante === rival)).toHaveLength(1);
        expect(partidos.filter((x) => x.local === rival && x.visitante === p)).toHaveLength(1);
      }
    }
    // Nadie juega dos partidos en la misma jornada.
    for (const j of jornadas) {
      const enJornada = j.partidos.flatMap((x) => [x.local, x.visitante]);
      expect(new Set(enJornada).size).toBe(enJornada.length);
    }
  });

  it('con N impar descansa un equipo en cada jornada', () => {
    const jornadas = calendarioLiga(ids(5), semillaDesdeTexto('impar'));
    for (const j of jornadas) expect(j.descansa).toBeDefined();
    expect(jornadas).toHaveLength(10);
  });

  it('número de partidos (SC-012): liga de 4 = 12, de 8 = 56; playoff de 16 = 15; mixto = 59', () => {
    expect(calendarioLiga(ids(4), semillaDesdeTexto('a')).flatMap((j) => j.partidos)).toHaveLength(12);
    expect(calendarioLiga(ids(8), semillaDesdeTexto('b')).flatMap((j) => j.partidos)).toHaveLength(56);
    expect(partidosTotales('liga', 4)).toBe(12);
    expect(partidosTotales('liga', 8)).toBe(56);
    expect(partidosTotales('playoff', 16)).toBe(15);
    expect(partidosTotales('playoff', 4)).toBe(3);
    expect(partidosTotales('mixto', 8)).toBe(59);
  });

  it('es reproducible con la misma semilla', () => {
    expect(calendarioLiga(ids(6), semillaDesdeTexto('x'))).toEqual(calendarioLiga(ids(6), semillaDesdeTexto('x')));
  });
});
