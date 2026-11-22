import { PARAMETROS_V1, PARAMETROS_V2, PARAMETROS_V3, PARAMETROS_V6_3, PARAMETROS_V7, PARAMETROS_V8, parametrosActuales, type ParametrosEquilibrado } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { crearPartido } from '../src/index';
import { entrada } from './ayudas';

describe('versión de los parámetros (002/T007, 003/T005)', () => {
  it('con los parámetros vigentes (9.x) se crea el partido', () => {
    expect(parametrosActuales().version).toBe('9.0.0');
    expect(crearPartido(entrada('v9')).fase).toBe('primera_parte');
  });

  // Spec 018 (FR-036): el motor solo simula la 9.x; las anteriores conservan su resumen.
  it.each([PARAMETROS_V3, PARAMETROS_V6_3, PARAMETROS_V7, PARAMETROS_V8])('con parámetros $version lanza VERSION_NO_SOPORTADA', (p) => {
    expect(() => crearPartido(entrada('vieja', { version: p.version, parametros: p }))).toThrow(expect.objectContaining({ codigo: 'VERSION_NO_SOPORTADA' }));
  });

  it('con parámetros 2.x lanza VERSION_NO_SOPORTADA', () => {
    expect(() => crearPartido(entrada('v2', { version: '2.0.0', parametros: PARAMETROS_V2 }))).toThrow(
      expect.objectContaining({ codigo: 'VERSION_NO_SOPORTADA' }),
    );
  });

  it('con parámetros 1.x lanza VERSION_NO_SOPORTADA', () => {
    const v1 = PARAMETROS_V1 as unknown as ParametrosEquilibrado;
    expect(() => crearPartido(entrada('v1', { version: '1.0.0', parametros: v1 }))).toThrow(
      expect.objectContaining({ codigo: 'VERSION_NO_SOPORTADA' }),
    );
  });
});
