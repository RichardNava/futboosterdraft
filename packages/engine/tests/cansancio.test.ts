/**
 * Energía de la 9.0.0 (spec 018, FR-005 a FR-012, SC-002): curva de referencia, ritmo por rol, reparto entre rol y
 * acciones, penalización por tramos y por tipo de stat, y `energiaDe` como única salida hacia la interfaz.
 */
import { describe, expect, it } from 'vitest';
import { atributo } from '../src/modificadores/atributos';
import { acumularCansancio, curvaEnergia, penalizacionFisicaDe, recuperarEnPausa } from '../src/modificadores/cansancio';
import { avanzar, crearPartido, energiaDe, type EstadoMotor } from '../src/index';
import { entrada, titularEn } from './ayudas';
import { accionesUnitarias, jugarHasta } from './ayudasFatiga';
import { conParametros, P4, partido4 } from './ayudasRasgos';

const CON_ACCIONES = conParametros(accionesUnitarias);
/** Un medio con ritmo ×1: el jugador de referencia de FR-006. */
const REFERENCIA = conParametros((x) => {
  accionesUnitarias(x);
  x.fatiga.ritmoRol.medio = 1;
});

const medio = (e: EstadoMotor) => titularEn(e, 'local', 'MC-1');

describe('curva del jugador de referencia (FR-006)', () => {
  it.each([
    [30, 100],
    [45, 85],
    [50, 95],
    [55, 95],
    [90, 60],
    [105, 50],
    [120, 40],
  ])('al minuto %i tiene %d de energía', (minuto, esperado) => {
    const e = partido4(`curva-${minuto}`, REFERENCIA);
    jugarHasta(e, minuto, 1);
    expect(medio(e).energia).toBeCloseTo(esperado, 6);
  });

  it('el tramo del 30\' al 45\' son exactamente 900 ticks (R3)', () => {
    const e = partido4('ticks', REFERENCIA);
    const j = medio(e);
    let gastan = 0;
    for (let s = 1; s <= 2700; s++) {
      e.reloj = { parte: 1, segundosEnParte: s, paradas: 0, descuento: null };
      const antes = j.energia;
      acumularCansancio(e, e.equipos.local, 1);
      if (j.energia < antes) gastan++;
    }
    expect(gastan).toBe(900);
  });

  it('antes de la prórroga +5 y en su descanso +5', () => {
    const e = partido4('prorroga', REFERENCIA);
    jugarHasta(e, 90, 1);
    recuperarEnPausa(e, 'preProrroga');
    expect(medio(e).energia).toBeCloseTo(65, 6);
    const f = partido4('prorroga-2', REFERENCIA);
    jugarHasta(f, 105, 1);
    recuperarEnPausa(f, 'descansoProrroga');
    expect(medio(f).energia).toBeCloseTo(55, 6);
  });

  it('el descuento gasta al ritmo del tramo en curso (FR-007)', () => {
    const e = partido4('descuento', REFERENCIA);
    jugarHasta(e, 45, 0);
    const antes = medio(e).energia;
    for (let s = 2701; s <= 2820; s++) {
      e.reloj = { parte: 1, segundosEnParte: s, paradas: 0, descuento: 120 };
      acumularCansancio(e, e.equipos.local, 1);
    }
    expect(antes - medio(e).energia).toBeCloseTo(2 * 0.8, 6);
  });
});

describe('ritmo por rol al 90\' (FR-010)', () => {
  const ROLES = [
    ['POR', 93, 94.4],
    ['DCI', 67.5, 76],
    ['MC-1', 50, 62],
    ['DC', 62.5, 72],
  ] as const;

  it.each(ROLES)('%s: %d con acciones medias', (casilla, conAcciones) => {
    const e = partido4(`rol-${casilla}`, CON_ACCIONES);
    jugarHasta(e, 90, 1);
    expect(titularEn(e, 'local', casilla).energia).toBeCloseTo(conAcciones, 6);
  });

  it.each(ROLES)('%s: sin ninguna acción solo gasta su 80 %%', (casilla, _con, sinAcciones) => {
    const e = partido4(`rol-sin-${casilla}`, CON_ACCIONES);
    jugarHasta(e, 90, 0);
    expect(titularEn(e, 'local', casilla).energia).toBeCloseTo(sinAcciones, 6);
  });

  it('un portero llega al descanso con 97 y sale con 100, no con 107', () => {
    const e = partido4('tope', CON_ACCIONES);
    jugarHasta(e, 45, 1);
    const portero = titularEn(e, 'local', 'POR');
    expect(portero.energia).toBeCloseTo(97, 6);
    recuperarEnPausa(e, 'descanso');
    expect(portero.energia).toBe(100);
  });

  it('el ritmo es el de la posición que ocupa, no el de su carta (FR-010a)', () => {
    const e = partido4('posicion', CON_ACCIONES);
    const j = medio(e);
    j.posicion = 'DC';
    jugarHasta(e, 45, 1);
    expect(j.energia).toBeCloseTo(100 - 15 * 0.95, 6);
  });

  it('la energía nunca baja de 0', () => {
    const q = conParametros((x) => {
      accionesUnitarias(x);
      x.fatiga.ritmoRol.medio = 10;
    });
    const e = partido4('cero', q);
    jugarHasta(e, 120, 1);
    expect(medio(e).energia).toBe(0);
    expect(medio(e).penalizacionFisica).toBeCloseTo(54.5, 6);
  });

  it('los suplentes empiezan con 100 y no gastan en el banquillo', () => {
    const e = partido4('banquillo', CON_ACCIONES);
    const suplente = e.equipos.local.jugadores.find((j) => !j.enCampo)!;
    expect(suplente.energia).toBe(100);
    jugarHasta(e, 90, 1);
    expect(suplente.energia).toBe(100);
  });
});

describe('penalización (FR-011, FR-012)', () => {
  it.each([
    [100, 0],
    [85, 5.25],
    [70, 10.5],
    [60, 15.5],
    [45, 23],
    [0, 54.5],
  ])('energía %d: −%d %% en físicas', (energia, penalizacion) => {
    expect(penalizacionFisicaDe(P4.fatiga, energia)).toBeCloseTo(penalizacion, 6);
  });

  it('con 60 de energía: −15,5 % físicas, −7,75 % técnicas y −3,875 % mentales', () => {
    const e = partido4('tipos');
    const eq = e.equipos.local;
    const j = titularEn(e, 'local', 'DCI');
    const base = {
      fisica: atributo(e, eq, j, 'velocidad'),
      tecnica: atributo(e, eq, j, 'pase'),
      mental: atributo(e, eq, j, 'anticipacion'),
    };
    j.energia = 60;
    j.penalizacionFisica = penalizacionFisicaDe(P4.fatiga, 60);
    expect(atributo(e, eq, j, 'velocidad')).toBeCloseTo(base.fisica * (1 - 0.155), 6);
    expect(atributo(e, eq, j, 'pase')).toBeCloseTo(base.tecnica * (1 - 0.0775), 6);
    expect(atributo(e, eq, j, 'anticipacion')).toBeCloseTo(base.mental * (1 - 0.03875), 6);
  });

  it('cada atributo tiene su tipo (4 físicos, 8 técnicos y 3 mentales)', () => {
    const e = partido4('tabla');
    const eq = e.equipos.local;
    const j = titularEn(e, 'local', 'MC-1');
    const fisicas = ['velocidad', 'fisico', 'quite', 'aereo'] as const;
    const tecnicas = ['pase', 'regate', 'remate', 'centro', 'tecnica', 'parada', 'desmarque', 'marcaje'] as const;
    const mentales = ['vision', 'anticipacion'] as const;
    const antes = new Map([...fisicas, ...tecnicas, ...mentales].map((a) => [a, atributo(e, eq, j, a)]));
    j.energia = 45;
    j.penalizacionFisica = 40;
    for (const a of fisicas) expect(atributo(e, eq, j, a)).toBeCloseTo(antes.get(a)! * 0.6, 6);
    for (const a of tecnicas) expect(atributo(e, eq, j, a)).toBeCloseTo(antes.get(a)! * 0.8, 6);
    for (const a of mentales) expect(atributo(e, eq, j, a)).toBeCloseTo(antes.get(a)! * 0.9, 6);
  });
});

describe('energiaDe y curvaEnergia (contrato)', () => {
  it('energiaDe da enteros y la penalización física', () => {
    const e = partido4('salida');
    const j = medio(e);
    j.energia = 60.4;
    j.penalizacionFisica = penalizacionFisicaDe(P4.fatiga, 60.4);
    expect(energiaDe(e, j)).toEqual({ energia: 60, penalizacion: 15 });
  });

  it('curvaEnergia da los valores de referencia sin descuento', () => {
    const c = curvaEnergia({ ritmo: 1 });
    expect(c.minuto45).toBeCloseTo(85, 6);
    expect(c.minuto90).toBeCloseTo(60, 6);
    expect(c.minuto120).toBeCloseTo(40, 6);
  });

  it('curvaEnergia descuenta el añadido de la primera parte y respeta el tope de 100 en el descanso (R5)', () => {
    expect(curvaEnergia({ ritmo: 1.2 }, { descuentoPrimeraParte: 2.28 }).minuto90).toBeCloseTo(50 - 2.28 * 1.2, 6);
    // Un portero supera 100 con la recuperación: el descuento no le cambia el 90'.
    expect(curvaEnergia({ ritmo: 0.2 }, { descuentoPrimeraParte: 2 }).minuto90).toBeCloseTo(93, 6);
  });

  it('el partido real mantiene la energía en [0, 100] y cansancioMedio es 1 − energía / 100', () => {
    const r = avanzar(crearPartido(entrada('real')), 'final');
    const enCampo = r.estado.equipos.local.jugadores.filter((j) => j.enCampo);
    for (const j of r.estado.equipos.local.jugadores) {
      expect(j.energia).toBeGreaterThanOrEqual(0);
      expect(j.energia).toBeLessThanOrEqual(100);
    }
    const media = enCampo.reduce((a, j) => a + (1 - j.energia / 100), 0) / enCampo.length;
    expect(r.estadisticas.local.cansancioMedio).toBeCloseTo(media, 2);
  }, 60_000);
});
