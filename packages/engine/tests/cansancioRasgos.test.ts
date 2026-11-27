/**
 * Rasgos que cambian la energía (spec 018, FR-013 a FR-016, FR-050): Incansable, Fatigado, Indisciplinado y Motivador,
 * con el jugador de referencia (ritmo ×1 y acciones medias).
 */
import type { Defecto, Virtud } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { recuperarEnPausa } from '../src/modificadores/cansancio';
import type { EstadoMotor } from '../src/index';
import { ponerRasgos, titularEn } from './ayudas';
import { accionesUnitarias, jugarHasta } from './ayudasFatiga';
import { conParametros, partido4 } from './ayudasRasgos';

const REFERENCIA = conParametros((x) => {
  accionesUnitarias(x);
  x.fatiga.ritmoRol.medio = 1;
});
const CON_ACCIONES = conParametros(accionesUnitarias);

function conRasgos(semilla: string, rasgos: { virtudes?: Virtud[]; defectos?: Defecto[] }, q = REFERENCIA): EstadoMotor {
  const e = partido4(semilla, q);
  ponerRasgos(titularEn(e, 'local', 'MC-1'), rasgos);
  return e;
}

const mc1 = (e: EstadoMotor) => titularEn(e, 'local', 'MC-1');
const mc2 = (e: EstadoMotor) => titularEn(e, 'local', 'MC-2');

describe('Incansable, Fatigado e Indisciplinado (FR-013 a FR-015)', () => {
  it('Incansable llega al 90\' con 75', () => {
    const e = conRasgos('incansable', { virtudes: ['Incansable'] });
    jugarHasta(e, 90, 1);
    expect(mc1(e).energia).toBeCloseTo(75, 6);
  });

  it('Fatigado llega al 90\' con 45 y ya no empieza antes', () => {
    const e = conRasgos('fatigado', { defectos: ['Fatigado'] });
    jugarHasta(e, 30, 1);
    expect(mc1(e).energia).toBe(100);
  });

  it('Fatigado: valor exacto al 90\'', () => {
    const e = conRasgos('fatigado-90', { defectos: ['Fatigado'] });
    jugarHasta(e, 90, 1);
    expect(mc1(e).energia).toBeCloseTo(45, 6);
  });

  it('Indisciplinado empieza en el 25\' y en el 50\' y llega al 90\' con 44', () => {
    const antes = conRasgos('indisciplinado-25', { defectos: ['Indisciplinado'] });
    jugarHasta(antes, 25, 1);
    expect(mc1(antes).energia).toBe(100);
    const despues = conRasgos('indisciplinado-26', { defectos: ['Indisciplinado'] });
    jugarHasta(despues, 26, 1);
    expect(mc1(despues).energia).toBeLessThan(100);
    const e = conRasgos('indisciplinado', { defectos: ['Indisciplinado'] });
    jugarHasta(e, 90, 1);
    expect(mc1(e).energia).toBeCloseTo(44, 6);
  });

  it('un medio Fatigado e Indisciplinado llega al 90\' con unos 7', () => {
    const e = conRasgos('pareja', { defectos: ['Fatigado', 'Indisciplinado'] }, CON_ACCIONES);
    jugarHasta(e, 90, 1);
    expect(mc1(e).energia).toBeCloseTo(7.04, 6);
  });
});

describe('Motivador (FR-016)', () => {
  it('sus compañeros llegan al 90\' con 66,75; él, sin otro Motivador, con 60', () => {
    const e = conRasgos('motivador', { virtudes: ['Motivador'] });
    jugarHasta(e, 90, 1);
    expect(mc2(e).energia).toBeGreaterThan(0);
    const companero = partido4('motivador-2', conParametros((x) => {
      accionesUnitarias(x);
      x.fatiga.ritmoRol.medio = 1;
    }));
    ponerRasgos(titularEn(companero, 'local', 'DC'), { virtudes: ['Motivador'] });
    jugarHasta(companero, 90, 1);
    expect(mc1(companero).energia).toBeCloseTo(66.75, 6);
    expect(mc1(e).energia).toBeCloseTo(60, 6);
  });

  it('dos Motivadores no acumulan: cada uno se beneficia del otro una sola vez', () => {
    const e = partido4('dos', REFERENCIA);
    ponerRasgos(mc1(e), { virtudes: ['Motivador'] });
    ponerRasgos(mc2(e), { virtudes: ['Motivador'] });
    ponerRasgos(titularEn(e, 'local', 'DC'), { virtudes: ['Motivador'] });
    jugarHasta(e, 90, 1);
    expect(mc1(e).energia).toBeCloseTo(66.75, 6);
    expect(mc2(e).energia).toBeCloseTo(66.75, 6);
  });

  it('+15 solo en el descanso del partido, y si estaba en el campo al pitarse', () => {
    const e = partido4('recupera', REFERENCIA);
    const motivador = ponerRasgos(titularEn(e, 'local', 'DC'), { virtudes: ['Motivador'] });
    mc1(e).energia = 50;
    recuperarEnPausa(e, 'descanso');
    expect(mc1(e).energia).toBe(65);
    recuperarEnPausa(e, 'preProrroga');
    expect(mc1(e).energia).toBe(70);
    recuperarEnPausa(e, 'descansoProrroga');
    expect(mc1(e).energia).toBe(75);
    motivador.enCampo = false;
    mc1(e).energia = 50;
    recuperarEnPausa(e, 'descanso');
    expect(mc1(e).energia).toBe(60);
  });

  it('no se aplica el +15 a sí mismo', () => {
    const e = conRasgos('propio', { virtudes: ['Motivador'] });
    mc1(e).energia = 50;
    recuperarEnPausa(e, 'descanso');
    expect(mc1(e).energia).toBe(60);
  });

  it('un suplente no recupera en el descanso', () => {
    const e = partido4('suplente', REFERENCIA);
    const suplente = e.equipos.local.jugadores.find((j) => !j.enCampo)!;
    suplente.energia = 50;
    recuperarEnPausa(e, 'descanso');
    expect(suplente.energia).toBe(50);
  });
});
