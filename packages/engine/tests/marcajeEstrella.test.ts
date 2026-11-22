/**
 * Estrella y marcador con marcaje Individual (spec 018, FR-025 a FR-028, R11): elección determinista, −5 a la estrella en
 * sus duelos contra él, +6 de marcaje en el desmarque y final sin nueva elección.
 */
import { aplicarDecision, avanzar, type EstadoMotor, type JugadorEnPartido } from '../src/index';
import { tacticaPorDefecto, type Tactica } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { sustituir } from '../src/acciones/plantel';
import { calcularObjetivos } from '../src/espacio/objetivos';
import { ajusteEstrella, elegirMarcaje, fijarMarcajes, valoresDesmarque } from '../src/modificadores/marcajeEstrella';
import { ajusteDuelo } from '../src/modificadores/virtudes';
import { atributo } from '../src/modificadores/atributos';
import { contextoDe, darBalon, equipo, partido, situar, titularEn } from './ayudas';
import { accionesUnitarias, jugarHasta } from './ayudasFatiga';
import { conParametros } from './ayudasRasgos';

const IND: Partial<Tactica> = { sistemaDefensivo: 'individual' };
/** El local marca en individual al visitante. */
const conIndividual = (semilla: string) => partido(semilla, { local: equipo('local', { tactica: IND }) });

function conStats(j: JugadorEnPartido, stats: Record<string, number>): void {
  j.jugador = { ...j.jugador, stats: { ...j.jugador.stats, ...stats } as typeof j.jugador.stats };
}

describe('elección (FR-026)', () => {
  it('se fija al empezar: la estrella es el rival de campo de mayor media y el marcador, el defensa con más marcaje', () => {
    const e = partido('eleccion', { local: equipo('local'), visitante: equipo('visitante') });
    e.equipos.local.tactica = { ...e.equipos.local.tactica, ...IND };
    const estrella = titularEn(e, 'visitante', 'MC-1');
    conStats(estrella, { pase: 99, vision: 99, tecnica: 99, disparo: 99, velocidad: 99, posicionamiento: 99 });
    const marcador = titularEn(e, 'local', 'DCD');
    conStats(marcador, { marcaje: 97 });
    expect(elegirMarcaje(e, e.equipos.local)).toEqual({ estrellaId: estrella.id, marcadorId: marcador.id, activo: true });
  });

  it('con Individual desde el inicio la pareja ya está fijada', () => {
    const e = conIndividual('inicio');
    expect(e.equipos.local.marcajeEstrella?.activo).toBe(true);
    expect(e.equipos.visitante.marcajeEstrella ?? null).toBeNull();
  });

  it('los empates se resuelven por el id menor', () => {
    const e = conIndividual('empates');
    const m = elegirMarcaje(e, e.equipos.local)!;
    const rivales = e.equipos.visitante.jugadores.filter((j) => j.enCampo && j.casillaId !== 'POR');
    const defensas = ['LI', 'DCI', 'DCD', 'LD'].map((c) => titularEn(e, 'local', c).id);
    expect(m.estrellaId).toBe(Math.min(...rivales.map((j) => j.id)));
    expect(m.marcadorId).toBe(Math.min(...defensas));
  });

  it('el portero no puede ser la estrella aunque tenga la mayor media', () => {
    const e = conIndividual('portero');
    const arquero = titularEn(e, 'visitante', 'POR');
    conStats(arquero, { agilidad: 99, colocacion: 99, distribucion: 99, aereo: 99, defensa: 99, liderazgo: 99 });
    expect(elegirMarcaje(e, e.equipos.local)!.estrellaId).not.toBe(arquero.id);
  });

  it('sin defensas el marcador es un medio; sin medios, un delantero', () => {
    const e = conIndividual('lineas');
    const sacar = (cs: string[]) => cs.forEach((c) => (titularEn(e, 'local', c).enCampo = false));
    const mediosIds = ['MII', 'MC-1', 'MC-2', 'MID'].map((c) => e.equipos.local.jugadores.find((j) => j.casillaId === c)?.id).filter((x): x is number => x !== undefined);
    sacar(['LI', 'DCI', 'DCD', 'LD']);
    expect(mediosIds).toContain(elegirMarcaje(e, e.equipos.local)!.marcadorId);
    for (const j of e.equipos.local.jugadores) if (mediosIds.includes(j.id)) j.enCampo = false;
    const delanteros = e.equipos.local.jugadores.filter((j) => j.enCampo && j.casillaId !== 'POR').map((j) => j.id);
    expect(delanteros).toContain(elegirMarcaje(e, e.equipos.local)!.marcadorId);
  });

  it('sin jugadores de campo no hay pareja', () => {
    const e = conIndividual('vacio');
    for (const j of e.equipos.visitante.jugadores) if (j.casillaId !== 'POR') j.enCampo = false;
    expect(elegirMarcaje(e, e.equipos.local)).toBeNull();
  });
});

describe('efectos (FR-025, FR-026)', () => {
  function pareja(semilla: string) {
    const e = conIndividual(semilla);
    const m = e.equipos.local.marcajeEstrella!;
    const estrella = e.equipos.visitante.jugadores.find((j) => j.id === m.estrellaId)!;
    const marcador = e.equipos.local.jugadores.find((j) => j.id === m.marcadorId)!;
    const otro = e.equipos.local.jugadores.find((j) => j.enCampo && j.casillaId !== 'POR' && j.id !== marcador.id)!;
    return { e, estrella, marcador, otro };
  }

  it('−5 a la estrella en cualquier sentido, solo contra su marcador', () => {
    const { e, estrella, marcador, otro } = pareja('malus');
    expect(ajusteEstrella(e, estrella, marcador)).toEqual({ atacante: -5, defensor: 0 });
    expect(ajusteEstrella(e, marcador, estrella)).toEqual({ atacante: 0, defensor: -5 });
    expect(ajusteEstrella(e, estrella, otro)).toEqual({ atacante: 0, defensor: 0 });
  });

  it('el −5 entra en los duelos', () => {
    const { e, estrella, marcador } = pareja('duelo');
    situar(e, marcador.id, { x: 5000, y: 3200 });
    expect(ajusteDuelo(e, estrella, marcador).atacante).toBe(-5);
  });

  it('+6 de marcaje en el desmarque, y −5 si el receptor es la estrella y le marca su marcador', () => {
    const { e, estrella, marcador, otro } = pareja('desmarque');
    const v = valoresDesmarque(e, e.equipos.visitante, e.equipos.local, estrella, marcador);
    expect(v.desmarque).toBeCloseTo(atributo(e, e.equipos.visitante, estrella, 'desmarque') - 5, 9);
    expect(v.marcaje).toBeCloseTo(atributo(e, e.equipos.local, marcador, 'marcaje') + 6, 9);
    const w = valoresDesmarque(e, e.equipos.visitante, e.equipos.local, estrella, otro);
    expect(w.desmarque).toBeCloseTo(atributo(e, e.equipos.visitante, estrella, 'desmarque'), 9);
    expect(w.marcaje).toBeCloseTo(atributo(e, e.equipos.local, otro, 'marcaje') + 6, 9);
  });

  it('sin Individual no hay +6', () => {
    const e = partido('sin');
    const a = titularEn(e, 'visitante', 'DC');
    const d = titularEn(e, 'local', 'DCI');
    expect(valoresDesmarque(e, e.equipos.visitante, e.equipos.local, a, d).marcaje).toBeCloseTo(atributo(e, e.equipos.local, d, 'marcaje'), 9);
  });

  it('el marcador sigue a la estrella', () => {
    const { e, estrella, marcador } = pareja('sigue');
    const portador = titularEn(e, 'visitante', 'POR');
    darBalon(e, 'visitante', portador, 0);
    // Lejos de su sitio: sin la pareja, nadie le seguiría hasta allí.
    situar(e, estrella.id, { x: 2000, y: 700 });
    situar(e, marcador.id, { x: 1000, y: 3200 });
    const o = calcularObjetivos(e)[marcador.id]!;
    const sinMarcar = calcularObjetivos({ ...e, equipos: { ...e.equipos, local: { ...e.equipos.local, marcajeEstrella: null } } })[marcador.id]!;
    const p = e.espacio.jugadores[estrella.id]!;
    expect(Math.hypot(o.x - p.x, o.y - p.y)).toBeLessThan(Math.hypot(sinMarcar.x - p.x, sinMarcar.y - p.y));
  });
});

describe('final y suspensión (FR-026, R11)', () => {
  const salir = (e: EstadoMotor, lado: 'local' | 'visitante', id: number) => {
    const eq = e.equipos[lado];
    const sale = eq.jugadores.find((j) => j.id === id)!;
    const entra = eq.jugadores.find((j) => !j.enCampo && !j.retirado)!;
    sustituir(contextoDe(e), eq, sale, entra);
  };

  it('si sale la estrella termina el marcaje, sin nueva elección', () => {
    const e = conIndividual('sale-estrella');
    const antes = { ...e.equipos.local.marcajeEstrella! };
    salir(e, 'visitante', antes.estrellaId);
    expect(e.equipos.local.marcajeEstrella).toEqual({ ...antes, activo: false });
    fijarMarcajes(e);
    expect(e.equipos.local.marcajeEstrella).toEqual({ ...antes, activo: false });
  });

  it('si sale el marcador termina también, y la estrella deja de tener el −5', () => {
    const e = conIndividual('sale-marcador');
    const m = { ...e.equipos.local.marcajeEstrella! };
    const estrella = e.equipos.visitante.jugadores.find((j) => j.id === m.estrellaId)!;
    const marcador = e.equipos.local.jugadores.find((j) => j.id === m.marcadorId)!;
    salir(e, 'local', m.marcadorId);
    expect(e.equipos.local.marcajeEstrella!.activo).toBe(false);
    expect(ajusteEstrella(e, estrella, marcador)).toEqual({ atacante: 0, defensor: 0 });
  });

  it('al dejar Individual se suspende y al volver sigue la misma pareja', () => {
    const e = conIndividual('suspende');
    const m = { ...e.equipos.local.marcajeEstrella! };
    const estrella = e.equipos.visitante.jugadores.find((j) => j.id === m.estrellaId)!;
    const marcador = e.equipos.local.jugadores.find((j) => j.id === m.marcadorId)!;
    e.equipos.local.tactica = tacticaPorDefecto();
    expect(ajusteEstrella(e, estrella, marcador)).toEqual({ atacante: 0, defensor: 0 });
    e.equipos.local.tactica = { ...tacticaPorDefecto(), ...IND };
    fijarMarcajes(e);
    expect(e.equipos.local.marcajeEstrella).toEqual(m);
    expect(ajusteEstrella(e, estrella, marcador)).toEqual({ atacante: -5, defensor: 0 });
  });

  it('si se activa a mitad de partido, la pareja se elige entonces', () => {
    const inicio = partido('tarde');
    expect(inicio.equipos.local.marcajeEstrella ?? null).toBeNull();
    const descanso = avanzar(inicio, 'parte').estado;
    aplicarDecision(descanso, { participanteId: 'local', tipo: 'tactica', datos: { tactica: { ...tacticaPorDefecto(), ...IND } } });
    const siguiente = avanzar(descanso, 'interrupcion').estado;
    expect(siguiente.equipos.local.marcajeEstrella?.estrellaId).toBeDefined();
  }, 60_000);
});

describe('coste de energía (FR-018)', () => {
  const q = conParametros((x) => {
    accionesUnitarias(x);
    x.fatiga.ritmoRol.defensa = 1;
  });

  it('el equipo llega al 90\' con 57,5 y el marcador con 49,6', () => {
    const e = partido('coste', { version: q.version, parametros: q, local: equipo('local', { tactica: IND }) });
    const m = e.equipos.local.marcajeEstrella!;
    const defensa = ['LI', 'DCI', 'DCD', 'LD'].map((c) => titularEn(e, 'local', c)).find((j) => j.id !== m.marcadorId)!;
    const marcador = e.equipos.local.jugadores.find((j) => j.id === m.marcadorId)!;
    jugarHasta(e, 90, 1);
    expect(defensa.energia).toBeCloseTo(57.5, 6);
    expect(marcador.energia).toBeCloseTo(49.625, 6);
  });

  it('sin marcaje en curso, el marcador vuelve al ritmo del equipo', () => {
    const e = partido('coste-fin', { version: q.version, parametros: q, local: equipo('local', { tactica: IND }) });
    const m = e.equipos.local.marcajeEstrella!;
    const marcador = e.equipos.local.jugadores.find((j) => j.id === m.marcadorId)!;
    m.activo = false;
    jugarHasta(e, 90, 1);
    expect(marcador.energia).toBeCloseTo(57.5, 6);
  });
});
