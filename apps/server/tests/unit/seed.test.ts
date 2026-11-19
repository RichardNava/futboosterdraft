import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  FICHEROS_POR_DEFECTO,
  informeColecciones,
  informeDistribucion,
  leerCosmeticos,
  leerLote,
  validarCosmeticos,
  validarFicheroCatalogo,
  validarLote,
} from '../../src/persistencia/seed';

const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url));
const leer = (ruta: string) => JSON.parse(readFileSync(`${RAIZ}${ruta}`, 'utf-8')) as { jugadores: Record<string, unknown>[] };
const core = leer('data/core-real.json');
const expansiones = leer('data/expansiones-reales.json');
const colecciones = JSON.parse(readFileSync(`${RAIZ}data/colecciones.json`, 'utf-8')) as { version: string; colecciones: { id: string; cartas: unknown[] }[] };

describe('seed: validación del catálogo', () => {
  it('acepta data/core-real.json', () => {
    const r = validarFicheroCatalogo(core);
    expect(r.errores).toEqual([]);
    expect(r.jugadores).toHaveLength(300);
  });

  it('rechaza el fichero entero si un jugador incumple una regla', () => {
    const roto = { ...core, jugadores: core.jugadores.map((j, i) => (i === 5 ? { ...j, nivel: 'Epico' } : j)) };
    const r = validarFicheroCatalogo(roto);
    expect(r.errores.length).toBeGreaterThan(0);
    expect(r.errores.some((e) => e.regla === 'nivel' || e.regla.startsWith('esquema:'))).toBe(true);
  });

  it('el informe compara con la tabla de 300 y no avisa con el core-real.json, aunque no la cumpla exactamente (spec 008, R8)', () => {
    const r = validarFicheroCatalogo(core);
    expect(r.errores).toEqual([]);
    const informe = informeDistribucion(r.jugadores);
    expect(informe).toContain('/14');
    expect(informe).not.toContain('AVISO');
  });
});

describe('seed: lote por defecto (spec 016)', () => {
  it('lee core-real.json y expansiones-reales.json, sin cartas ni colecciones de prueba, y lo informa por colección', () => {
    expect(FICHEROS_POR_DEFECTO.cartas).toEqual(['data/core-real.json', 'data/expansiones-reales.json']);
    const r = leerLote(RAIZ, FICHEROS_POR_DEFECTO.cartas, FICHEROS_POR_DEFECTO.colecciones);
    expect(r.errores).toEqual([]);
    expect(r.jugadores).toHaveLength(core.jugadores.length + expansiones.jugadores.length);
    expect(r.colecciones[0]!.id).toBe('core');
    expect(r.colecciones.map((c) => c.id)).not.toContain('all-stars');
    expect(r.colecciones.map((c) => c.id)).not.toContain('top-argentinos');
    expect(informeColecciones(r.jugadores, r.colecciones)).toContain('Colección core (basica)');
  });

  it('una carta con el campo coleccion rechaza el lote entero', () => {
    const conColeccion = { ...core, jugadores: core.jugadores.map((j, i) => (i === 0 ? { ...j, coleccion: 'Core' } : j)) };
    expect(validarLote([conColeccion, expansiones], colecciones).errores.length).toBeGreaterThan(0);
  });

  it('una carta huérfana rechaza el lote entero', () => {
    const ultima = core.jugadores.at(-1)!.id as number;
    const sinLaUltima = {
      ...colecciones,
      colecciones: colecciones.colecciones.map((c) => ({ ...c, cartas: c.cartas.filter((x) => x !== ultima && (x as { id?: number }).id !== ultima) })),
    };
    const r = validarLote([core, expansiones], sinLaUltima);
    expect(r.errores.map((e) => e.mensaje)).toContain(`La carta ${ultima} no pertenece a ninguna colección`);
  });

  it('un id repetido entre ficheros rechaza el lote', () => {
    expect(validarLote([core, core], colecciones).errores.some((e) => e.regla === 'id_repetido')).toBe(true);
  });
});

describe('seed: cosméticos no vendibles y sobres de regalo (spec 016, data-model §1.4)', () => {
  const { catalogo, errores } = leerCosmeticos(RAIZ);
  const sobre = (id: string, extra: object = {}) => ({ id, tipo: 'sobre' as const, nombre: id, gratuito: false, precio_centimos: 50, precio_fragmentos: 250, orden: 1, ...extra });
  const base = {
    version: '1.0.0',
    cosmeticos: [sobre('s1'), sobre('s2'), sobre('s3'), sobre('s4'), sobre('s5'), sobre('regalo', { vendible: false }), sobre('otro', { vendible: false })],
    packs: [{ id: 'p', tipo: 'sobre' as const, nombre: 'P', precio_centimos: 199, cosmeticos: ['s1', 's2', 's3', 's4', 's5'] }],
  };
  const mensajes = (c: typeof base, cols: { id: string; sobreRegalo?: string }[] = []) => validarCosmeticos(c, cols).map((e) => e.mensaje).join(' | ');

  it('data/cosmeticos.json es válido y los sobres 1, 4, 7 y 28 no se venden', () => {
    expect(errores).toEqual([]);
    const noVendibles = catalogo.cosmeticos.filter((c) => c.vendible === false).map((c) => c.id);
    expect(noVendibles.sort()).toEqual(['sobre-1', 'sobre-28', 'sobre-4', 'sobre-7']);
  });

  it('un catálogo correcto con su sobre de regalo pasa', () => {
    expect(mensajes(base, [{ id: 'x', sobreRegalo: 'regalo' }])).toBe('');
  });

  it('un pack con un cosmético no vendible falla', () => {
    const conRegalo = { ...base, packs: [{ ...base.packs[0]!, cosmeticos: ['s1', 's2', 's3', 's4', 'regalo'] }] };
    expect(mensajes(conRegalo)).toMatch(/vendibles/);
  });

  it('un sobre de regalo vendible, inexistente o repetido falla', () => {
    expect(mensajes(base, [{ id: 'x', sobreRegalo: 's1' }])).toMatch(/no vendible/);
    expect(mensajes(base, [{ id: 'x', sobreRegalo: 'nada' }])).toMatch(/no vendible/);
    expect(mensajes(base, [{ id: 'x', sobreRegalo: 'regalo' }, { id: 'y', sobreRegalo: 'regalo' }])).toMatch(/ya es el regalo de x/);
  });
});
