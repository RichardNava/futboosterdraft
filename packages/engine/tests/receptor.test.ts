/**
 * Receptor por tipo de pase, distancia y dirección reales (spec 003, research R3; FR-016, FR-017; T011).
 */
import { parametrosActuales } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { callejonSinSalida, factorPasador, pesosReceptor, receptorDePase } from '../src/acciones/receptor';
import type { EstadoMotor, JugadorEnPartido } from '../src/index';
import { contextoDe, darBalon, partido, situar, soloEnCampo, titularEn } from './ayudas';

/** Coordenadas del equipo local: x = 0 en su portería; 10 m ≈ 952 décimas. */
const M = 95.24;

function escenaUltimoTercio() {
  const e = partido('receptor');
  const portador = titularEn(e, 'local', 'MC-1');
  const delante = titularEn(e, 'local', 'DC');
  const central = titularEn(e, 'local', 'DCI');
  const rival = titularEn(e, 'visitante', 'DCI');
  situar(e, portador.id, { x: 8000, y: 3200 });
  situar(e, delante.id, { x: 8000 + Math.round(10 * M), y: 3200 });
  situar(e, central.id, { x: 8000 - Math.round(40 * M), y: 3200 });
  // Un rival lejos de todos (coordenadas del visitante: x = 9.000 es su área rival, la portería local).
  situar(e, rival.id, { x: 9000, y: 600 });
  soloEnCampo(e, [portador.id, delante.id, central.id, rival.id]);
  darBalon(e, 'local', portador, 4);
  return { e, portador, delante, central };
}

const repetir = (e: EstadoMotor, portador: JugadorEnPartido, tipo: 'pase_corto' | 'pase_largo' | 'pase_espacio', n: number) =>
  Array.from({ length: n }, (_, i) => receptorDePase(contextoDe(e, `r-${tipo}-${i}`), e.equipos.local, portador, tipo)?.id);

describe('receptor del pase (T011)', () => {
  it('en el último tercio, con un compañero libre por delante, el central lejano por detrás nunca recibe', () => {
    const { e, portador, delante, central } = escenaUltimoTercio();
    for (const tipo of ['pase_corto', 'pase_espacio', 'pase_largo'] as const) {
      const ids = repetir(e, portador, tipo, 1000);
      expect(ids.includes(central.id), tipo).toBe(false);
      expect(ids.every((id) => id === delante.id), tipo).toBe(true);
    }
    expect(callejonSinSalida(e, e.equipos.local, portador)).toBe(false);
  });

  it('en un callejón sin salida (rival encima, nadie libre cerca y sin ángulo de tiro) el pase largo hacia atrás sí es posible', () => {
    const e = partido('callejon');
    const portador = titularEn(e, 'local', 'ED');
    const central = titularEn(e, 'local', 'DCI');
    const rival = titularEn(e, 'visitante', 'LI');
    situar(e, portador.id, { x: 6700, y: 600 });
    situar(e, central.id, { x: 6700 - Math.round(40 * M), y: 3200 });
    // A unos 4 m del portador (coordenadas del visitante).
    situar(e, rival.id, { x: 10000 - 6900, y: 6400 - 900 });
    soloEnCampo(e, [portador.id, central.id, rival.id]);
    darBalon(e, 'local', portador, 4, 0);
    expect(callejonSinSalida(e, e.equipos.local, portador)).toBe(true);
    expect(receptorDePase(contextoDe(e, 'callejon'), e.equipos.local, portador, 'pase_largo')?.id).toBe(central.id);
  });

  it('a la misma distancia, un compañero lateral es más probable que uno hacia atrás', () => {
    const e = partido('lateral');
    const portador = titularEn(e, 'local', 'MC-1');
    const lateral = titularEn(e, 'local', 'EI');
    const atras = titularEn(e, 'local', 'DCI');
    situar(e, portador.id, { x: 5000, y: 3200 });
    situar(e, lateral.id, { x: 5000, y: 3200 + Math.round(12 * M) });
    situar(e, atras.id, { x: 5000 - Math.round(12 * M), y: 3200 });
    soloEnCampo(e, [portador.id, lateral.id, atras.id]);
    darBalon(e, 'local', portador, 3);
    const pesos = new Map(pesosReceptor(e, e.equipos.local, portador, 'pase_corto').map(([j, p]) => [j.id, p]));
    expect(pesos.get(lateral.id)!).toBeGreaterThan(pesos.get(atras.id)!);
  });

  it('el factor del pasador queda acotado a `pases.atraccionPasadorAcotada`', () => {
    const conPase = (pase: number) => {
      const e = partido(`pasador-${pase}`);
      const j = titularEn(e, 'local', 'MC-1');
      j.jugador = { ...j.jugador, stats: { ...j.jugador.stats, pase } as typeof j.jugador.stats };
      return factorPasador(e, e.equipos.local, j);
    };
    const [min, max] = parametrosActuales().pases.atraccionPasadorAcotada;
    expect(conPase(99)).toBeCloseTo(max, 6);
    expect(conPase(30)).toBeCloseTo(min, 6);
    expect(conPase(70)).toBeCloseTo(1, 6);
    expect(conPase(80)).toBeGreaterThan(1);
    expect(conPase(80)).toBeLessThanOrEqual(max);
  });
});
