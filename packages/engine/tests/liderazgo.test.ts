/**
 * Liderazgo del defensa y del portero (spec 015, US6; invariante M2.10; research R9; FR-015, FR-016).
 */
import { parametrosActuales } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { exposicionLinea, habilitador } from '../src/acciones/fueraDeJuego';
import { calcularObjetivos } from '../src/espacio/objetivos';
import { bonusLiderPortero, bonusPortero, correccionLinea, liderDeLinea } from '../src/modificadores/liderazgo';
import { ajusteDuelo } from '../src/modificadores/virtudes';
import type { JugadorEnPartido } from '../src/index';
import { darBalon, partido, situar, titularEn } from './ayudas';

const ACTUAL = { version: parametrosActuales().version, parametros: parametrosActuales() };
/** Parámetros con la corrección de línea anulada. */
const SIN_CORRECCION = { version: parametrosActuales().version, parametros: { ...parametrosActuales(), liderazgo: { ...parametrosActuales().liderazgo!, kDefensa: 0 } } };
/** Liderazgo por debajo de `baseDefensa`: sin efecto en la línea. */
const SIN_LIDER = 30;
const L = parametrosActuales().liderazgo!;
/** Décimas por metro (el campo mide 105 m y 10.000 décimas). */
const M = 10000 / 105;

function conStats(j: JugadorEnPartido, stats: Record<string, number>): void {
  j.jugador = { ...j.jugador, stats: { ...j.jugador.stats, ...stats } as typeof j.jugador.stats };
}

describe('liderazgo: funciones puras (M2.10)', () => {
  it('el portero suma el 2,5 % de lo que su liderazgo pasa de 70 en su zona hasta zonaMaxPortero, y 0 más lejos', () => {
    // Decisión del 2026-11-17: relativo a 70 (90 ⇒ +0,5; 95 ⇒ +0,625; 70 o menos ⇒ 0).
    expect(bonusPortero(90, 0, L)).toBeCloseTo(0.5, 10);
    expect(bonusPortero(95, L.zonaMaxPortero, L)).toBeCloseTo(0.625, 10);
    expect(bonusPortero(70, 0, L)).toBe(0);
    expect(bonusPortero(60, 0, L)).toBe(0);
    expect(bonusPortero(90, L.zonaMaxPortero + 1, L)).toBe(0);
  });

  it('la corrección del defensa es min(maxCorreccion, kDefensa × (L − baseDefensa) / 25), y 0 con baseDefensa o menos', () => {
    expect(correccionLinea(L.baseDefensa, L)).toBe(0);
    expect(correccionLinea(L.baseDefensa - 10, L)).toBe(0);
    expect(correccionLinea(60, L)).toBeCloseTo(Math.min(L.maxCorreccion, (L.kDefensa * (60 - L.baseDefensa)) / 25), 10);
    expect(correccionLinea(80, L)).toBeGreaterThan(correccionLinea(60, L));
    expect(correccionLinea(200, L)).toBe(L.maxCorreccion);
  });

  it('cuenta el mayor liderazgo de la línea a radioDefensaM o menos, él incluido; no se acumulan', () => {
    const r = L.radioDefensaM * M;
    const yo = { x: 2000, y: 3200, liderazgo: 72 };
    const cerca = { x: 2000, y: 3200 + Math.floor(r) - 5, liderazgo: 90 };
    const cerca2 = { x: 2000, y: 3200 - Math.floor(r / 2), liderazgo: 85 };
    const lejos = { x: 2000, y: 3200 + Math.ceil(r) + 20, liderazgo: 99 };
    expect(liderDeLinea(yo, [yo], L)).toBe(72);
    expect(liderDeLinea(yo, [yo, cerca, cerca2, lejos], L)).toBe(90);
    expect(liderDeLinea(yo, [yo, lejos], L)).toBe(72);
  });
});

describe('portero líder en los duelos (FR-016)', () => {
  /** Defensa local DCI en x (metros desde su portería), con su portero a `liderazgo`, y el DC rival como atacante. */
  function escena(metros: number, liderazgo: number, parametros: typeof ACTUAL = ACTUAL) {
    const e = partido(`liderazgo-portero-${metros}-${liderazgo}`, parametros);
    const defensa = titularEn(e, 'local', 'DCI');
    const atacante = titularEn(e, 'visitante', 'DC');
    conStats(titularEn(e, 'local', 'POR'), { liderazgo });
    situar(e, defensa.id, { x: Math.round(metros * M), y: 3200 });
    situar(e, atacante.id, { x: 10000 - Math.round(metros * M) - 100, y: 3200 });
    return { e, defensa, atacante };
  }

  it('con 90 de liderazgo, +0,5 al defensor en su área y en su tercio; nada más arriba', () => {
    const area = escena(10, 90);
    expect(bonusLiderPortero(area.e, area.defensa)).toBeCloseTo(0.5, 10);
    expect(ajusteDuelo(area.e, area.atacante, area.defensa).defensor).toBeCloseTo(0.5, 10);
    const tercio = escena(30, 90);
    expect(bonusLiderPortero(tercio.e, tercio.defensa)).toBeCloseTo(0.5, 10);
    const arriba = escena(40, 90);
    expect(bonusLiderPortero(arriba.e, arriba.defensa)).toBe(0);
  });

  it('solo suma el suyo: el portero rival no cuenta, ni al propio portero ni a un medio', () => {
    const { e, atacante } = escena(10, 90);
    conStats(titularEn(e, 'visitante', 'POR'), { liderazgo: 99 });
    expect(bonusLiderPortero(e, atacante)).toBe(0);
    expect(bonusLiderPortero(e, titularEn(e, 'local', 'POR'))).toBe(0);
    const medio = titularEn(e, 'local', 'MC-1');
    situar(e, medio.id, { x: 1000, y: 3200 });
    expect(bonusLiderPortero(e, medio)).toBe(0);
  });
});

describe('defensa líder en la línea (FR-015)', () => {
  /**
   * Línea local de cuatro con el DCI 8 m por detrás de los otros tres (rezagado: es el penúltimo, con el portero), y el
   * balón del visitante en el centro del campo. Devuelve el x objetivo (coordenadas del local) de los defensas.
   */
  function objetivosLinea(liderazgo: number, parametros: typeof ACTUAL | typeof SIN_CORRECCION = ACTUAL) {
    const e = partido(`liderazgo-linea-${liderazgo}`, parametros);
    for (const c of ['LI', 'DCI', 'DCD', 'LD']) conStats(titularEn(e, 'local', c), { liderazgo: SIN_LIDER });
    conStats(titularEn(e, 'local', 'DCD'), { liderazgo });
    const ys = { LI: 800, DCI: 2400, DCD: 4000, LD: 5600 } as const;
    for (const [c, y] of Object.entries(ys)) situar(e, titularEn(e, 'local', c).id, { x: c === 'DCI' ? 2000 : 2800, y });
    situar(e, titularEn(e, 'local', 'POR').id, { x: 300, y: 3200 });
    const portador = titularEn(e, 'visitante', 'MC-1');
    situar(e, portador.id, { x: 5000, y: 3200 });
    darBalon(e, 'visitante', portador, 2);
    const o = calcularObjetivos(e);
    return Object.fromEntries(Object.keys(ys).map((c) => [c, o[titularEn(e, 'local', c).id]!.x]));
  }

  it('con un líder los defensas cercanos se acercan a la línea (el penúltimo defensor), más cuanto más liderazgo', () => {
    const sin = objetivosLinea(95, SIN_CORRECCION);
    const base = objetivosLinea(SIN_LIDER);
    const con60 = objetivosLinea(60);
    const con95 = objetivosLinea(95);
    // Sin liderazgo por encima de baseDefensa no corrige: los mismos objetivos que con la corrección anulada.
    expect(base).toEqual(sin);
    // El DCD (líder) se acerca a x = 2.000 (el DCI rezagado), más con 95 que con 60; el LI, lejos de él, no.
    expect(Math.abs(con60.DCD! - 2000)).toBeLessThan(Math.abs(base.DCD! - 2000));
    expect(Math.abs(con95.DCD! - 2000)).toBeLessThan(Math.abs(con60.DCD! - 2000));
    expect(con95.LI).toBe(base.LI);
  });
});

describe('habilitaciones: el defensa rezagado que deja en juego al receptor (R9)', () => {
  /** Visitante defendiendo: portero a 3 m, el DCI rezagado a 15 m, el resto a 30 m o más; el DC local a `x` (absoluta). */
  function escena(x: number, rezagado = 'DCI') {
    const e = partido('habilitaciones', ACTUAL);
    for (const j of e.equipos.visitante.jugadores) if (j.enCampo) situar(e, j.id, { x: j.casillaId === 'POR' ? 300 : 3200, y: 3200 });
    situar(e, titularEn(e, 'visitante', rezagado).id, { x: 1500, y: 2400 });
    const receptor = titularEn(e, 'local', 'DC');
    situar(e, receptor.id, { x, y: 3200 });
    return { e, receptor, rezagado: titularEn(e, 'visitante', rezagado) };
  }

  it('entre la línea de los demás y el rezagado, el rezagado lo habilita; detrás de él o en fuera de juego, nadie', () => {
    const entre = escena(8000);
    expect(habilitador(entre.e, entre.e.equipos.local, entre.receptor, 5500)?.id).toBe(entre.rezagado.id);
    const detras = escena(6500);
    expect(habilitador(detras.e, detras.e.equipos.local, detras.receptor, 5500)).toBeNull();
    const fuera = escena(9200);
    expect(habilitador(fuera.e, fuera.e.equipos.local, fuera.receptor, 5500)).toBeNull();
  });

  it('la exposición de la línea cuenta a los atacantes que el rezagado deja en juego en ese momento', () => {
    expect(exposicionLinea(escena(8000).e, 'visitante')).toBe(1);
    expect(exposicionLinea(escena(6500).e, 'visitante')).toBe(0);
    expect(exposicionLinea(escena(9200).e, 'visitante')).toBe(0);
  });

  it('si el rezagado no es de la línea defensiva (un medio), no cuenta', () => {
    const medio = escena(8000, 'MC-1');
    expect(habilitador(medio.e, medio.e.equipos.local, medio.receptor, 5500)).toBeNull();
  });
});
