import { describe, expect, it } from 'vitest';
import { detallePenalizacion, etiquetaEnergia, muestraPenalizacion, penalizacionesPorTipo, tramoEnergia } from '../../src/componentes/IndicadorEnergia';

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

  it('deriva la técnica (×0,5) y la mental (×0,25) de la física, sin campos nuevos (spec 018, FR-021)', () => {
    expect(penalizacionesPorTipo(16)).toEqual({ fisica: 16, tecnica: 8, mental: 4 });
    expect(penalizacionesPorTipo(0)).toEqual({ fisica: 0, tecnica: 0, mental: 0 });
    expect(penalizacionesPorTipo(55)).toEqual({ fisica: 55, tecnica: 28, mental: 14 });
  });

  it('detalle de la penalización con el texto del contrato', () => {
    expect(detallePenalizacion(16)).toBe('Físicas −16 %, técnicas −8 % y mentales −4 % (aproximado).');
  });
});
