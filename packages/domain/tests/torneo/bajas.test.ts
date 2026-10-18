import { describe, expect, it } from 'vitest';
import { autoAlineacion } from '../../src/equipo/autoAlineacion';
import { PARAMETROS_V2 } from '../../src/parametros/index';
import {
  aplicarConsecuencias,
  bajasActivas,
  estadoBajasVacio,
  transicionAEliminatoria,
  type EventoConsecuencia,
} from '../../src/torneo/bajas';
import { plantillaEquilibrada } from '../equipo/ayudas';

const ev = (tipo: string, equipo: 'local' | 'visitante', jugadorId: number, datos: Record<string, unknown> = {}): EventoConsecuencia => ({
  tipo,
  equipo,
  jugadores: [{ rol: 'autor', jugadorId }],
  datos,
});
const partido = (eventos: EventoConsecuencia[], id = 'p1') => ({ partidoId: id, local: 'L', visitante: 'V', eventos });

describe('bajas y amarillas (FR-043, SC-014)', () => {
  it('una roja (directa o por doble amarilla) = 1 partido de sanción', () => {
    let e = aplicarConsecuencias(estadoBajasVacio(), partido([ev('roja', 'local', 1, { motivo: 'directa' })]), 'liga').estado;
    expect(bajasActivas(e, 'L')).toEqual(new Set([1]));
    e = aplicarConsecuencias(e, partido([], 'p2'), 'liga').estado; // cumple el partido
    expect(bajasActivas(e, 'L').size).toBe(0);
  });

  it('lesiones leve, media, grave y larga = 1, 2, 3 y 5 partidos', () => {
    for (const [gravedad, partidos] of [
      ['leve', 1],
      ['media', 2],
      ['grave', 3],
      ['larga', 5],
    ] as const) {
      let e = aplicarConsecuencias(estadoBajasVacio(), partido([ev('lesion', 'visitante', 7, { gravedad, partidos })]), 'liga').estado;
      for (let i = 0; i < partidos; i++) {
        expect(bajasActivas(e, 'V').has(7), `${gravedad} jornada ${i}`).toBe(true);
        e = aplicarConsecuencias(e, partido([], `x${i}`), 'liga').estado;
      }
      expect(bajasActivas(e, 'V').has(7)).toBe(false);
    }
  });

  it('la baja solo avanza cuando juega su equipo', () => {
    let e = aplicarConsecuencias(estadoBajasVacio(), partido([ev('roja', 'local', 1)]), 'liga').estado;
    // Un partido entre otros equipos no cuenta.
    e = aplicarConsecuencias(e, { partidoId: 'otro', local: 'A', visitante: 'B', eventos: [] }, 'liga').estado;
    expect(bajasActivas(e, 'L').has(1)).toBe(true);
  });

  it('tres amarillas acumuladas en liga = 1 partido de sanción y el contador vuelve a 0', () => {
    let e = estadoBajasVacio();
    for (let i = 0; i < 2; i++) e = aplicarConsecuencias(e, partido([ev('amarilla', 'local', 3)], `a${i}`), 'liga').estado;
    expect(bajasActivas(e, 'L').size).toBe(0);
    const r = aplicarConsecuencias(e, partido([ev('amarilla', 'local', 3)], 'a2'), 'liga');
    expect(r.bajasNuevas).toEqual([expect.objectContaining({ jugadorId: 3, motivo: 'acumulacion_amarillas', partidosRestantes: 1 })]);
    expect(r.estado.amarillas['L|3'] ?? 0).toBe(0);
  });

  it('las dos amarillas de una expulsión por doble amarilla no suman al contador', () => {
    const e = aplicarConsecuencias(
      estadoBajasVacio(),
      partido([ev('amarilla', 'local', 4), ev('amarilla', 'local', 4), ev('roja', 'local', 4, { motivo: 'doble_amarilla' })]),
      'liga',
    ).estado;
    expect(e.amarillas['L|4'] ?? 0).toBe(0);
    expect(bajasActivas(e, 'L').has(4)).toBe(true);
  });

  it('en eliminatoria las amarillas no se acumulan', () => {
    let e = estadoBajasVacio();
    for (let i = 0; i < 3; i++) e = aplicarConsecuencias(e, partido([ev('amarilla', 'local', 5)], `e${i}`), 'eliminatoria').estado;
    expect(bajasActivas(e, 'L').size).toBe(0);
  });

  it('al pasar a la eliminatoria del mixto, los contadores vuelven a 0 y las bajas se mantienen', () => {
    let e = aplicarConsecuencias(estadoBajasVacio(), partido([ev('amarilla', 'local', 6), ev('lesion', 'local', 8, { gravedad: 'grave', partidos: 3 })]), 'liga').estado;
    e = transicionAEliminatoria(e);
    expect(e.amarillas).toEqual({});
    expect(bajasActivas(e, 'L').has(8)).toBe(true);
  });

  it('la alineación automática sustituye a un jugador de baja', () => {
    const plantilla = plantillaEquilibrada();
    const a = autoAlineacion(plantilla, new Set(), PARAMETROS_V2);
    const lesionado = a.titulares.find((t) => t.casillaId !== 'POR')!.jugadorId;
    const b = autoAlineacion(plantilla, new Set([lesionado]), PARAMETROS_V2);
    expect(b.titulares.some((t) => t.jugadorId === lesionado)).toBe(false);
    expect(b.suplentes).not.toContain(lesionado);
  });
});
