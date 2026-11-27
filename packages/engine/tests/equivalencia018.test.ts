/**
 * Huella de la spec 018 (T065; SC-009): los 100 partidos y 20 drafts de `fixtures/huella-018.json`, con los parámetros
 * 9.0.0, salen idénticos. Protege la optimización (FR-045): ningún cambio de rendimiento puede cambiar un resultado.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PARAMETROS_V9 } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { draftHuella, partidoHuella, type Huella } from './fixtures/huella014';

const huella = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/huella-018.json', import.meta.url)), 'utf-8')) as Huella;

describe('huella de la spec 018 (SC-009)', () => {
  it('es de la versión 9.0.0 y cubre 100 partidos y 20 drafts', () => {
    expect(huella.version).toBe(PARAMETROS_V9.version);
    expect([huella.partidos.length, huella.drafts.length]).toEqual([100, 20]);
  });

  it.each(huella.partidos.map((p) => [p.semilla, p] as const))('el partido %i es idéntico (eventos, marcador, estadísticas y fotogramas)', (semilla, p) => {
    expect(partidoHuella(semilla, PARAMETROS_V9)).toEqual(p);
  });

  it.each(huella.drafts.map((d) => [d.semilla, d] as const))('el draft %i da los mismos picks', (semilla, d) => {
    expect(draftHuella(semilla, PARAMETROS_V9)).toEqual(d);
  });
});
