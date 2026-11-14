import { PARAMETROS_V1, PARAMETROS_V2, PARAMETROS_V3, PARAMETROS_V6_3, PARAMETROS_V7, type ParametrosEquilibrado } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { crearPartido } from '../src/index';
import { entrada } from './ayudas';

describe('versión de los parámetros (002/T007, 003/T005)', () => {
  it('con parámetros 7.0.0 se crea el partido', () => {
    expect(crearPartido(entrada('v7', { version: PARAMETROS_V7.version, parametros: PARAMETROS_V7 })).fase).toBe('primera_parte');
  });

  // Spec 014 (research R14): el código del motor cambia en la 7.0.0; las 3.x a 6.x ya no se simulan.
  it.each([PARAMETROS_V3, PARAMETROS_V6_3])('con parámetros $version lanza VERSION_NO_SOPORTADA', (p) => {
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
