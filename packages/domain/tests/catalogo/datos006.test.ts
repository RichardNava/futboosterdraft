import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DISTRIBUCION_CORE, recuentoPorDemarcacionYNivel } from '../../src/catalogo/coleccionCore';
import { DEMARCACIONES, NIVELES, type Jugador } from '../../src/catalogo/tipos';
import { validarCatalogo, validarColeccion } from '../../src/catalogo/validar';

const leer = <T>(fichero: string): T =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../../../data/${fichero}`, import.meta.url)), 'utf-8')) as T;

const core = leer<{ jugadores: Jugador[] }>('core.json').jugadores;
const prueba = leer<{ jugadores: Jugador[] }>('cartas-prueba.json').jugadores;
const ficheroColecciones = leer<{ colecciones: unknown[] }>('colecciones.json').colecciones;
const cartas = [...core, ...prueba];
const { colecciones, errores } = validarCatalogo(cartas, ficheroColecciones);
const ids = (id: string) => new Set(colecciones.find((c) => c.id === id)!.cartas.map((c) => c.id));
const comunes = (a: Set<number>, b: Set<number>) => [...a].filter((x) => b.has(x)).length;

describe('datos de la spec 006 (FR-005, FR-006)', () => {
  it('las cartas y las colecciones son válidas', () => {
    expect(validarColeccion(cartas)).toEqual([]);
    expect(errores).toEqual([]);
  });

  it('core tiene 300 cartas con DISTRIBUCION_CORE; all-stars 45 y top-argentinos 42', () => {
    const porId = new Map(cartas.map((c) => [c.id, c]));
    expect(ids('core').size).toBe(300);
    expect(recuentoPorDemarcacionYNivel([...ids('core')].map((id) => porId.get(id)!))).toEqual(DISTRIBUCION_CORE);
    expect(ids('all-stars').size).toBe(45);
    expect(ids('top-argentinos').size).toBe(42);
  });

  it('las colecciones de pago comparten ≥ 5 cartas y cada una tiene ≥ 3 de Core', () => {
    expect(comunes(ids('all-stars'), ids('top-argentinos'))).toBeGreaterThanOrEqual(5);
    expect(comunes(ids('all-stars'), ids('core'))).toBeGreaterThanOrEqual(3);
    expect(comunes(ids('top-argentinos'), ids('core'))).toBeGreaterThanOrEqual(3);
  });

  it('ninguna carta es GBR y Top Argentinos es todo ARG', () => {
    expect(cartas.filter((c) => c.nacionalidad === 'GBR')).toEqual([]);
    expect(cartas.filter((c) => ids('top-argentinos').has(c.id) && c.nacionalidad !== 'ARG' && c.id > 342)).toEqual([]);
  });

  it('las cartas 301–375 cubren cada demarcación × nivel con ≥ 2', () => {
    expect(prueba.map((c) => c.id)).toEqual(Array.from({ length: 75 }, (_, i) => 301 + i));
    const recuento = recuentoPorDemarcacionYNivel(prueba);
    for (const d of DEMARCACIONES) for (const n of NIVELES) expect(recuento[d][n], `${d} ${n}`).toBeGreaterThanOrEqual(2);
  });
});
