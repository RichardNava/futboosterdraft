/**
 * FR-055 (spec 005, T034): todo rasgo de la tabla está registrado con su prueba; los de la spec 005, con prueba de
 * unidad y comprobación de `balance`. Las pruebas registradas existen.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFECTOS, RASGOS, VIRTUDES_NUEVAS_005, type Rasgo } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { RASGOS_PROBADOS } from './rasgosProbados';

const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));
const NUEVOS: readonly Rasgo[] = [...DEFECTOS, ...VIRTUDES_NUEVAS_005];

describe('rasgos probados (FR-055)', () => {
  it.each(Object.keys(RASGOS) as Rasgo[])('%s está registrado', (id) => {
    expect(RASGOS_PROBADOS[id], `Falta ${id} en RASGOS_PROBADOS`).toBeDefined();
  });

  it.each(NUEVOS)('%s (spec 005) tiene prueba de unidad y comprobación de balance', (id) => {
    expect(RASGOS_PROBADOS[id]?.prueba).toBeTruthy();
    expect(RASGOS_PROBADOS[id]?.balance).toMatch(/^005\//);
  });

  it('cada prueba registrada existe', () => {
    for (const r of Object.values(RASGOS_PROBADOS)) if (r?.prueba) expect(existsSync(`${RAIZ}${r.prueba}`), r.prueba).toBe(true);
  });

  it('no hay rasgos registrados que no estén en la tabla', () => {
    for (const id of Object.keys(RASGOS_PROBADOS)) expect(RASGOS).toHaveProperty(id);
  });
});
