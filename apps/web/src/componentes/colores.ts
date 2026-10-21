/**
 * Colores de una equipación v2 para las chapas y los marcadores (spec 003, FR-045, FR-046): el principal y el del
 * dorsal (su contraste).
 */
import { colorDorsal, principal, type Equipacion } from '@fbd/domain';

export interface ColoresChapa {
  principal: string;
  secundario: string;
}

export function coloresDe(e: Equipacion): ColoresChapa {
  return { principal: principal(e), secundario: colorDorsal(e) };
}

/** Luminancia relativa de un color `#rgb` o `#rrggbb` (WCAG 2.1). */
function luminancia(color: string): number {
  let hex = color.trim().replace(/^#/, '');
  if (hex.length === 3 || hex.length === 4) hex = [...hex.slice(0, 3)].map((c) => c + c).join('');
  const canales = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canales.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste WCAG 2.1 entre dos colores hexadecimales (de 1 a 21). */
export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (oscuro + 0.05);
}

/**
 * Si una equipación se confunde con el fondo y necesita un contorno claro en chapas, camisetas y marcadores
 * (spec 004, FR-034, research R11): contraste menor de 1,5:1.
 */
export function necesitaContorno(color: string, fondo: string): boolean {
  return contraste(color, fondo) < 1.5;
}

/** Valores de los tokens de color cuando no hay documento (pruebas sin navegador). */
const TOKENS_SIN_DOCUMENTO: Record<string, string> = {
  '--color-lienzo': '#111111',
  '--color-texto': '#ffffff',
  '--color-borde-control': '#8a8a8d',
};

/** Valor de un token de color de tokens.css (research R6): la misma fuente para el CSS y el lienzo 2D. */
export function colorToken(nombre: string): string {
  const valor = typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  return valor || TOKENS_SIN_DOCUMENTO[nombre] || '';
}

/** Si una equipación necesita contorno sobre el lienzo de la aplicación (FR-034). */
export function contornoSobreLienzo(color: string): boolean {
  return /^#[0-9a-f]{3,8}$/i.test(color) && necesitaContorno(color, colorToken('--color-lienzo'));
}
