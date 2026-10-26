import { describe, expect, it } from 'vitest';
import { PARAMETROS_ECONOMIA, validarParametrosEconomia, valorDesfragmentar, valorEsperadoSobre } from '../../src/economia/parametros';
import { parametrosActuales } from '../../src/parametros/index';

describe('parámetros de economía (R9; FR-024)', () => {
  const equilibrado = parametrosActuales();

  it('desfragmentar un sobre vale 355 fragmentos de media', () => {
    expect(valorEsperadoSobre(PARAMETROS_ECONOMIA, equilibrado)).toBeCloseTo(355, 9);
  });

  it('los parámetros vigentes son válidos', () => {
    expect(validarParametrosEconomia(PARAMETROS_ECONOMIA, equilibrado)).toEqual([]);
  });

  it('un sobre a 355 fragmentos se rechaza', () => {
    expect(validarParametrosEconomia({ ...PARAMETROS_ECONOMIA, precioSobreFragmentos: 355 }, equilibrado)).toHaveLength(1);
  });

  it('valor por nivel', () => {
    expect(['Superclase', 'Epico', 'Legendario', 'GOAT'].map((n) => valorDesfragmentar(n as 'GOAT'))).toEqual([25, 50, 75, 100]);
  });
});
