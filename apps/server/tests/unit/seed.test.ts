import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FICHEROS_POR_DEFECTO, informeColecciones, informeDistribucion, leerLote, validarFicheroCatalogo, validarLote } from '../../src/persistencia/seed';

const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url));
const leer = (ruta: string) => JSON.parse(readFileSync(`${RAIZ}${ruta}`, 'utf-8')) as { jugadores: Record<string, unknown>[] };
const core = leer('data/core.json');
const prueba = leer('data/cartas-prueba.json');
const colecciones = JSON.parse(readFileSync(`${RAIZ}data/colecciones.json`, 'utf-8')) as { version: string; colecciones: { id: string; cartas: unknown[] }[] };

describe('seed: validación del catálogo', () => {
  it('acepta data/core.json', () => {
    const r = validarFicheroCatalogo(core);
    expect(r.errores).toEqual([]);
    expect(r.jugadores).toHaveLength(300);
  });

  it('rechaza el fichero entero si un jugador incumple una regla', () => {
    const roto = { ...core, jugadores: core.jugadores.map((j, i) => (i === 5 ? { ...j, nivel: 'Épico' } : j)) };
    const r = validarFicheroCatalogo(roto);
    expect(r.errores.length).toBeGreaterThan(0);
    expect(r.errores.some((e) => e.regla === 'nivel' || e.regla.startsWith('esquema:'))).toBe(true);
  });

  it('el informe compara con la tabla de 300 y no avisa con core.json', () => {
    const informe = informeDistribucion(validarFicheroCatalogo(core).jugadores);
    expect(informe).toContain('14/14');
    expect(informe).not.toContain('AVISO');
  });
});

describe('seed: lote de la spec 006 (contracts/datos-cartas.md)', () => {
  it('el lote por defecto tiene 375 cartas y 3 colecciones, y lo informa por colección', () => {
    const r = leerLote(RAIZ, FICHEROS_POR_DEFECTO.cartas, FICHEROS_POR_DEFECTO.colecciones);
    expect(r.errores).toEqual([]);
    expect(r.jugadores).toHaveLength(375);
    expect(r.colecciones.map((c) => c.id)).toEqual(['core', 'all-stars', 'top-argentinos']);
    expect(informeColecciones(r.jugadores, r.colecciones)).toContain('Colección top-argentinos (pago)');
  });

  it('una carta con el campo coleccion rechaza el lote entero', () => {
    const conColeccion = { ...prueba, jugadores: prueba.jugadores.map((j, i) => (i === 0 ? { ...j, coleccion: 'Core' } : j)) };
    expect(validarLote([core, conColeccion], colecciones).errores.length).toBeGreaterThan(0);
  });

  it('una carta huérfana rechaza el lote entero', () => {
    const sinLa375 = {
      ...colecciones,
      colecciones: colecciones.colecciones.map((c) => ({ ...c, cartas: c.cartas.filter((x) => x !== 375) })),
    };
    const r = validarLote([core, prueba], sinLa375);
    expect(r.errores.map((e) => e.mensaje)).toContain('La carta 375 no pertenece a ninguna colección');
  });

  it('un id repetido entre ficheros rechaza el lote', () => {
    expect(validarLote([core, core], colecciones).errores.some((e) => e.regla === 'id_repetido')).toBe(true);
  });
});
