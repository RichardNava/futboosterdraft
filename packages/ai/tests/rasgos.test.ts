/**
 * Rasgos en las decisiones de los NPC (spec 005, T056; research R12): no convocar a un Rebelde suplente, evitar a un
 * Estrellita que no es el mejor y cambiar antes a Fatigados e Indisciplinados.
 */
import { PARAMETROS_V3, PARAMETROS_V4, semillaDesdeTexto, type Jugador } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { decidirAlineacion } from '../src/alineacion';
import { avanzar, crearPartido } from '@fbd/engine';
import { ajustarAlineacionPorRasgos, FACTOR_UMBRAL_CANSANCIO, revulsivoParaEntrar, umbralCansancioDe } from '../src/rasgos';
import { entrada, equipo } from '../../engine/tests/ayudas';
import { jugador, plantilla } from './ayudas';

const p = PARAMETROS_V4;
const conDefectos = (j: Jugador, defectos: Jugador['defectos']): Jugador => ({ ...j, defectos });

describe('Rebelde', () => {
  it('un Rebelde que no va de titular no se convoca', () => {
    const base = plantilla(80);
    const sinRasgos = decidirAlineacion('avanzado', base, new Set(), null, semillaDesdeTexto('rebelde'), { parametros: p });
    const suplente = sinRasgos.suplentes[0]!;
    const conRebelde = base.map((j) => (j.id === suplente ? conDefectos(j, ['Rebelde']) : j));
    const a = decidirAlineacion('avanzado', conRebelde, new Set(), null, semillaDesdeTexto('rebelde'), { parametros: p });
    expect(a.suplentes).not.toContain(suplente);
    expect(a.suplentes).toHaveLength(sinRasgos.suplentes.length);
  });

  it('con parámetros 3.0.0 no cambia nada', () => {
    const base = plantilla(80);
    const a = decidirAlineacion('avanzado', base, new Set(), null, semillaDesdeTexto('rebelde-v3'), { parametros: PARAMETROS_V3 });
    const conRebelde = base.map((j) => (j.id === a.suplentes[0] ? conDefectos(j, ['Rebelde']) : j));
    expect(ajustarAlineacionPorRasgos(a, conRebelde, new Set(), PARAMETROS_V3)).toBe(a);
  });
});

describe('Estrellita', () => {
  it('se queda en el banquillo si no es el mejor y hay alguien mejor que él con su −10 %', () => {
    const base = plantilla(80);
    const a = decidirAlineacion('avanzado', base, new Set(), null, semillaDesdeTexto('estrellita'), { parametros: p });
    const titular = a.titulares.find((t) => t.casillaId !== 'POR')!.jugadorId;
    const conEstrellita = base.map((j) => (j.id === titular ? conDefectos(j, ['Estrellita']) : j));
    const ajustada = ajustarAlineacionPorRasgos(a, conEstrellita, new Set(), p);
    expect(ajustada.titulares.map((t) => t.jugadorId)).not.toContain(titular);
    expect(new Set(ajustada.titulares.map((t) => t.jugadorId)).size).toBe(11);
  });

  it('si aun con su −10 % es la mejor opción de su casilla, sigue de titular', () => {
    const base = plantilla(80);
    const a = decidirAlineacion('avanzado', base, new Set(), null, semillaDesdeTexto('estrellita-2'), { parametros: p });
    const t = a.titulares.find((x) => x.casillaId === 'POR')!;
    // El único portero que juega bien en la portería: los demás porteros se quitan de la plantilla.
    const sinOtrosPorteros = base.filter((j) => j.demarcacion !== 'POR' || j.id === t.jugadorId);
    const conEstrellita = sinOtrosPorteros.map((j) => (j.id === t.jugadorId ? conDefectos(j, ['Estrellita']) : j));
    const ajustada = ajustarAlineacionPorRasgos({ ...a, suplentes: a.suplentes.filter((id) => sinOtrosPorteros.some((j) => j.id === id)) }, conEstrellita, new Set(), p);
    expect(ajustada.titulares.find((x) => x.casillaId === 'POR')!.jugadorId).toBe(t.jugadorId);
  });
});

describe('Fatigado e Indisciplinado', () => {
  it('se cambian con menos cansancio que el resto', () => {
    expect(umbralCansancioDe({ defectos: [] }, 0.28)).toBe(0.28);
    expect(umbralCansancioDe({ defectos: ['Fatigado'] }, 0.28)).toBeCloseTo(0.28 * FACTOR_UMBRAL_CANSANCIO);
    expect(umbralCansancioDe({ defectos: ['Indisciplinado'] }, 0.28)).toBeCloseTo(0.28 * FACTOR_UMBRAL_CANSANCIO);
  });
});

describe('Revulsivo', () => {
  it('se reserva en el banquillo si hay un titular alternativo casi igual de bueno', () => {
    // Plantilla uniforme: cada alternativa de la misma posición es igual de buena.
    const base = plantilla(80).map((j) => jugador(j.posicion[0]!, 80));
    const a = decidirAlineacion('avanzado', base, new Set(), null, semillaDesdeTexto('revulsivo'), { parametros: p });
    const enOnce = new Set(a.titulares.map((t) => t.jugadorId));
    const posicionDe = (id: number) => base.find((j) => j.id === id)!.posicion[0];
    // Un titular con otro jugador de su misma posición fuera del once.
    const titular = a.titulares.find((t) => t.casillaId !== 'POR' && base.some((o) => !enOnce.has(o.id) && o.posicion[0] === posicionDe(t.jugadorId)))!.jugadorId;
    const conRevulsivo = base.map((j) => (j.id === titular ? { ...j, virtudes: [...j.virtudes, 'Revulsivo' as const] } : j));
    const ajustada = ajustarAlineacionPorRasgos(a, conRevulsivo, new Set(), p);
    expect(ajustada.titulares.map((t) => t.jugadorId)).not.toContain(titular);
    expect(ajustada.suplentes[0]).toBe(titular);
  });

  it('entra en el descanso por el jugador de su demarcación con menos media', () => {
    const local = equipo('local');
    local.suplentes[5] = { ...local.suplentes[5]!, virtudes: ['Revulsivo'] };
    const e = avanzar(crearPartido(entrada('revulsivo-ia', { version: p.version, parametros: p, local })), 'parte').estado;
    expect(e.fase).toBe('descanso');
    const r = revulsivoParaEntrar(e, 'local', new Set());
    expect(r?.entra.id).toBe(local.suplentes[5]!.id);
    expect(r?.sale.jugador.demarcacion).toBe(local.suplentes[5]!.demarcacion);
    expect(revulsivoParaEntrar(e, 'local', new Set([local.suplentes[5]!.id]))).toBeNull();
  });
});
