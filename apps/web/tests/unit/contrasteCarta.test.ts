/**
 * Legibilidad de rasgos y stats sobre la ilustración (spec 013, FR-008, FR-009, SC-003; research R3).
 *
 * Peor caso: el recuadro translúcido sobre blanco puro. Si el texto se lee ahí (≥ 4,5:1), se lee sobre cualquier
 * ilustración. La sombra del texto no cuenta.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contraste } from '../../src/componentes/colores';

const leer = (f: string) => readFileSync(fileURLToPath(new URL(`../../src/estilos/${f}`, import.meta.url)), 'utf8');
const cartas = leer('cartas.css');
const tokens = leer('tokens.css');

const hex = (css: string, nombre: string): string[] =>
  [...css.matchAll(new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{6})\\s*;`, 'g'))].map((m) => m[1]!);

/** `rgb(R G B / A%)` compuesto sobre blanco, en hex. */
function sobreBlanco(nombre: string): string {
  const m = cartas.match(new RegExp(`--${nombre}:\\s*rgb\\((\\d+) (\\d+) (\\d+) / (\\d+)%\\)`));
  if (!m) throw new Error(`Falta el token --${nombre} con el formato rgb(R G B / A%)`);
  const a = Number(m[4]) / 100;
  return `#${[m[1], m[2], m[3]].map((c) => Math.round(Number(c) * a + 255 * (1 - a)).toString(16).padStart(2, '0')).join('')}`;
}

describe('contraste de la carta en el peor caso (recuadro sobre blanco)', () => {
  const texto = hex(cartas, 'carta-texto')[0]!;
  const suaves = hex(cartas, 'carta-texto-suave');

  it('lee los tokens', () => {
    expect(texto).toBe('#ffffff');
    expect(suaves).toHaveLength(4);
  });

  it('virtudes ≥ 4,5:1', () => {
    expect(contraste(texto, sobreBlanco('carta-velo-rasgo'))).toBeGreaterThanOrEqual(4.5);
  });

  it('defectos (recuadro opaco) ≥ 4,5:1', () => {
    expect(contraste(hex(tokens, 'color-defecto')[0]!, hex(tokens, 'color-defecto-chip')[0]!)).toBeGreaterThanOrEqual(4.5);
  });

  it('cifras y abreviaturas de los stats ≥ 4,5:1 en los cuatro niveles', () => {
    const banda = sobreBlanco('carta-velo-stats');
    expect(contraste(texto, banda)).toBeGreaterThanOrEqual(4.5);
    for (const s of suaves) expect(contraste(s, banda), s).toBeGreaterThanOrEqual(4.5);
  });
});
