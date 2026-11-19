/** Datos de las expansiones reales (spec 016, T029; SC-001, FR-004 a FR-008), sobre los ficheros de `data/`. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NIVELES, type Jugador } from '../../src/catalogo/tipos';
import { validarCatalogo, validarColeccion } from '../../src/catalogo/validar';

const leer = <T>(fichero: string): T => JSON.parse(readFileSync(fileURLToPath(new URL(`../../../../data/${fichero}`, import.meta.url)), 'utf-8')) as T;

const core = leer<{ jugadores: Jugador[] }>('core-real.json').jugadores;
const expansiones = leer<{ jugadores: Jugador[] }>('expansiones-reales.json').jugadores;
const cartas = [...core, ...expansiones];
const porId = new Map(cartas.map((j) => [j.id, j]));
const { colecciones, errores } = validarCatalogo(cartas, leer<{ colecciones: unknown }>('colecciones.json').colecciones);
const deCore = new Set(colecciones.find((c) => c.id === 'core')!.cartas.map((c) => c.id));
const IDS = ['remontada-historica', 'idolos-dorados', 'saque-ardiente', 'estrellas-fulgurantes'];

describe('datos de la spec 016', () => {
  it('cartas y colecciones válidas (FR-006)', () => {
    expect(validarColeccion(cartas)).toEqual([]);
    expect(errores).toEqual([]);
  });

  it('cuatro expansiones de pago, en orden, con 24 cartas, 6 por nivel y números 1..24 (SC-001)', () => {
    expect(colecciones.filter((c) => c.tipo === 'pago').map((c) => c.id)).toEqual(IDS);
    for (const id of IDS) {
      const c = colecciones.find((x) => x.id === id)!;
      expect(c.cartas, id).toHaveLength(24);
      expect([...c.cartas].map((x) => x.numero).sort((a, b) => a! - b!), id).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
      for (const n of NIVELES) expect(c.cartas.filter((x) => porId.get(x.id)!.nivel === n), `${id} ${n}`).toHaveLength(6);
      // FR-004: el nivel sale del número (1–6 GOAT, 7–12 Legendario, 13–18 Crack, 19–24 Superclase).
      for (const x of c.cartas) expect(porId.get(x.id)!.nivel, `${id} ${x.numero}`).toBe(['GOAT', 'Legendario', 'Crack', 'Superclase'][Math.floor((x.numero! - 1) / 6)]);
    }
  });

  it('2400 fragmentos, sin precio en euros, y cada una regala un sobre distinto (FR-020, FR-025)', () => {
    const pago = colecciones.filter((c) => c.tipo === 'pago');
    expect(pago.map((c) => [c.precioFragmentos, c.precioCentimos])).toEqual(IDS.map(() => [2400, undefined]));
    expect(pago.map((c) => c.sobreRegalo)).toEqual(['sobre-7', 'sobre-1', 'sobre-4', 'sobre-28']);
  });

  it('el Core tiene 300 cartas, con Kimmich (376) y media ≥ 88, y sin Verratti (299) (FR-007)', () => {
    expect(deCore.size).toBe(300);
    expect(core.map((j) => j.id).sort((a, b) => a - b)).toEqual([...deCore].sort((a, b) => a - b));
    expect(deCore.has(376)).toBe(true);
    expect(porId.get(376)!.media).toBeGreaterThanOrEqual(88);
    expect(deCore.has(299)).toBe(false);
  });

  it('Verratti es el número 4 de Estrellas Fulgurantes y conserva su ficha (FR-008)', () => {
    const d = colecciones.find((c) => c.id === 'estrellas-fulgurantes')!;
    expect(d.cartas.find((x) => x.numero === 4)!.id).toBe(299);
    expect(porId.get(299)).toMatchObject({ nombre_carta: 'Verratti', nivel: 'GOAT', imagen_bg: '/cartas/fondos/jugadores/299.webp' });
  });

  it('los ids siguen la regla 300 + 24 × (expansión − 1) + número, salvo el hueco de Kimmich (research R2)', () => {
    IDS.forEach((id, k) => {
      for (const x of colecciones.find((c) => c.id === id)!.cartas) {
        if (x.id === 299) continue;
        expect(x.id, `${id} ${x.numero}`).toBe(300 + 24 * k + x.numero!);
      }
    });
  });
});
