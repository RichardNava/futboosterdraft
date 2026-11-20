import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { recuentoPorDemarcacionYNivel } from '../../src/catalogo/coleccionCore';
import { DEMARCACIONES, NIVELES, type Jugador } from '../../src/catalogo/tipos';
import { validarCatalogo, validarColeccion } from '../../src/catalogo/validar';

const leer = <T>(fichero: string): T =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../../../data/${fichero}`, import.meta.url)), 'utf-8')) as T;

const core = leer<{ jugadores: Jugador[] }>('core-real.json').jugadores;
const expansiones = leer<{ jugadores: Jugador[] }>('expansiones-reales.json').jugadores;
const ficheroColecciones = leer<{ colecciones: unknown[] }>('colecciones.json').colecciones;
const cartas = [...core, ...expansiones];
const { colecciones, errores } = validarCatalogo(cartas, ficheroColecciones);
const ids = (id: string) => new Set(colecciones.find((c) => c.id === id)!.cartas.map((c) => c.id));

// Spec 016: las cartas y colecciones de prueba se retiraron; las comprobaciones de las expansiones están en datos016.
describe('datos de la spec 006 (FR-005, FR-006)', () => {
  it('las cartas y las colecciones son válidas', () => {
    expect(validarColeccion(cartas)).toEqual([]);
    expect(errores).toEqual([]);
  });

  // Desde la spec 008 el reparto de Core frente a DISTRIBUCION_CORE solo avisa (R8).
  it('core tiene 300 cartas y cubre cada demarcación × nivel', () => {
    expect(ids('core').size).toBe(300);
    const recuento = recuentoPorDemarcacionYNivel(core);
    for (const d of DEMARCACIONES) for (const n of NIVELES) expect(recuento[d][n], `${d} ${n}`).toBeGreaterThan(0);
  });

  it('ninguna carta es GBR y no quedan colecciones de prueba', () => {
    expect(cartas.filter((c) => c.nacionalidad === 'GBR')).toEqual([]);
    expect(colecciones.map((c) => c.id)).not.toContain('all-stars');
    expect(colecciones.map((c) => c.id)).not.toContain('top-argentinos');
  });
});
