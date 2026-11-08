/** Bajas pendientes en la alineación confirmada (spec 012, T052 y T053; FR-026 a FR-030). */
import { describe, expect, it } from 'vitest';
import { validarAlineacion, type Alineacion } from '../../src/equipo/alineacion';
import { autoAlineacion } from '../../src/equipo/autoAlineacion';
import { bajasPendientes, cubrirBajas, haySuplenteDisponible } from '../../src/equipo/bajas';
import { PARAMETROS_V3 } from '../../src/parametros/index';
import { plantillaEquilibrada } from './ayudas';

const plantilla = plantillaEquilibrada();
const ids = plantilla.map((j) => j.id);
const porId = new Map(plantilla.map((j) => [j.id, j]));
const base = (): Alineacion => autoAlineacion(plantilla, new Set(), PARAMETROS_V3);
const sinCambiar = (a: Alineacion) => ({ formacion: a.formacion, tactica: a.tactica });

describe('bajasPendientes y haySuplenteDisponible', () => {
  it('cuenta los titulares y los suplentes convocados de baja, en ese orden', () => {
    const a = base();
    const titular = a.titulares[4]!.jugadorId;
    const suplente = a.suplentes[1]!;
    const fuera = ids.find((id) => !a.titulares.some((t) => t.jugadorId === id) && !a.suplentes.includes(id))!;
    expect(bajasPendientes(a, new Set([suplente, titular, fuera]))).toEqual([titular, suplente]);
    expect(bajasPendientes(a, new Set([fuera]))).toEqual([]);
  });

  it('sin nadie fuera del once y sin baja, no hay suplentes', () => {
    const a = base();
    const titulares = new Set(a.titulares.map((t) => t.jugadorId));
    expect(haySuplenteDisponible(a, ids, new Set())).toBe(true);
    const todosLosDemas = new Set(ids.filter((id) => !titulares.has(id)));
    expect(haySuplenteDisponible(a, ids, todosLosDemas)).toBe(false);
  });
});

describe('cubrirBajas (FR-030)', () => {
  it('solo cambia la baja: titulares, banquillo, colocación, formación, táctica y lanzadores siguen igual', () => {
    const a = base();
    const colocada: Alineacion = { ...a, colocacion: a.titulares.map((t, i) => ({ jugadorId: t.jugadorId, x: 100 + i, y: 300 })) };
    // Un titular que no lanza nada.
    const l = colocada.lanzadores;
    const baja = colocada.titulares.find((t) => t.casillaId !== 'POR' && ![l.penaltis, l.faltas, l.corners, ...l.tanda].includes(t.jugadorId))!;
    const r = cubrirBajas(colocada, plantilla, new Set([baja.jugadorId]), PARAMETROS_V3);
    expect(sinCambiar(r)).toEqual(sinCambiar(colocada));
    const entra = r.titulares.find((t) => t.casillaId === baja.casillaId)!.jugadorId;
    expect(entra).not.toBe(baja.jugadorId);
    // Mismas casillas y mismos jugadores salvo el relevo.
    expect(r.titulares.filter((t) => t.casillaId !== baja.casillaId)).toEqual(colocada.titulares.filter((t) => t.casillaId !== baja.casillaId));
    expect(r.suplentes).toEqual(colocada.suplentes.filter((id) => id !== entra));
    expect(r.lanzadores).toEqual(colocada.lanzadores);
    // El que entra hereda el punto del que sale.
    const punto = colocada.colocacion!.find((c) => c.jugadorId === baja.jugadorId)!;
    expect(r.colocacion!.find((c) => c.jugadorId === entra)).toEqual({ ...punto, jugadorId: entra });
    // La colocación de la prueba es inventada: se valida el resto.
    const { colocacion: _colocacion, ...sinColocacion } = r;
    expect(validarAlineacion(sinColocacion, ids, new Set([baja.jugadorId]))).toEqual([]);
  });

  it('el relevo es de la misma demarcación si la hay', () => {
    const a = base();
    const baja = a.titulares.find((t) => porId.get(t.jugadorId)!.demarcacion === 'DEF')!;
    const r = cubrirBajas(a, plantilla, new Set([baja.jugadorId]), PARAMETROS_V3);
    expect(porId.get(r.titulares.find((t) => t.casillaId === baja.casillaId)!.jugadorId)!.demarcacion).toBe('DEF');
  });

  it('sin nadie de su demarcación, entra otro fuera de posición', () => {
    const a = base();
    const porteroTitular = a.titulares.find((t) => t.casillaId === 'POR')!.jugadorId;
    const otrosPorteros = plantilla.filter((j) => j.demarcacion === 'POR' && j.id !== porteroTitular).map((j) => j.id);
    const bajas = new Set([porteroTitular, ...otrosPorteros]);
    const r = cubrirBajas(a, plantilla, bajas, PARAMETROS_V3);
    const entra = r.titulares.find((t) => t.casillaId === 'POR')!.jugadorId;
    expect(porId.get(entra)!.demarcacion).not.toBe('POR');
    expect(r.suplentes.some((id) => bajas.has(id))).toBe(false);
  });

  it('un lanzador de baja: el que entra hereda sus lanzamientos', () => {
    const a = base();
    const lanzador = a.lanzadores.penaltis;
    const r = cubrirBajas(a, plantilla, new Set([lanzador]), PARAMETROS_V3);
    const casilla = a.titulares.find((t) => t.jugadorId === lanzador)!.casillaId;
    const entra = r.titulares.find((t) => t.casillaId === casilla)!.jugadorId;
    expect(r.lanzadores.penaltis).toBe(entra);
    expect(r.lanzadores.tanda).toContain(entra);
    expect(r.lanzadores.tanda).not.toContain(lanzador);
  });

  it('sin nadie disponible, la casilla queda vacía y se juega con menos (y eso es válido)', () => {
    const a = base();
    const titulares = new Set(a.titulares.map((t) => t.jugadorId));
    const baja = a.titulares[6]!.jugadorId;
    const bajas = new Set([baja, ...ids.filter((id) => !titulares.has(id))]);
    const r = cubrirBajas(a, plantilla, bajas, PARAMETROS_V3);
    expect(r.titulares).toHaveLength(10);
    expect(r.suplentes).toEqual([]);
    expect(validarAlineacion(r, ids, bajas)).toEqual([]);
  });
});

describe('validarAlineacion con menos de 11 (T053, FR-029)', () => {
  it('menos de 11 titulares solo si no queda ningún suplente disponible', () => {
    const a = base();
    const diez = { ...a, titulares: a.titulares.slice(0, 10), lanzadores: { ...a.lanzadores } };
    const quitado = a.titulares[10]!.jugadorId;
    if ([diez.lanzadores.penaltis, diez.lanzadores.faltas, diez.lanzadores.corners, ...diez.lanzadores.tanda].includes(quitado)) return;
    // Con suplentes disponibles, 10 no vale.
    expect(validarAlineacion(diez, ids, new Set()).map((e) => e.codigo)).toContain('ALINEACION_INVALIDA');
    // Sin nadie más disponible (el resto de baja), sí.
    const titulares = new Set(diez.titulares.map((t) => t.jugadorId));
    const bajas = new Set(ids.filter((id) => !titulares.has(id)));
    expect(validarAlineacion({ ...diez, suplentes: [] }, ids, bajas)).toEqual([]);
  });
});
