/**
 * Acciones intensas (spec 018, FR-008, FR-009, FR-017, R4): se cuentan con reglas deterministas, sin PRNG, solo dentro de
 * un tramo; sprint y presión al entrar, cada regate y cada duelo para los implicados.
 */
import { describe, expect, it } from 'vitest';
import { paso } from '../src/acciones/juego';
import { anotarAereo } from '../src/acciones/tiro';
import { calcularObjetivos } from '../src/espacio/objetivos';
import { moverJugadores } from '../src/espacio/movimiento';
import { gastarAccion } from '../src/modificadores/cansancio';
import type { EstadoMotor } from '../src/index';
import type { Metricas } from '../src/metricas';
import { contextoDe, darBalon, ponerRasgos, situar, titularEn } from './ayudas';
import { accionesUnitarias, jugarHasta } from './ayudasFatiga';
import { conParametros, partido4 } from './ayudasRasgos';

/** Solo gastan las acciones, a 1 punto de energía × ritmo por acción. */
const SOLO_ACCIONES = conParametros((x) => {
  accionesUnitarias(x);
  x.fatiga.reparto = { rol: 0, acciones: 1 };
});

const enTramo = (e: EstadoMotor) => {
  e.reloj = { parte: 1, segundosEnParte: 35 * 60, paradas: 0, descuento: null };
};
const RITMO_MEDIO = SOLO_ACCIONES.fatiga.ritmoRol.medio;

describe('gasto por acción', () => {
  it('fuera de un tramo no gasta', () => {
    const e = partido4('fuera', SOLO_ACCIONES);
    e.reloj = { parte: 1, segundosEnParte: 10 * 60, paradas: 0, descuento: null };
    const j = titularEn(e, 'local', 'MC-1');
    gastarAccion(e, e.equipos.local, j, 'duelo');
    expect(j.energia).toBe(100);
  });

  it('dentro de un tramo gasta ritmo × parte de acciones × peso / referencia', () => {
    const q = conParametros((x) => {
      accionesUnitarias(x);
      x.fatiga.pesosAccion.regate = 3;
      x.fatiga.referenciaAcciones.medio = 4;
    });
    const e = partido4('dentro', q);
    enTramo(e);
    const j = titularEn(e, 'local', 'MC-1');
    gastarAccion(e, e.equipos.local, j, 'regate');
    expect(100 - j.energia).toBeCloseTo((1.2 * 0.2 * 3) / 4, 9);
  });

  it('a Indisciplinado cada acción le cuesta ×1,5', () => {
    const e = partido4('indisciplinado', SOLO_ACCIONES);
    enTramo(e);
    const j = ponerRasgos(titularEn(e, 'local', 'MC-1'), { defectos: ['Indisciplinado'] });
    gastarAccion(e, e.equipos.local, j, 'duelo');
    expect(100 - j.energia).toBeCloseTo(RITMO_MEDIO * 1.5, 9);
  });

  it('más acciones que la referencia dan menos energía y menos acciones, más', () => {
    const energia = (porMinuto: number) => {
      const e = partido4(`ref-${porMinuto}`, conParametros(accionesUnitarias));
      jugarHasta(e, 90, porMinuto);
      return titularEn(e, 'local', 'MC-1').energia;
    };
    expect(energia(2)).toBeLessThan(energia(1));
    expect(energia(0)).toBeGreaterThan(energia(1));
    expect(energia(1)).toBeCloseTo(50, 6);
  });
});

describe('qué se cuenta (R4)', () => {
  it('el sprint cuenta al entrar, no en cada paso', () => {
    const e = partido4('sprint', SOLO_ACCIONES);
    enTramo(e);
    const j = titularEn(e, 'local', 'MC-1');
    situar(e, j.id, { x: 1000, y: 3200 });
    e.espacio.objetivos = { [j.id]: { x: 9000, y: 3200 } };
    for (let i = 0; i < 12; i++) {
      e.tick += 2;
      moverJugadores(e);
    }
    expect(e.espacio.jugadores[j.id]!.sprint).toBe(true);
    expect(100 - j.energia).toBeCloseTo(RITMO_MEDIO, 9);
  });

  it('la presión cuenta al entrar en la lista de presionadores', () => {
    const e = partido4('presion', SOLO_ACCIONES);
    enTramo(e);
    const portador = titularEn(e, 'visitante', 'DC');
    const defensa = titularEn(e, 'local', 'DCI');
    situar(e, portador.id, { x: 8000, y: 3200 });
    situar(e, defensa.id, { x: 2100, y: 3200 });
    darBalon(e, 'visitante', portador, 4);
    calcularObjetivos(e);
    expect(e.espacio.presion.presionadores).toContain(defensa.id);
    const tras1 = defensa.energia;
    expect(tras1).toBeLessThan(100);
    calcularObjetivos(e);
    expect(defensa.energia).toBe(tras1);
  });

  it('un duelo aéreo gasta a los dos implicados', () => {
    const e = partido4('aereo', SOLO_ACCIONES);
    enTramo(e);
    const a = titularEn(e, 'local', 'DC');
    const d = titularEn(e, 'visitante', 'DCI');
    anotarAereo(contextoDe(e), a, d, true);
    expect(100 - a.energia).toBeCloseTo(SOLO_ACCIONES.fatiga.ritmoRol.ataque, 9);
    expect(100 - d.energia).toBeCloseTo(SOLO_ACCIONES.fatiga.ritmoRol.defensa, 9);
  });

  it('un regate cuesta regate + duelo al portador y duelo al rival', () => {
    const q = conParametros((x) => {
      accionesUnitarias(x);
      x.fatiga.reparto = { rol: 0, acciones: 1 };
      x.fatiga.pesosAccion = { sprint: 0, presion: 0, regate: 2, duelo: 1 };
    });
    let probados = 0;
    for (let i = 0; i < 400 && probados < 5; i++) {
      const e = partido4(`regate-${i}`, q);
      enTramo(e);
      const portador = titularEn(e, 'local', 'DC');
      const rival = titularEn(e, 'visitante', 'DCI');
      situar(e, portador.id, { x: 7000, y: 3200 });
      situar(e, rival.id, { x: 10000 - 7100, y: 3200 });
      darBalon(e, 'local', portador, 3);
      const metricas: Metricas = {};
      const ctx = { ...contextoDe(e, `regate-${i}`), metricas };
      paso(ctx);
      if (metricas[portador.id]?.regates !== 1 || metricas[rival.id]?.entradas !== 1) continue;
      probados++;
      expect(100 - portador.energia).toBeCloseTo(q.fatiga.ritmoRol.ataque * 3, 6);
      expect(100 - rival.energia).toBeCloseTo(q.fatiga.ritmoRol.defensa, 6);
    }
    expect(probados).toBeGreaterThan(0);
  });

  it('contar acciones no consume PRNG', () => {
    const e = partido4('prng', SOLO_ACCIONES);
    enTramo(e);
    const antes = structuredClone(e.rng);
    const a = titularEn(e, 'local', 'DC');
    const d = titularEn(e, 'visitante', 'DCI');
    gastarAccion(e, e.equipos.local, a, 'sprint');
    anotarAereo(contextoDe(e), a, d, false);
    calcularObjetivos(e);
    moverJugadores(e);
    expect(e.rng).toEqual(antes);
  });
});
