import { describe, expect, it } from 'vitest';
import { PARAMETROS_V1, PARAMETROS_V2, parametrosActuales, parametrosPorVersion, VersionNoSoportada } from '../../src/index';

describe('parámetros de equilibrado 2.0.0 (T006)', () => {
  it('los partidos nuevos usan la versión 2.0.0', () => {
    expect(parametrosActuales().version).toBe('2.0.0');
    expect(parametrosPorVersion('2.0.0')).toBe(PARAMETROS_V2);
  });

  it('los parámetros 1.0.0 se conservan como dato, pero no se pueden volver a simular (research R12)', () => {
    expect(PARAMETROS_V1.version).toBe('1.0.0');
    expect(() => parametrosPorVersion('1.0.0')).toThrow(VersionNoSoportada);
    try {
      parametrosPorVersion('1.0.0');
    } catch (e) {
      expect((e as VersionNoSoportada).codigo).toBe('VERSION_NO_SOPORTADA');
    }
  });

  it('reproducción, colocación, asíncrono y draft tienen los valores de data-model §1', () => {
    const p = parametrosActuales();
    expect(p.reproduccion).toEqual({
      ticksPorSegundoX2: 23.5,
      descuentoMinS: 60,
      descuentoMaxS: 180,
      pausaGolMs: 2000,
      tandaLanzamientoMsX2: 3000,
      anticipacionTicks: 60,
    });
    expect(p.colocacion).toEqual({ beta: 0.6, gamma: 0.5, limite: 3, separacionMinima: 30 });
    expect(p.asincrono).toEqual({ nivelDecisiones: 'avanzado' });
    expect(p.draft).toEqual({ margenAnimacionS: 6 });
  });

  it('penalización dentro de la demarcación (−10 %) y en la portería (−60 %)', () => {
    const p = parametrosActuales();
    expect(p.penalizacionPosicion.mismaDemarcacion).toBe(0.1);
    expect(p.penalizacionPosicion.porteria).toBe(0.6);
  });
});
