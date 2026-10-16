/**
 * Equipaciones (FR-031b): primera y segunda, cada una con color principal y secundario.
 */
import type { ParametrosEquilibrado } from '../parametros/index';
import { Rng, type Semilla } from '../rng/xoshiro';

export interface Equipacion {
  principal: string;
  secundario: string;
}

export interface Equipaciones {
  primera: Equipacion;
  segunda: Equipacion;
}

const PALETA = [
  '#d01010', '#1030d0', '#10a040', '#f0c000', '#ffffff', '#202020', '#7a1fa2', '#ff7a00',
  '#00a0c8', '#8b0000', '#0b2e6b', '#4a7a20', '#c0c0c0', '#e75480', '#6d4c41', '#00796b',
];

const HEX = /^#[0-9a-f]{6}$/i;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminancia relativa (WCAG 2) de un color en hexadecimal. */
function luminancia(hex: string): number {
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb(hex);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Relación de contraste WCAG entre dos colores (1 a 21). */
export function relacionContraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** Color del dorsal sobre una camiseta: blanco o casi negro, el que más contraste (≥ 4,5:1 en la paleta). */
export function colorDeContraste(fondo: string): string {
  return relacionContraste(fondo, '#ffffff') >= relacionContraste(fondo, '#202020') ? '#ffffff' : '#202020';
}

export function distanciaColor(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export function equipacionesAleatorias(semilla: Semilla, p: ParametrosEquilibrado): Equipaciones {
  const rng = new Rng(semilla);
  const colores = rng.barajar(PALETA);
  const primera = colores[0]!;
  const segunda = colores.find((c) => distanciaColor(c, primera) >= p.equipaciones.umbralDistanciaColor)!;
  const contraste = colorDeContraste;
  return {
    primera: { principal: primera, secundario: contraste(primera) },
    segunda: { principal: segunda, secundario: contraste(segunda) },
  };
}

export interface ErrorEquipaciones {
  codigo: 'COLOR_INVALIDO' | 'EQUIPACIONES_IGUALES';
  mensaje: string;
}

export function validarEquipaciones(e: Equipaciones): ErrorEquipaciones[] {
  const colores = [e.primera?.principal, e.primera?.secundario, e.segunda?.principal, e.segunda?.secundario];
  if (colores.some((c) => typeof c !== 'string' || !HEX.test(c))) {
    return [{ codigo: 'COLOR_INVALIDO', mensaje: 'Los colores deben tener el formato #rrggbb' }];
  }
  if (e.primera.principal.toLowerCase() === e.segunda.principal.toLowerCase()) {
    return [{ codigo: 'EQUIPACIONES_IGUALES', mensaje: 'La primera y la segunda equipación deben tener colores principales distintos' }];
  }
  return [];
}

/** El local usa la primera; el visitante, la primera salvo que se confunda con la del local. */
export function equipacionEnPartido(
  local: Equipaciones,
  visitante: Equipaciones,
  p: ParametrosEquilibrado,
): { local: Equipacion; visitante: Equipacion } {
  const choca = distanciaColor(local.primera.principal, visitante.primera.principal) < p.equipaciones.umbralDistanciaColor;
  return { local: local.primera, visitante: choca ? visitante.segunda : visitante.primera };
}
