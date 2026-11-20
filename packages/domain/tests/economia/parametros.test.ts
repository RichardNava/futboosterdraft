import { describe, expect, it } from 'vitest';
import {
  PARAMETROS_ECONOMIA,
  validarParametrosEconomia,
  valorDesfragmentar,
  valorEsperadoSobre,
  VENTA_CARTAS_CON_DINERO,
} from '../../src/economia/parametros';
import { parametrosActuales } from '../../src/parametros/index';

describe('parámetros de economía (R9; FR-024)', () => {
  const equilibrado = parametrosActuales();

  it('desfragmentar un sobre vale 510 fragmentos de media, por debajo de los 1000 que cuesta (spec 016, R13)', () => {
    expect(valorEsperadoSobre(PARAMETROS_ECONOMIA, equilibrado)).toBeCloseTo(510, 9);
    expect(PARAMETROS_ECONOMIA.precioSobreFragmentos).toBe(1000);
  });

  it('los parámetros vigentes son válidos', () => {
    expect(validarParametrosEconomia(PARAMETROS_ECONOMIA, equilibrado)).toEqual([]);
  });

  it('un sobre a 510 fragmentos se rechaza', () => {
    expect(validarParametrosEconomia({ ...PARAMETROS_ECONOMIA, precioSobreFragmentos: 510 }, equilibrado)).toHaveLength(1);
  });

  it('valor por nivel: 25 / 75 / 125 / 175 (spec 016, FR-018)', () => {
    expect(['Superclase', 'Crack', 'Legendario', 'GOAT'].map((n) => valorDesfragmentar(n as 'GOAT'))).toEqual([25, 75, 125, 175]);
  });

  it('sin licencia de imagen no se venden fragmentos ni cartas con dinero (spec 011, FR-002)', () => {
    expect(PARAMETROS_ECONOMIA.paquetesFragmentos).toEqual([]);
    expect(VENTA_CARTAS_CON_DINERO).toBe(false);
  });
});
