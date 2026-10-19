/** Nombre de equipo (spec 003, FR-042 a FR-044; data-model §3.1; T109). */
import { describe, expect, it } from 'vitest';
import { nombrePorDefecto, normalizarNombre, validarNombre } from '../../src/equipo/nombreEquipo';

const codigos = (s: string, usados: string[] = []) => validarNombre(s, usados).map((e) => e.codigo);

describe('nombre de equipo (T109)', () => {
  it('normalizarNombre recorta los extremos y colapsa los espacios internos', () => {
    expect(normalizarNombre('   Los   Halcones  ')).toBe('Los Halcones');
    expect(normalizarNombre('\tA  B\n')).toBe('A B');
  });

  it('entre 3 y 24 caracteres, sin contar los espacios del principio y del final', () => {
    expect(codigos('   ')).toEqual(['NOMBRE_VACIO']);
    expect(codigos('  Ab  ')).toEqual(['NOMBRE_CORTO']);
    expect(codigos('  Abc  ')).toEqual([]);
    expect(codigos('x'.repeat(24))).toEqual([]);
    expect(codigos('x'.repeat(25))).toEqual(['NOMBRE_LARGO']);
    expect(codigos(`  ${'x'.repeat(24)}  `)).toEqual([]);
  });

  it('NOMBRE_REPETIDO con otro equipo de la partida, sin distinguir mayúsculas', () => {
    expect(codigos('los halcones', ['Los  Halcones'])).toEqual(['NOMBRE_REPETIDO']);
    expect(codigos('Los Halcones', ['Los Leones'])).toEqual([]);
  });

  it('nombrePorDefecto: «Equipo de Ana», con sufijo si está ocupado y nunca más de 24 caracteres', () => {
    expect(nombrePorDefecto('Ana', [])).toBe('Equipo de Ana');
    expect(nombrePorDefecto('Ana', ['equipo de ana'])).toBe('Equipo de Ana 2');
    expect(nombrePorDefecto('Ana', ['Equipo de Ana', 'Equipo de Ana 2'])).toBe('Equipo de Ana 3');
    const largo = nombrePorDefecto('Maximiliano Fernández', []);
    expect(largo.length).toBeLessThanOrEqual(24);
    const conSufijo = nombrePorDefecto('Maximiliano Fernández', [largo]);
    expect(conSufijo.length).toBeLessThanOrEqual(24);
    expect(conSufijo.endsWith(' 2')).toBe(true);
  });
});
