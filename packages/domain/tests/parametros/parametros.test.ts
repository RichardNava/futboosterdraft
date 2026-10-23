import { describe, expect, it } from 'vitest';
import {
  DEFECTOS_NEUTROS,
  PARAMETROS_V1,
  PARAMETROS_V2,
  PARAMETROS_V3,
  PARAMETROS_V4,
  parametrosActuales,
  parametrosEfectivos,
  parametrosPorVersion,
  VERSION_MAYOR_SOPORTADA,
  VersionNoSoportada,
  type ParametrosEquilibrado,
} from '../../src/index';

describe('parámetros de equilibrado 3.0.0 (spec 003, T004)', () => {
  it('la versión 3.0.0 se sigue pudiendo reproducir', () => {
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
    const p = PARAMETROS_V3;
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
    expect(PARAMETROS_V3.pases).toEqual({
      distanciaCorto: 1905,
      distanciaLargo: 3333,
      factorDireccion: { adelante: 1, lateral: 0.8, atrasCorto: 0.5, atrasLargo: 0.05 },
      factorSinMotivo: 0.15,
      factorConMotivo: 1.4,
      atraccionPasadorAcotada: [0.7, 1.8],
    });
    expect(PARAMETROS_V3.acciones.atraccionPasador).toBe(1.3);
  });

  it('tiro por distancia y ángulo, falta directa y autogoles (research R6 y R7)', () => {
    const t = PARAMETROS_V3.tiro;
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
    const d = PARAMETROS_V3.disciplina as unknown as Record<string, unknown>;
    expect(d).not.toHaveProperty('probabilidadPenaltiPorFaltaEnArea');
    expect(d.probabilidadFaltaDueloAereoArea).toBe(0.04);
  });

  it('decisión: radio de intervención y conducción por espacio (research R5 y R9)', () => {
    const d = PARAMETROS_V3.decision;
    expect(d.radioIntervencionPorPunto).toBe(0.04);
    expect(d.radioIntervencionMax).toBe(0.4);
    expect(d.conduccion).toEqual({ espacioMin: 285, espacioMax: 1430, factorMin: 6, factorMax: 14, distanciaMin: 400, distanciaMax: 800 });
  });

  it('penalización dentro de la demarcación (−10 %) y en la portería (−60 %)', () => {
    const p = PARAMETROS_V3;
    expect(p.penalizacionPosicion.mismaDemarcacion).toBe(0.1);
    expect(p.penalizacionPosicion.porteria).toBe(0.6);
  });
});

describe('parámetros de equilibrado 4.0.0 (spec 005, T031, T032)', () => {
  it('los partidos nuevos usan la versión 4.0.0 y la 3.x se sigue reproduciendo', () => {
    expect(parametrosActuales()).toBe(PARAMETROS_V4);
    expect(parametrosActuales().version).toBe('4.0.0');
    expect(parametrosPorVersion('4.0.0')).toBe(PARAMETROS_V4);
    expect(VERSION_MAYOR_SOPORTADA).toBe(3);
  });

  it('las versiones 1 a 3 se cargan con las secciones nuevas neutras', () => {
    for (const p of [PARAMETROS_V1 as unknown as ParametrosEquilibrado, PARAMETROS_V2, PARAMETROS_V3]) {
      const e = parametrosEfectivos(p);
      expect(e.defectos).toEqual(DEFECTOS_NEUTROS);
      expect(e.duelos).toEqual({ pesoVirtud: 1, pesoDefecto: 1, estadoForma: 2 });
      expect(e.disciplina.factorFaltaArea).toBe(1);
      expect(e.virtudes.revulsivo).toBe(0);
      expect(e.virtudes.versatil).toBe(0);
    }
  });

  it('parametrosEfectivos no cambia ningún valor anterior de la 3.0.0', () => {
    const e = parametrosEfectivos(PARAMETROS_V3);
    for (const [clave, valor] of Object.entries(PARAMETROS_V3)) {
      if (clave === 'disciplina' || clave === 'virtudes') expect(e[clave]).toMatchObject(valor as object);
      else expect(e[clave as keyof typeof e]).toEqual(valor);
    }
    expect(parametrosEfectivos(PARAMETROS_V3)).toBe(e);
  });

  it('la 4.0.0 trae completas las secciones de la spec 005 (contracts/engine-api.md)', () => {
    const p = PARAMETROS_V4;
    expect(p.defectos).toEqual({
      canchero: 1.5,
      impulsivo: 2,
      agresivo: 2,
      fragil: 3,
      indisciplinado: 1.5,
      torpe: 2,
      chupon: 0.5,
      malDefensor: 0.5,
      inflexible: 0.05,
      polemico: 0.05,
      rebelde: 0.05,
      estrellita: 0.1,
      provocador: 1,
    });
    expect(p.duelos).toEqual({ pesoVirtud: 1, pesoDefecto: 1, estadoForma: 2 });
    expect(p.virtudes.revulsivo).toBe(0.05);
    expect(p.virtudes.versatil).toBe(0.05);
    expect(typeof p.disciplina.factorFaltaArea).toBe('number');
  });
});
