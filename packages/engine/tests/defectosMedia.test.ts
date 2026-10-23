/**
 * Defectos que cambian la media (spec 005, T039; FR-014 a FR-016, FR-042; research R6): Polémico, Rebelde, Estrellita
 * y Provocador, con su efecto en los atributos del motor.
 */
import { describe, expect, it } from 'vitest';
import { atributo } from '../src/modificadores/atributos';
import { bonusProvocador, multiplicadorEquipo, multiplicadorIndividual } from '../src/modificadores/defectos';
import { ponerRasgos, titularEn } from './ayudas';
import { P4, partido4 } from './ayudasRasgos';

const d = P4.defectos!;

describe('Polémico', () => {
  it('× 0,95 a todo el once solo yendo por detrás; se recupera al empatar', () => {
    const e = partido4('polemico');
    const eq = e.equipos.local;
    ponerRasgos(titularEn(e, 'local', 'MC-1'), { defectos: ['Polemico'] });
    expect(multiplicadorEquipo(e, eq)).toBe(1);
    e.marcador = { local: 0, visitante: 1 };
    expect(multiplicadorEquipo(e, eq)).toBeCloseTo(1 - d.polemico);
    e.marcador = { local: 1, visitante: 1 };
    expect(multiplicadorEquipo(e, eq)).toBe(1);
  });

  it('dos Polémicos no acumulan', () => {
    const e = partido4('polemicos');
    ponerRasgos(titularEn(e, 'local', 'MC-1'), { defectos: ['Polemico'] });
    ponerRasgos(titularEn(e, 'local', 'MC-2'), { defectos: ['Polemico'] });
    e.marcador = { local: 0, visitante: 2 };
    expect(multiplicadorEquipo(e, e.equipos.local)).toBeCloseTo(1 - d.polemico);
  });

  it('un Polémico en el banquillo no cuenta', () => {
    const e = partido4('polemico-banquillo');
    ponerRasgos(e.equipos.local.jugadores.find((j) => !j.enCampo)!, { defectos: ['Polemico'] });
    e.marcador = { local: 0, visitante: 1 };
    expect(multiplicadorEquipo(e, e.equipos.local)).toBe(1);
  });

  it('baja los atributos de todo el once', () => {
    // Los rasgos no cambian durante un partido: la referencia sale de otro partido igual sin el Polémico.
    const sin = partido4('polemico-atributo');
    const antes = atributo(sin, sin.equipos.local, titularEn(sin, 'local', 'DC'), 'remate');
    const e = partido4('polemico-atributo');
    const eq = e.equipos.local;
    const dc = titularEn(e, 'local', 'DC');
    ponerRasgos(titularEn(e, 'local', 'MC-1'), { defectos: ['Polemico'] });
    e.marcador = { local: 0, visitante: 1 };
    expect(atributo(e, eq, dc, 'remate')).toBeCloseTo(antes * (1 - d.polemico));
  });
});

describe('Rebelde', () => {
  it('× 0,95 mientras está convocado en el banquillo; desaparece al entrar', () => {
    const e = partido4('rebelde');
    const eq = e.equipos.local;
    const rebelde = ponerRasgos(eq.jugadores.find((j) => !j.enCampo)!, { defectos: ['Rebelde'] });
    expect(multiplicadorEquipo(e, eq)).toBeCloseTo(1 - d.rebelde);
    rebelde.enCampo = true;
    expect(multiplicadorEquipo(e, eq)).toBe(1);
  });

  it.each(['retirado', 'expulsado', 'lesionado'] as const)('no se aplica si está %s', (estado) => {
    const e = partido4(`rebelde-${estado}`);
    const rebelde = ponerRasgos(e.equipos.local.jugadores.find((j) => !j.enCampo)!, { defectos: ['Rebelde'] });
    rebelde[estado] = true;
    expect(multiplicadorEquipo(e, e.equipos.local)).toBe(1);
  });

  it('Polémico y Rebelde juntos se multiplican (0,95 × 0,95)', () => {
    const e = partido4('rebelde-polemico');
    const eq = e.equipos.local;
    ponerRasgos(eq.jugadores.find((j) => !j.enCampo)!, { defectos: ['Rebelde'] });
    ponerRasgos(titularEn(e, 'local', 'MC-1'), { defectos: ['Polemico'] });
    e.marcador = { local: 0, visitante: 1 };
    expect(multiplicadorEquipo(e, eq)).toBeCloseTo((1 - d.polemico) * (1 - d.rebelde));
  });
});

describe('Estrellita', () => {
  it('× 0,90 si no es la mejor media efectiva de su equipo en el campo', () => {
    const e = partido4('estrellita');
    const eq = e.equipos.local;
    const estrellita = ponerRasgos(titularEn(e, 'local', 'DC'), { defectos: ['Estrellita'] });
    const otro = titularEn(e, 'local', 'SD');
    otro.jugador = { ...otro.jugador, stats: Object.fromEntries(Object.keys(otro.jugador.stats).map((k) => [k, 95])) as typeof otro.jugador.stats };
    expect(multiplicadorIndividual(e, eq, estrellita)).toBeCloseTo(1 - d.estrellita);
    expect(multiplicadorIndividual(e, eq, otro)).toBe(1);
  });

  it('con un empate en la mejor media no se aplica', () => {
    const e = partido4('estrellita-empate');
    // Todos los titulares de campo del equipo de prueba tienen la misma media (80).
    const estrellita = ponerRasgos(titularEn(e, 'local', 'DC'), { defectos: ['Estrellita'] });
    expect(multiplicadorIndividual(e, e.equipos.local, estrellita)).toBe(1);
  });

  it('con dos Estrellitas, solo se libra la mejor', () => {
    const e = partido4('estrellitas');
    const eq = e.equipos.local;
    const mejor = ponerRasgos(titularEn(e, 'local', 'DC'), { defectos: ['Estrellita'] });
    mejor.jugador = { ...mejor.jugador, stats: Object.fromEntries(Object.keys(mejor.jugador.stats).map((k) => [k, 95])) as typeof mejor.jugador.stats };
    const peor = ponerRasgos(titularEn(e, 'local', 'SD'), { defectos: ['Estrellita'] });
    expect(multiplicadorIndividual(e, eq, mejor)).toBe(1);
    expect(multiplicadorIndividual(e, eq, peor)).toBeCloseTo(1 - d.estrellita);
  });
});

describe('Provocador', () => {
  it('+1 a cada GOAT rival en el campo, una sola vez por equipo', () => {
    const e = partido4('provocador');
    const goat = titularEn(e, 'visitante', 'DC');
    goat.jugador = { ...goat.jugador, nivel: 'GOAT' };
    const normal = titularEn(e, 'visitante', 'SD');
    expect(bonusProvocador(e, e.equipos.visitante, goat)).toBe(0);
    ponerRasgos(titularEn(e, 'local', 'DCI'), { defectos: ['Provocador'] });
    ponerRasgos(titularEn(e, 'local', 'DCD'), { defectos: ['Provocador'] });
    expect(bonusProvocador(e, e.equipos.visitante, goat)).toBe(d.provocador);
    expect(bonusProvocador(e, e.equipos.visitante, normal)).toBe(0);
    const antes = atributo(partido4('provocador'), partido4('provocador').equipos.visitante, titularEn(partido4('provocador'), 'visitante', 'DC'), 'remate');
    expect(atributo(e, e.equipos.visitante, goat, 'remate')).toBeGreaterThan(antes);
  });
});
