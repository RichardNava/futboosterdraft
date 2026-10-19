import { PARAMETROS_V1, PARAMETROS_V2, PARAMETROS_V3, type ParametrosEquilibrado } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { crearPartido } from '../src/index';
import { entrada } from './ayudas';

describe('versión de los parámetros (002/T007, 003/T005)', () => {
  it('con parámetros 3.0.0 se crea el partido', () => {
    expect(crearPartido(entrada('v3', { version: PARAMETROS_V3.version, parametros: PARAMETROS_V3 })).fase).toBe('primera_parte');
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
