/** Máximos goleadores y asistentes (FR-039 a FR-042; research R15; T136). */
import { describe, expect, it } from 'vitest';
import { Rng, semillaDesdeTexto } from '../../src/rng/xoshiro';
import type { EventoConsecuencia } from '../../src/torneo/bajas';
import { tablaAsistentes, tablaGoleadores } from '../../src/torneo/goleadores';
import { abrirJornada, cerrarJornadaSiCompleta, crearTorneo, esEliminatoria, jornadaActual, registrarResultado, type EstadoTorneo } from '../../src/torneo/torneo';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const gol = (equipo: 'local' | 'visitante', autor: number, asistente?: number, datos: Record<string, unknown> = {}): EventoConsecuencia => ({
  tipo: 'gol',
  equipo,
  jugadores: [{ rol: 'autor', jugadorId: autor }, ...(asistente !== undefined ? [{ rol: 'asistente', jugadorId: asistente }] : [])],
  datos,
});
const entra = (equipo: 'local' | 'visitante', sale: number, nuevo: number): EventoConsecuencia => ({
  tipo: 'sustitucion',
  equipo,
  jugadores: [
    { rol: 'sale', jugadorId: sale },
    { rol: 'entra', jugadorId: nuevo },
  ],
  datos: {},
});

/** Jugadores de un participante: ids 1000·i + k. */
const jugadoresDe = (pid: string) => Array.from({ length: 11 }, (_, k) => 1000 * Number(pid.slice(1)) + k);

/** Registra el primer partido de la jornada abierta con unos eventos. */
function registrar(t: EstadoTorneo, eventos: EventoConsecuencia[], indice = 0, conTitulares = true): EstadoTorneo {
  const j = jornadaActual(t)!;
  const abierto = j.estado === 'abierta' ? t : abrirJornada(t, j.numero);
  const c = j.cruces[indice]!;
  const goles = (lado: 'local' | 'visitante') => eventos.filter((e) => e.tipo === 'gol' && e.equipo === lado).length;
  return registrarResultado(abierto, {
    jornada: j.numero,
    indice,
    local: c.local,
    visitante: c.visitante,
    golesLocal: goles('local'),
    golesVisitante: goles('visitante'),
    partidoId: `${j.numero}-${indice}`,
    eventos,
    ...(conTitulares ? { titulares: { local: jugadoresDe(c.local), visitante: jugadoresDe(c.visitante) } } : {}),
  }).torneo;
}

describe('goleadores y asistentes (T136)', () => {
  it('cuentan autor y asistente de cada gol, sin goles en propia ni la tanda', () => {
    let t = crearTorneo('liga', ids(4), [ids(4)], semillaDesdeTexto('g1'));
    const c = jornadaActual(t)!.cruces[0]!;
    const [a, b] = [jugadoresDe(c.local), jugadoresDe(c.visitante)];
    t = registrar(t, [
      gol('local', a[9]!, a[7]),
      gol('local', a[9]!),
      gol('visitante', b[10]!, b[9], { enPropia: true }),
      { tipo: 'tanda_lanzamiento', equipo: 'local', jugadores: [{ rol: 'autor', jugadorId: a[5]! }], datos: { resultado: 'gol' } },
    ]);
    expect(tablaGoleadores(t)).toEqual([{ posicion: 1, jugadorId: a[9], participanteId: c.local, total: 2, partidosJugados: 1 }]);
    expect(tablaAsistentes(t)).toEqual([{ posicion: 1, jugadorId: a[7], participanteId: c.local, total: 1, partidosJugados: 1 }]);
  });

  it('juegan los titulares iniciales y los que entran en una sustitución', () => {
    let t = crearTorneo('liga', ids(4), [ids(4)], semillaDesdeTexto('g2'));
    const c = jornadaActual(t)!.cruces[0]!;
    const suplente = 5000;
    t = registrar(t, [entra('local', jugadoresDe(c.local)[3]!, suplente), gol('local', suplente)]);
    const fila = tablaGoleadores(t)[0]!;
    expect(fila).toMatchObject({ jugadorId: suplente, total: 1, partidosJugados: 1 });
    // Un gol sin constar como titular ni haber entrado: no cuenta como partido jugado.
    let u = crearTorneo('liga', ids(4), [ids(4)], semillaDesdeTexto('g3'));
    const d = jornadaActual(u)!.cruces[0]!;
    u = registrar(u, [gol('local', jugadoresDe(d.local)[9]!)], 0, false);
    expect(tablaGoleadores(u)[0]).toMatchObject({ total: 1, partidosJugados: 0 });
  });

  it('solo totales ≥ 1, por total descendente y después por menos partidos jugados; admite excluirPartidos', () => {
    let t = crearTorneo('liga', ids(4), [ids(4)], semillaDesdeTexto('g4'));
    const j = jornadaActual(t)!;
    const [c0, c1] = j.cruces;
    const a = jugadoresDe(c0!.local);
    const b = jugadoresDe(c1!.local);
    t = registrar(t, [gol('local', a[9]!), gol('local', a[9]!)], 0);
    t = registrar(t, [gol('local', b[9]!), gol('local', b[9]!), gol('local', b[10]!)], 1);
    t = cerrarJornadaSiCompleta(t, j.numero).torneo;
    // Segunda jornada: a[9] juega otro partido sin marcar.
    const j2 = jornadaActual(t)!;
    const i2 = j2.cruces.findIndex((x) => x.local === c0!.local || x.visitante === c0!.local);
    t = registrar(t, [], i2);
    const tabla = tablaGoleadores(t);
    expect(tabla.map((f) => [f.jugadorId, f.total, f.partidosJugados])).toEqual([
      [b[9], 2, 1],
      [a[9], 2, 2],
      [b[10], 1, 1],
    ]);
    expect(tabla.map((f) => f.posicion)).toEqual([1, 2, 3]);
    expect(tablaAsistentes(t)).toEqual([]);
    // Sin el partido de c1 (pendiente de ver para alguien), b desaparece.
    expect(tablaGoleadores(t, { excluirPartidos: [`${j.numero}-1`] }).map((f) => f.jugadorId)).toEqual([a[9]]);
  });

  it('acumulan todas las fases y las dos mesas de un torneo mixto (con prórroga y tanda)', () => {
    const rng = new Rng(semillaDesdeTexto('mixto-goles'));
    let t = crearTorneo('mixto', ids(16), [ids(8), ids(16).slice(8)], semillaDesdeTexto('mx'));
    let esperados = 0;
    for (let guarda = 0; guarda < 200 && !t.campeon; guarda++) {
      const j = jornadaActual(t)!;
      t = abrirJornada(t, j.numero);
      j.cruces.forEach((c, indice) => {
        const goles = rng.entero(0, 3);
        const eventos = Array.from({ length: goles }, () => gol('local', jugadoresDe(c.local)[9]!));
        esperados += goles;
        const empate = goles === 0;
        t = registrarResultado(t, {
          jornada: j.numero,
          indice,
          local: c.local,
          visitante: c.visitante,
          golesLocal: goles,
          golesVisitante: 0,
          ...(esEliminatoria(j) && empate ? { penaltis: { local: 5, visitante: 4 } } : {}),
          partidoId: `${j.numero}-${indice}`,
          eventos: esEliminatoria(j) && empate ? [{ tipo: 'tanda_lanzamiento', equipo: 'local', jugadores: [{ rol: 'autor', jugadorId: 1 }], datos: {} }] : eventos,
          titulares: { local: jugadoresDe(c.local), visitante: jugadoresDe(c.visitante) },
        }).torneo;
      });
      t = cerrarJornadaSiCompleta(t, j.numero).torneo;
    }
    expect(t.campeon).not.toBeNull();
    expect(tablaGoleadores(t).reduce((s, f) => s + f.total, 0)).toBe(esperados);
    // Hay goleadores de las dos mesas.
    const equipos = new Set(tablaGoleadores(t).map((f) => f.participanteId));
    expect([...equipos].some((p) => ids(8).includes(p))).toBe(true);
    expect([...equipos].some((p) => ids(16).slice(8).includes(p))).toBe(true);
  });
});
