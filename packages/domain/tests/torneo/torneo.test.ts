import { describe, expect, it } from 'vitest';
import { Rng, semillaDesdeTexto } from '../../src/rng/xoshiro';
import {
  abrirJornada,
  cerrarJornadaSiCompleta,
  clasificacionActual,
  crearTorneo,
  esEliminatoria,
  jornadaActual,
  registrarResultado,
  type EstadoTorneo,
} from '../../src/torneo/torneo';

const ids = (n: number, p = 'p') => Array.from({ length: n }, (_, i) => `${p}${i}`);

/** Juega el torneo completo con resultados aleatorios (empates en eliminatoria resueltos por penaltis). */
function jugar(t: EstadoTorneo, semilla: string): { torneo: EstadoTorneo; partidos: number } {
  const rng = new Rng(semillaDesdeTexto(semilla));
  let partidos = 0;
  for (let guarda = 0; guarda < 100 && !t.campeon; guarda++) {
    const j = jornadaActual(t)!;
    t = abrirJornada(t, j.numero);
    j.cruces.forEach((c, indice) => {
      const gl = rng.entero(0, 3);
      const gv = rng.entero(0, 3);
      const penaltis = esEliminatoria(j) && gl === gv ? { local: 5, visitante: 4 } : undefined;
      t = registrarResultado(t, { jornada: j.numero, indice, local: c.local, visitante: c.visitante, golesLocal: gl, golesVisitante: gv, ...(penaltis ? { penaltis } : {}), partidoId: `${j.numero}-${indice}`, eventos: [] }).torneo;
      partidos++;
    });
    t = cerrarJornadaSiCompleta(t, j.numero).torneo;
  }
  return { torneo: t, partidos };
}

describe('torneo (FR-051 a FR-054)', () => {
  it('liga de 4: 12 partidos y el campeón es el primero de la clasificación', () => {
    const { torneo, partidos } = jugar(crearTorneo('liga', ids(4), [ids(4)], semillaDesdeTexto('liga')), 'r1');
    expect(partidos).toBe(12);
    expect(torneo.campeon).toBe(clasificacionActual(torneo)[0]!.participanteId);
  });

  it('playoff de 16: 15 partidos (octavos, cuartos, semifinales y final)', () => {
    const a = ids(8, 'a');
    const b = ids(8, 'b');
    const { torneo, partidos } = jugar(crearTorneo('playoff', [...a, ...b], [a, b], semillaDesdeTexto('po')), 'r2');
    expect(partidos).toBe(15);
    expect(torneo.jornadas.map((j) => j.tipo)).toEqual(['octavos', 'cuartos', 'semifinal', 'final']);
    expect(torneo.campeon).toBeTruthy();
  });

  it('mixto: 56 de liga + semifinales 1.º–4.º y 2.º–3.º + final = 59', () => {
    let t = crearTorneo('mixto', ids(8), [ids(8)], semillaDesdeTexto('mx'));
    const { torneo, partidos } = jugar(t, 'r3');
    t = torneo;
    expect(partidos).toBe(59);
    const semis = t.jornadas.find((j) => j.tipo === 'semifinal')!;
    const tabla = clasificacionActual(t).map((f) => f.participanteId);
    expect(semis.cruces).toEqual([
      { local: tabla[0], visitante: tabla[3] },
      { local: tabla[1], visitante: tabla[2] },
    ]);
    expect(t.campeon).toBeTruthy();
  });

  it('una jornada no se cierra hasta que se juegan todos sus partidos', () => {
    let t = crearTorneo('liga', ids(4), [ids(4)], semillaDesdeTexto('parcial'));
    const j = jornadaActual(t)!;
    const c = j.cruces[0]!;
    t = registrarResultado(t, { jornada: j.numero, indice: 0, local: c.local, visitante: c.visitante, golesLocal: 1, golesVisitante: 0, partidoId: 'x', eventos: [] }).torneo;
    expect(cerrarJornadaSiCompleta(t, j.numero).cerrada).toBe(false);
  });
});

describe('clasificación sin los partidos pendientes de ver (FR-030, research R8, T032)', () => {
  it('excluirPartidos calcula la clasificación sin esos partidos', () => {
    let t = abrirJornada(crearTorneo('liga', ids(4), [ids(4)], semillaDesdeTexto('excluir')), 1);
    const j = t.jornadas[0]!;
    j.cruces.forEach((c, indice) => {
      t = registrarResultado(t, { jornada: 1, indice, local: c.local, visitante: c.visitante, golesLocal: 2, golesVisitante: 0, partidoId: `p${indice}`, eventos: [] }).torneo;
    });
    const completa = clasificacionActual(t);
    expect(completa.reduce((s, f) => s + f.pj, 0)).toBe(2 * j.cruces.length);
    const sinPrimero = clasificacionActual(t, { excluirPartidos: ['p0'] });
    expect(sinPrimero.reduce((s, f) => s + f.pj, 0)).toBe(2 * (j.cruces.length - 1));
    const ganadorExcluido = sinPrimero.find((f) => f.participanteId === j.cruces[0]!.local)!;
    expect(ganadorExcluido.pts).toBe(0);
    // Sin nada que excluir, igual que la completa.
    expect(clasificacionActual(t, { excluirPartidos: [] })).toEqual(completa);
  });
});

describe('torneo del modo Duelo de jugadores (spec 005, T065)', () => {
  it('usa el cuadro del playoff y registra los cruces sin bajas ni sanciones', async () => {
    const { crearTorneo, registrarResultado, cerrarJornadaSiCompleta, semillaDesdeTexto: semilla } = await import('../../src/index');
    const participantes = ['a', 'b', 'c', 'd'];
    let t = crearTorneo('duelos', participantes, [participantes], semilla('duelos'));
    expect(t.fase).toBe('eliminatoria');
    expect(t.cuadro?.rondas).toHaveLength(2);
    const j = t.jornadas[0]!;
    for (const [indice, cruce] of j.cruces.entries()) {
      // Empate a duelos ganados: el desempate decide quién pasa (como unos penaltis).
      t = registrarResultado(t, {
        jornada: j.numero,
        indice,
        local: cruce.local,
        visitante: cruce.visitante,
        golesLocal: 5,
        golesVisitante: 5,
        penaltis: { local: 0, visitante: 1 },
        partidoId: `p${indice}`,
        eventos: [],
      }).torneo;
    }
    t = cerrarJornadaSiCompleta(t, j.numero).torneo;
    expect(t.bajas.bajas).toEqual([]);
    expect(t.cuadro!.rondas[1]!.cruces[0]!.local).toBe(j.cruces[0]!.visitante);
    expect(t.jornadas).toHaveLength(2);
  });
});
