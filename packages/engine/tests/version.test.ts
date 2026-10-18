import { PARAMETROS_V1, type ParametrosEquilibrado } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { crearPartido } from '../src/index';
import { entrada } from './ayudas';

describe('versión de los parámetros (T007)', () => {
  it('con parámetros 2.0.0 se crea el partido', () => {
    expect(crearPartido(entrada('v2')).fase).toBe('primera_parte');
  });

  it('con parámetros 1.x lanza VERSION_NO_SOPORTADA', () => {
    const v1 = PARAMETROS_V1 as unknown as ParametrosEquilibrado;
    expect(() => crearPartido(entrada('v1', { version: '1.0.0', parametros: v1 }))).toThrow(
      expect.objectContaining({ codigo: 'VERSION_NO_SOPORTADA' }),
    );
  });
});
