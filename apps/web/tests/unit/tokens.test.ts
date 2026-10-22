/** Contrastes de la guía de estilos adaptada (spec 004, FR-029, research R4 y R13). */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contraste } from '../../src/componentes/colores';

const css = readFileSync(fileURLToPath(new URL('../../src/estilos/tokens.css', import.meta.url)), 'utf8');

function token(nombre: string): string {
  const m = css.match(new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
  if (!m) throw new Error(`Falta el token de color --${nombre}`);
  return m[1]!;
}

const fondos = ['color-lienzo', 'color-panel', 'color-elevado'];

describe('tokens.css', () => {
  it('no tiene variante de tema claro', () => {
    expect(css).not.toMatch(/prefers-color-scheme/);
    expect(css).toMatch(/color-scheme:\s*dark/);
  });

  const texto = [
    'color-texto',
    'color-texto-suave',
    'color-error',
    'color-advertencia',
    'nivel-superclase',
    'nivel-epico',
    'nivel-legendario',
    'nivel-goat',
  ];
  for (const t of texto) {
    for (const f of fondos) {
      it(`--${t} sobre --${f} ≥ 4,5:1`, () => {
        expect(contraste(token(t), token(f))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  for (const t of ['color-borde-control', 'color-accion']) {
    for (const f of fondos) {
      it(`--${t} sobre --${f} ≥ 3:1 (bordes de controles y foco)`, () => {
        expect(contraste(token(t), token(f))).toBeGreaterThanOrEqual(3);
      });
    }
  }

  it('el texto del botón principal sobre el lima ≥ 4,5:1', () => {
    expect(contraste(token('color-accion-texto'), token('color-accion'))).toBeGreaterThanOrEqual(4.5);
  });

  it('el rojo de los defectos sobre su recuadro y sobre los fondos ≥ 4,5:1, y distinto del error (spec 005, FR-021)', () => {
    expect(contraste(token('color-defecto'), token('color-defecto-chip'))).toBeGreaterThanOrEqual(4.5);
    for (const f of fondos) expect(contraste(token('color-defecto'), token(f))).toBeGreaterThanOrEqual(4.5);
    expect(token('color-defecto').toLowerCase()).not.toBe(token('color-error').toLowerCase());
  });

  it('el texto suave sobre el botón apagado ≥ 4,5:1', () => {
    expect(contraste(token('color-texto-suave'), token('color-apagado'))).toBeGreaterThanOrEqual(4.5);
  });
});
