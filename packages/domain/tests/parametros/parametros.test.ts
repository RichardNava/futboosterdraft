import { describe, expect, it } from 'vitest';
import { PARAMETROS_V1, PARAMETROS_V3, parametrosActuales, parametrosPorVersion, VersionNoSoportada } from '../../src/index';

describe('parámetros de equilibrado 3.0.0 (spec 003, T004)', () => {
  it('los partidos nuevos usan la versión 3.0.0', () => {
    expect(parametrosActuales().version).toBe('3.0.0');
    expect(parametrosPorVersion('3.0.0')).toBe(PARAMETROS_V3);
  });

  it('los parámetros 1.x y 2.x ya no se pueden volver a simular (research R2)', () => {
    expect(PARAMETROS_V1.version).toBe('1.0.0');
    for (const v of ['1.0.0', '2.0.0']) {
      expect(() => parametrosPorVersion(v)).toThrow(VersionNoSoportada);
      try {
        parametrosPorVersion(v);
      } catch (e) {
        expect((e as VersionNoSoportada).codigo).toBe('VERSION_NO_SOPORTADA');
      }
    }
  });

  it('reproducción, colocación y draft tienen los valores de data-model §1', () => {
    const p = parametrosActuales();
    expect(p.reproduccion).toEqual({
      ticksPorSegundoX2: 23.5,
      descuentoMinS: 60,
      descuentoMaxS: 180,
      pausaGolMs: 2000,
      tandaLanzamientoMsX2: 3000,
      anticipacionTicks: 60,
      esperaMaximaCambioS: 60,
    });
    expect(p.colocacion).toEqual({ beta: 1.0, gamma: 0.5, limite: 3, separacionMinima: 30 });
    expect(p.draft.margenAnimacionS).toBe(8);
  });

  it('pases: distancias, dirección y motivos del pase largo (research R3 y R4)', () => {
    expect(parametrosActuales().pases).toEqual({
      distanciaCorto: 1905,
      distanciaLargo: 3333,
      factorDireccion: { adelante: 1, lateral: 0.8, atrasCorto: 0.5, atrasLargo: 0.05 },
      factorSinMotivo: 0.15,
      factorConMotivo: 1.4,
      atraccionPasadorAcotada: [0.7, 1.8],
    });
    expect(parametrosActuales().acciones.atraccionPasador).toBe(1.3);
  });

  it('tiro por distancia y ángulo, falta directa y autogoles (research R6 y R7)', () => {
    const t = parametrosActuales().tiro;
    expect(t.pesoPorTramo).toEqual([
      { hastaM: 11, peso: 200 },
      { hastaM: 16.5, peso: 150 },
      { hastaM: 25, peso: 55 },
      { hastaM: 35, peso: 20 },
    ]);
    expect(t.anguloMinimoGrados).toBe(6);
    expect(t.anguloReducidoGrados).toBe(15);
    expect(t.porteroAdelantadoM).toBe(15);
    expect(t.pendienteDistancia).toBe(0.35);
    expect(t.pendienteAngulo).toBe(0.5);
    expect(t.faltaDirectaTiro).toEqual({ distanciaMinM: 17, distanciaMaxM: 30, probabilidad: 0.8 });
    expect(t.autogol).toEqual({ despejeCentro: 0.008, despejeCentroPorPuntoDefensa: 0.03, desvio: 0.008 });
  });

  it('disciplina: penalti espacial y faltas en duelos aéreos del área (research R7)', () => {
    const d = parametrosActuales().disciplina as unknown as Record<string, unknown>;
    expect(d).not.toHaveProperty('probabilidadPenaltiPorFaltaEnArea');
    expect(d.probabilidadFaltaDueloAereoArea).toBe(0.04);
  });

  it('decisión: radio de intervención y conducción por espacio (research R5 y R9)', () => {
    const d = parametrosActuales().decision;
    expect(d.radioIntervencionPorPunto).toBe(0.04);
    expect(d.radioIntervencionMax).toBe(0.4);
    expect(d.conduccion).toEqual({ espacioMin: 285, espacioMax: 1430, factorMin: 6, factorMax: 14, distanciaMin: 400, distanciaMax: 800 });
  });

  it('penalización dentro de la demarcación (−10 %) y en la portería (−60 %)', () => {
    const p = parametrosActuales();
    expect(p.penalizacionPosicion.mismaDemarcacion).toBe(0.1);
    expect(p.penalizacionPosicion.porteria).toBe(0.6);
  });
});
