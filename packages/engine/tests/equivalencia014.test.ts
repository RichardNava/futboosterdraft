/**
 * Equivalencia de la refactorización (spec 014, US7; FR-030, SC-011): los 100 partidos y 20 drafts de
 * `fixtures/huella-014.json` salen idénticos. La huella no se regenera durante la refactorización.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { draftHuella, partidoHuella, type Huella } from './fixtures/huella014';

const huella = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/huella-014.json', import.meta.url)), 'utf-8')) as Huella;

describe('huella de la spec 014 (FR-030)', () => {
  it('es de la versión 7.0.0', () => {
    expect(huella.version).toBe('7.0.0');
  });

  it.each(huella.partidos.map((p) => [p.semilla, p] as const))('el partido %i es idéntico (eventos, marcador, estadísticas y fotogramas)', (semilla, p) => {
    expect(partidoHuella(semilla)).toEqual(p);
  });

  it.each(huella.drafts.map((d) => [d.semilla, d] as const))('el draft %i da los mismos picks', (semilla, d) => {
    expect(draftHuella(semilla)).toEqual(d);
  });
});
