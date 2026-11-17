/**
 * Huella de la spec 015 (T073; SC-010): los 100 partidos y 20 drafts de `fixtures/huella-015.json`, con los parámetros
 * 8.0.0, salen idénticos. La igualdad entre la 2D y la rápida con la 8.0.0 está en `equivalencia.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PARAMETROS_V8 } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { draftHuella, partidoHuella, type Huella } from './fixtures/huella014';

const huella = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/huella-015.json', import.meta.url)), 'utf-8')) as Huella;

describe('huella de la spec 015 (SC-010)', () => {
  it('es de la versión 8.0.0', () => {
    expect(huella.version).toBe(PARAMETROS_V8.version);
  });

  it.each(huella.partidos.map((p) => [p.semilla, p] as const))('el partido %i es idéntico (eventos, marcador, estadísticas y fotogramas)', (semilla, p) => {
    expect(partidoHuella(semilla, PARAMETROS_V8)).toEqual(p);
  });

  it.each(huella.drafts.map((d) => [d.semilla, d] as const))('el draft %i da los mismos picks', (semilla, d) => {
    expect(draftHuella(semilla, PARAMETROS_V8)).toEqual(d);
  });
});
