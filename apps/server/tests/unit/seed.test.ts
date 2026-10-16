import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { informeDistribucion, validarFicheroCatalogo } from '../../src/persistencia/seed';

const core = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../../data/core.json', import.meta.url)), 'utf-8'),
) as { jugadores: Record<string, unknown>[] };

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

  it('rechaza un catálogo demasiado pequeño (esquema: minItems 192)', () => {
    const r = validarFicheroCatalogo({ ...core, jugadores: core.jugadores.slice(0, 10) });
    expect(r.errores.some((e) => e.regla === 'esquema:minItems')).toBe(true);
  });

  it('el informe compara con la tabla de 300 y no avisa con core.json', () => {
    const informe = informeDistribucion(validarFicheroCatalogo(core).jugadores);
    expect(informe).toContain('14/14');
    expect(informe).not.toContain('AVISO');
  });
});
