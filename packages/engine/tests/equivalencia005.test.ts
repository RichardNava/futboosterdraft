/**
 * Línea base de la spec 005 (T005; SC-003, FR-004): con parámetros 3.0.0, los 20 partidos de referencia producen
 * exactamente la secuencia de eventos congelada en el commit `5007f5a` (`fixtures/equivalencia-005.json`).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { jugarEquivalencia005, SEMILLAS_EQUIVALENCIA_005, type EventoResumido } from './fixtures/equiposEquivalencia005';

const referencia = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/equivalencia-005.json', import.meta.url)), 'utf-8')) as {
  partidos: { i: number; eventos: EventoResumido[] }[];
};

describe('equivalencia con la spec 004 (SC-003)', () => {
  it.each(SEMILLAS_EQUIVALENCIA_005)('el partido %i da los mismos eventos que en la línea base', (i) => {
    const esperado = referencia.partidos.find((p) => p.i === i)!.eventos;
    expect(jugarEquivalencia005(i)).toEqual(esperado);
  });
});
