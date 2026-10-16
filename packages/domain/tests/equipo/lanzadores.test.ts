import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { validarAlineacion } from '../../src/equipo/alineacion';
import { autoAlineacion } from '../../src/equipo/autoAlineacion';
import { casilla } from '../../src/equipo/formaciones';
import { lanzadorEfectivo, proponerLanzadores } from '../../src/equipo/lanzadores';
import { statsEfectivos } from '../../src/equipo/statsEfectivos';
import { PARAMETROS_V1 } from '../../src/parametros/index';
import { Rng, semillaDesdeTexto } from '../../src/rng/xoshiro';
import { catalogoCore, jugador, plantillaEquilibrada } from './ayudas';

describe('lanzadores (FR-029a)', () => {
  const titulares = [
    jugador('POR', ['POR'], 80),
    jugador('DEL', ['DC'], 70, ['LanzadorPenalties'], { finalizacion: 70 }),
    jugador('DEL', ['EI'], 85, [], { finalizacion: 92, creatividad: 88 }),
    jugador('MED', ['MCO'], 84, ['LanzadorFaltas'], { disparo: 80 }),
    jugador('DEL', ['ED'], 80, ['GuanteEnElPie'], { creatividad: 75 }),
    jugador('MED', ['MC'], 82, [], { disparo: 85, pase: 90 }),
    jugador('DEF', ['DCI'], 80),
  ];

  it('propone al titular con el special correspondiente', () => {
    const l = proponerLanzadores(titulares);
    expect(l.penaltis).toBe(titulares[1]!.id);
    expect(l.faltas).toBe(titulares[3]!.id);
    expect(l.corners).toBe(titulares[4]!.id);
  });

  it('sin special, propone al de mejor valor para esa acción', () => {
    const sin = titulares.map((j) => ({ ...j, specials: [] }));
    const l = proponerLanzadores(sin);
    expect(l.penaltis).toBe(titulares[2]!.id); // finalización 92
    expect(l.corners).toBe(titulares[5]!.id); // pase 90
  });

  it('la tanda tiene 5 titulares distintos, empezando por el lanzador de penaltis', () => {
    const l = proponerLanzadores(titulares);
    expect(new Set(l.tanda).size).toBe(5);
    expect(l.tanda[0]).toBe(l.penaltis);
    expect(l.tanda.every((id) => titulares.some((j) => j.id === id))).toBe(true);
  });

  it('si el designado no está en el campo, lanza el siguiente mejor', () => {
    const l = proponerLanzadores(titulares);
    const enCampo = titulares.filter((j) => j.id !== l.penaltis);
    expect(lanzadorEfectivo(l.penaltis, enCampo, 'penaltis')).toBe(titulares[2]!.id);
    expect(lanzadorEfectivo(l.penaltis, titulares, 'penaltis')).toBe(l.penaltis);
  });
});

describe('autoAlineacion (FR-031)', () => {
  it('con una plantilla equilibrada no deja a nadie fuera de posición y pone un portero', () => {
    const plantilla = plantillaEquilibrada();
    const a = autoAlineacion(plantilla, new Set(), PARAMETROS_V1);
    const porId = new Map(plantilla.map((j) => [j.id, j]));
    const fuera = a.titulares.filter((t) => statsEfectivos(porId.get(t.jugadorId)!, casilla(a.formacion, t.casillaId)!, PARAMETROS_V1).fueraDePosicion);
    expect(fuera).toHaveLength(0);
    expect(porId.get(a.titulares.find((t) => t.casillaId === 'POR')!.jugadorId)!.demarcacion).toBe('POR');
    expect(a.suplentes).toHaveLength(7);
    expect(a.suplentes.some((id) => porId.get(id)!.demarcacion === 'POR')).toBe(true);
  });

  it('siempre es válida con plantillas de 24 del draft real, aunque haya bajas', () => {
    const core = catalogoCore();
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.integer({ min: 0, max: 15 }), (texto, numBajas) => {
        const rng = new Rng(semillaDesdeTexto(texto));
        const plantilla = rng.barajar(core).slice(0, 24);
        const bajas = new Set(rng.barajar(plantilla.map((j) => j.id)).slice(0, numBajas));
        const a = autoAlineacion(plantilla, bajas, PARAMETROS_V1);
        expect(validarAlineacion(a, plantilla.map((j) => j.id), bajas)).toEqual([]);
        expect(a.titulares).toHaveLength(Math.min(11, 24 - numBajas));
      }),
      { numRuns: 60 },
    );
  });

  it('sin porteros, coloca a un jugador de campo en la portería', () => {
    const plantilla = plantillaEquilibrada().filter((j) => j.demarcacion !== 'POR');
    const a = autoAlineacion(plantilla, new Set(), PARAMETROS_V1);
    expect(a.titulares.some((t) => t.casillaId === 'POR')).toBe(true);
  });
});
