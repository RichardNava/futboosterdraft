import { describe, expect, it } from 'vitest';
import { etiquetaEnergia, muestraPenalizacion, tramoEnergia } from '../../src/componentes/IndicadorEnergia';

describe('tramos del indicador de energía (spec 014, data-model §4)', () => {
  it.each([
    [100, 'fresco'],
    [80, 'fresco'],
    [79, 'bien'],
    [60, 'bien'],
    [59, 'medio'],
    [40, 'medio'],
    [39, 'cansado'],
    [20, 'cansado'],
    [19, 'agotado'],
    [0, 'agotado'],
  ] as const)('%i ⇒ %s', (energia, tramo) => {
    expect(tramoEnergia(energia)).toBe(tramo);
  });

  it('la penalización solo se ve con energía < 80', () => {
    expect(muestraPenalizacion(80)).toBe(false);
    expect(muestraPenalizacion(79)).toBe(true);
  });

  it('aria-label del contrato U1', () => {
    expect(etiquetaEnergia(67, 20)).toBe('Energía 67 %, rinde un 20 % menos');
    expect(etiquetaEnergia(100, 0)).toBe('Energía 100 %');
  });
});
