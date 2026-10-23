/**
 * Versión del catálogo (spec 005, T027 y T050; research R4; FR-036): las partidas anteriores a la spec 005 siguen con
 * sus cartas de entonces.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cartaEnVersion, VERSION_CATALOGO_ACTUAL, type Jugador } from '../../src/index';
import { jugador } from '../equipo/ayudas';

const leer = (ruta: string) => (JSON.parse(readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf-8')) as { jugadores: Jugador[] }).jugadores;

describe('cartaEnVersion', () => {
  const carta: Jugador = { ...jugador('DEL', ['DC'], 85, ['Matador', 'DeAcero', 'Revulsivo']), defectos: ['Chupon', 'Estrellita'] };

  it('la versión actual es la 2 y devuelve la carta tal cual', () => {
    expect(VERSION_CATALOGO_ACTUAL).toBe(2);
    expect(cartaEnVersion(carta, 2)).toBe(carta);
  });

  it('la versión 1 quita los defectos y las cuatro virtudes nuevas, y no toca nada más', () => {
    const antigua = cartaEnVersion(carta, 1);
    expect(antigua).toEqual({ ...carta, virtudes: ['Matador'], defectos: [] });
    expect(carta.defectos).toEqual(['Chupon', 'Estrellita']);
  });

  it('para las 300 cartas de Core, la versión 1 es exactamente la carta de la spec 004 (T050)', () => {
    const antes = new Map(leer('../fixtures/core-004.json').map((j) => [j.id, j]));
    const ahora = leer('../../../../data/core.json');
    expect(ahora).toHaveLength(300);
    for (const j of ahora) expect(cartaEnVersion(j, 1)).toEqual({ ...antes.get(j.id)!, defectos: [] });
  });
});
