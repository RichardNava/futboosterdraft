/**
 * Resolución de duelos (spec 005, T058; research R9; data-model §6.3; contracts/duelos-api.md).
 */
import { describe, expect, it } from 'vitest';
import {
  casillasEnOrden,
  ErrorDuelos,
  PARAMETROS_V4,
  penalizacionPorPosicion,
  puntuacionEfectiva,
  rasgo,
  resolverCruce,
  semillaDesdeTexto,
  type ConfigDuelos,
  type Jugador,
  type OnceDuelos,
} from '../../src/index';
import { jugador } from '../equipo/ayudas';

const p = PARAMETROS_V4;
const CONFIG: ConfigDuelos = { formacion: '4-3-3', estadoForma: true };
const SIN_FORMA: ConfigDuelos = { formacion: '4-3-3', estadoForma: false };

/** Once en su posición natural para cada casilla de la formación, con la media dada. */
function once(participanteId: string, valor: number, cambios: (j: Jugador, casillaId: string) => Jugador = (j) => j): OnceDuelos {
  const titulares: Record<string, Jugador> = {};
  for (const c of casillasEnOrden(CONFIG.formacion)) {
    const pos = c.posicionesAdmitidas[0]!;
    const dem = pos === 'POR' ? 'POR' : ['LI', 'LD', 'DCI', 'DCD', 'CI', 'CD'].includes(pos) ? 'DEF' : ['MD', 'MC', 'MII', 'MID', 'MCO'].includes(pos) ? 'MED' : 'DEL';
    titulares[c.id] = cambios(jugador(dem, [pos], valor), c.id);
  }
  return { participanteId, titulares };
}

const semilla = (s: string) => semillaDesdeTexto(s);

describe('resolverCruce: invariantes', () => {
  it('11 duelos, uno por casilla, en orden de portero a delanteros; ganados + nulos = 11', () => {
    const r = resolverCruce(once('a', 80), once('b', 80), CONFIG, semilla('inv'), p);
    expect(r.duelos).toHaveLength(11);
    expect(r.duelos.map((d) => d.casillaId)).toEqual(casillasEnOrden('4-3-3').map((c) => c.id));
    expect(r.duelos[0]!.casillaId).toBe('POR');
    const nulos = r.duelos.filter((d) => d.ganador === 'nulo').length;
    expect(r.ganados.local + r.ganados.visitante + nulos).toBe(11);
  });

  it('sin Estado de forma, forma = 0; con él, |forma| ≤ 200', () => {
    const sin = resolverCruce(once('a', 80), once('b', 80), SIN_FORMA, semilla('forma'), p);
    for (const d of sin.duelos) expect([d.local.forma, d.visitante.forma]).toEqual([0, 0]);
    let distintas = 0;
    for (let i = 0; i < 20; i++) {
      const r = resolverCruce(once('a', 80), once('b', 80), CONFIG, semilla(`forma-${i}`), p);
      for (const d of r.duelos) {
        for (const l of [d.local, d.visitante]) {
          expect(Math.abs(l.forma)).toBeLessThanOrEqual(200);
          if (l.forma !== 0) distintas++;
        }
      }
    }
    expect(distintas).toBeGreaterThan(0);
  });

  it('con el Estado de forma, una diferencia de más de 400 centésimas nunca se remonta', () => {
    for (let i = 0; i < 50; i++) {
      const r = resolverCruce(once('a', 85), once('b', 80.5), CONFIG, semilla(`remontada-${i}`), p);
      for (const d of r.duelos) {
        const diferencia = d.local.puntuacion - d.local.forma - (d.visitante.puntuacion - d.visitante.forma);
        if (diferencia > 400) expect(d.ganador).toBe('local');
      }
    }
  });

  it('la misma semilla da el mismo resultado (JSON idéntico)', () => {
    const [local, visitante] = [once('a', 82), once('b', 81)];
    const a = resolverCruce(local, visitante, CONFIG, semilla('det'), p);
    const b = resolverCruce(structuredClone(local), structuredClone(visitante), CONFIG, semilla('det'), p);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('puntuación = media − penalización + virtudes − defectos + forma, en centésimas', () => {
    const r = resolverCruce(
      once('a', 80, (j, c) => (c === 'DC' ? { ...j, virtudes: ['Matador'], defectos: ['Chupon'] } : j)),
      once('b', 80),
      SIN_FORMA,
      semilla('suma'),
      p,
    );
    const dc = r.duelos.find((d) => d.casillaId === 'DC')!.local;
    expect(dc.bonusVirtudes).toBe(Math.round(100 * rasgo('Matador').impacto));
    expect(dc.malusDefectos).toBe(Math.round(100 * (1 - rasgo('Chupon').impacto)));
    expect(dc.puntuacion).toBe(dc.media - dc.penalizacion + dc.bonusVirtudes - dc.malusDefectos + dc.forma);
    for (const d of r.duelos) for (const l of [d.local, d.visitante]) expect(Number.isInteger(l.puntuacion)).toBe(true);
  });

  it('jugar fuera de posición resta su penalización (con Versátil, 5 puntos menos)', () => {
    const casilla = casillasEnOrden('4-3-3').find((c) => c.id === 'ED')!;
    const medio = jugador('MED', ['MC'], 80);
    const tabla = penalizacionPorPosicion(medio, casilla, p);
    expect(tabla).toBeGreaterThan(0.05);
    const fuera = puntuacionEfectiva(medio, casilla, p);
    expect(fuera.penalizacion).toBe(Math.round(80 * tabla * 100));
    const versatil = puntuacionEfectiva({ ...medio, virtudes: ['Versatil'] }, casilla, p);
    expect(versatil.penalizacion).toBe(Math.round(80 * (tabla - 0.05) * 100));
  });
});

describe('resolverCruce: desempates', () => {
  it('gana quien gana más duelos', () => {
    const r = resolverCruce(once('a', 85), once('b', 75), SIN_FORMA, semilla('duelos'), p);
    expect(r.ganador).toBe('local');
    expect(r.desempate).toBe('duelos');
    expect(r.ganados.local).toBe(11);
  });

  it('con los mismos duelos ganados, la mayor suma de puntuaciones', () => {
    // Local mejor en 5 casillas por poco; visitante mejor en otras 5 por mucho; una igualada.
    const ids = casillasEnOrden('4-3-3').map((c) => c.id);
    const local = once('a', 80, (j, c) => {
      const i = ids.indexOf(c);
      return i < 5 ? { ...jugador(j.demarcacion, j.posicion, 81), id: j.id } : j;
    });
    const visitante = once('b', 80, (j, c) => {
      const i = ids.indexOf(c);
      return i >= 5 && i < 10 ? { ...jugador(j.demarcacion, j.posicion, 85), id: j.id } : j;
    });
    const r = resolverCruce(local, visitante, SIN_FORMA, semilla('suma'), p);
    expect(r.ganados).toEqual({ local: 5, visitante: 5 });
    expect(r.desempate).toBe('suma');
    expect(r.ganador).toBe('visitante');
  });

  it('con todo igualado, un sorteo reproducible', () => {
    const ganadores = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const r = resolverCruce(once('a', 80), once('b', 80), SIN_FORMA, semilla(`sorteo-${i}`), p);
      expect(r.desempate).toBe('sorteo');
      expect(r.duelos.every((d) => d.ganador === 'nulo')).toBe(true);
      ganadores.add(r.ganador);
      expect(resolverCruce(once('a', 80), once('b', 80), SIN_FORMA, semilla(`sorteo-${i}`), p).ganador).toBe(r.ganador);
    }
    expect(ganadores.size).toBe(2);
  });
});

describe('resolverCruce: errores', () => {
  it('CASILLAS_INCOMPLETAS si falta alguna casilla', () => {
    const incompleto = once('a', 80);
    const { DC: _dc, ...resto } = incompleto.titulares;
    expect(() => resolverCruce({ ...incompleto, titulares: resto }, once('b', 80), CONFIG, semilla('e'), p)).toThrow(
      expect.objectContaining({ codigo: 'CASILLAS_INCOMPLETAS' }),
    );
  });

  it('JUGADOR_REPETIDO si un jugador está en dos casillas', () => {
    const repetido = once('a', 80);
    const titulares = { ...repetido.titulares, EI: repetido.titulares.DC! };
    try {
      resolverCruce({ ...repetido, titulares }, once('b', 80), CONFIG, semilla('e'), p);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorDuelos);
      expect((e as ErrorDuelos).codigo).toBe('JUGADOR_REPETIDO');
    }
  });
});
