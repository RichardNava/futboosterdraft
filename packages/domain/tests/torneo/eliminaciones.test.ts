/** Eliminaciones del torneo (spec 003, FR-039; data-model §8.1; T098). */
import { describe, expect, it } from 'vitest';
import { semillaDesdeTexto } from '../../src/rng/xoshiro';
import { eliminacionDe, eliminaciones, ETIQUETA_FASE, humanosEnCompeticion } from '../../src/torneo/eliminaciones';
import { abrirJornada, cerrarJornadaSiCompleta, crearTorneo, jornadaActual, registrarResultado, type EstadoTorneo } from '../../src/torneo/torneo';

const ids = (n: number, p = 'p') => Array.from({ length: n }, (_, i) => `${p}${i}`);

/** Juega la jornada actual: gana el de menor índice en `orden` (o el local si no está). */
function jugarJornada(t: EstadoTorneo, orden: readonly string[]): EstadoTorneo {
  const j = jornadaActual(t)!;
  t = abrirJornada(t, j.numero);
  const rango = (x: string) => (orden.includes(x) ? orden.indexOf(x) : 999);
  j.cruces.forEach((c, indice) => {
    const ganaLocal = rango(c.local) <= rango(c.visitante);
    t = registrarResultado(t, {
      jornada: j.numero,
      indice,
      local: c.local,
      visitante: c.visitante,
      golesLocal: ganaLocal ? 1 : 0,
      golesVisitante: ganaLocal ? 0 : 1,
      partidoId: `${j.numero}-${indice}`,
      eventos: [],
    }).torneo;
  });
  return cerrarJornadaSiCompleta(t, j.numero).torneo;
}

describe('eliminaciones (T098)', () => {
  it('playoff de 8: el perdedor de cuartos queda eliminado en cuartos y el de la final, en la final', () => {
    const p = ids(8);
    let t = crearTorneo('playoff', p, [p], semillaDesdeTexto('po8'));
    const cuartos = jornadaActual(t)!;
    // p0 gana siempre; el resto según su índice.
    t = jugarJornada(t, p);
    const perdedores = cuartos.cruces.map((c) => (p.indexOf(c.local) <= p.indexOf(c.visitante) ? c.visitante : c.local));
    for (const x of perdedores) expect(eliminacionDe(t, x)).toEqual({ participanteId: x, fase: 'cuartos', jornada: cuartos.numero });
    t = jugarJornada(t, p);
    const final = jornadaActual(t)!;
    t = jugarJornada(t, p);
    expect(t.campeon).toBe('p0');
    const finalista = final.cruces[0]!.local === 'p0' ? final.cruces[0]!.visitante : final.cruces[0]!.local;
    expect(eliminacionDe(t, finalista)?.fase).toBe('final');
    expect(eliminacionDe(t, 'p0')).toBeNull();
    expect(eliminaciones(t)).toHaveLength(7);
  });

  it('playoff de 16: los perdedores de la primera ronda caen en octavos', () => {
    const a = ids(8, 'a');
    const b = ids(8, 'b');
    let t = crearTorneo('playoff', [...a, ...b], [a, b], semillaDesdeTexto('po16'));
    t = jugarJornada(t, [...a, ...b]);
    const e = eliminaciones(t);
    expect(e).toHaveLength(8);
    expect(new Set(e.map((x) => x.fase))).toEqual(new Set(['octavos']));
  });

  it('mixto: al cerrar la liga, los no clasificados quedan eliminados en la fase de liga', () => {
    const p = ids(8);
    let t = crearTorneo('mixto', p, [p], semillaDesdeTexto('mx'));
    while (t.fase === 'liga') {
      expect(eliminaciones(t)).toEqual([]);
      t = jugarJornada(t, p);
    }
    const liga = eliminaciones(t);
    expect(liga.map((e) => e.participanteId).sort()).toEqual(['p4', 'p5', 'p6', 'p7']);
    expect(new Set(liga.map((e) => e.fase))).toEqual(new Set(['liga']));
  });

  it('liga pura: nadie queda eliminado, tampoco al terminar', () => {
    const p = ids(4);
    let t = crearTorneo('liga', p, [p], semillaDesdeTexto('liga'));
    while (!t.campeon) {
      expect(eliminaciones(t)).toEqual([]);
      t = jugarJornada(t, p);
    }
    expect(eliminaciones(t)).toEqual([]);
    expect(eliminacionDe(t, 'p3')).toBeNull();
  });

  it('humanosEnCompeticion excluye a los eliminados y a los sustituidos, y es [] con el torneo terminado', () => {
    const p = ids(8);
    let t = crearTorneo('playoff', p, [p], semillaDesdeTexto('po8'));
    t = jugarJornada(t, p);
    const eliminado = eliminaciones(t)[0]!.participanteId;
    const vivos = p.filter((x) => !eliminaciones(t).some((e) => e.participanteId === x));
    // `p0` sustituido por un NPC: no se pasa como activo.
    expect(humanosEnCompeticion(t, [eliminado, vivos[1]!])).toEqual([vivos[1]]);
    expect(humanosEnCompeticion(t, [eliminado])).toEqual([]);
    while (!t.campeon) t = jugarJornada(t, p);
    expect(humanosEnCompeticion(t, ['p0'])).toEqual([]);
  });

  it('ETIQUETA_FASE', () => {
    expect(ETIQUETA_FASE).toEqual({
      liga: 'Fase de liga',
      octavos: 'Octavos de final',
      cuartos: 'Cuartos de final',
      semifinal: 'Semifinales',
      final: 'Final',
    });
  });
});
