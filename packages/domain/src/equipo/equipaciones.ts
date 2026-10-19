/**
 * Equipaciones (001/FR-031b; spec 003, FR-045 a FR-047, research R24, data-model §4): primera y segunda, cada
 * una con un diseño y de 1 a 3 colores. `colores[0]` es el principal; el dorsal va en su color de contraste.
 *
 * El parecido entre dos equipaciones se mide con el reparto de superficie de cada color según el diseño, y la
 * vista previa (`Camiseta`) y la chapa de la 2D dibujan las mismas regiones (`patronDiseno`).
 */
import type { ParametrosEquilibrado } from '../parametros/index';
import { Rng, type Semilla } from '../rng/xoshiro';

export const DISENOS_CAMISETA = ['lisa', 'rayas', 'franjas', 'banda', 'mitades'] as const;
export type DisenoCamiseta = (typeof DISENOS_CAMISETA)[number];

export interface Equipacion {
  diseno: DisenoCamiseta;
  /** 1–3 colores #rrggbb; colores[0] es el principal. */
  colores: [string] | [string, string] | [string, string, string];
}

export interface Equipaciones {
  primera: Equipacion;
  segunda: Equipacion;
}

/** Formato antiguo (v1), solo para convertirlo. */
export interface EquipacionV1 {
  principal: string;
  secundario: string;
}

export const PALETA = [
  '#d01010', '#1030d0', '#10a040', '#f0c000', '#ffffff', '#202020', '#7a1fa2', '#ff7a00',
  '#00a0c8', '#8b0000', '#0b2e6b', '#4a7a20', '#c0c0c0', '#e75480', '#6d4c41', '#00796b',
] as const;

/** Umbral de parecido a partir del cual dos equipaciones chocan (R24). */
export const UMBRAL_PARECIDO = 0.45;

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

export const principal = (e: Equipacion): string => e.colores[0];
export const colorDorsal = (e: Equipacion): string => colorDeContraste(principal(e));

/** Reparto de superficie por color de cada diseño (R24): c1, c2 y c3 (detalles). */
const SUPERFICIE: Readonly<Record<DisenoCamiseta, readonly [number, number, number]>> = {
  lisa: [0.9, 0.1, 0],
  rayas: [0.5, 0.4, 0.1],
  franjas: [0.5, 0.4, 0.1],
  banda: [0.75, 0.2, 0.05],
  mitades: [0.5, 0.45, 0.05],
};

/** Peso de cada color de la equipación; los de los colores que faltan se suman a c1. */
export function pesosSuperficie(e: Equipacion): number[] {
  const base = SUPERFICIE[e.diseno];
  const pesos = e.colores.map((_, i) => base[i]!);
  const sobrante = base.slice(e.colores.length).reduce((s, x) => s + x, 0);
  pesos[0] = pesos[0]! + sobrante;
  return pesos;
}

/** Parecido entre dos equipaciones, en [0, 1]: la superficie que comparten colores cercanos. */
export function parecido(a: Equipacion, b: Equipacion, p: ParametrosEquilibrado): number {
  const wa = pesosSuperficie(a);
  const wb = pesosSuperficie(b);
  let total = 0;
  a.colores.forEach((ca, i) =>
    b.colores.forEach((cb, j) => {
      if (distanciaColor(ca, cb) < p.equipaciones.umbralDistanciaColor) total += wa[i]! * wb[j]!;
    }),
  );
  return Math.min(1, Math.max(0, total));
}

export function chocan(a: Equipacion, b: Equipacion, p: ParametrosEquilibrado): boolean {
  return parecido(a, b, p) >= UMBRAL_PARECIDO - 1e-9;
}

/** Lisa con su color de contraste. */
const lisa = (c: string): Equipacion => ({ diseno: 'lisa', colores: [c, colorDeContraste(c)] });

export function equipacionesAleatorias(semilla: Semilla, p: ParametrosEquilibrado): Equipaciones {
  const rng = new Rng(semilla);
  const colores = rng.barajar(PALETA);
  const primera = colores[0]!;
  const segunda = colores.find((c) => distanciaColor(c, primera) >= p.equipaciones.umbralDistanciaColor)!;
  return { primera: lisa(primera), segunda: lisa(segunda) };
}

/**
 * El local usa la primera; el visitante, la primera si no choca con la del local, si no la segunda y, si chocan
 * las dos, una lisa con el color de la paleta más alejado de todos los del local (determinista).
 */
export function equipacionEnPartido(
  local: Equipaciones,
  visitante: Equipaciones,
  p: ParametrosEquilibrado,
): { local: Equipacion; visitante: Equipacion } {
  const l = local.primera;
  if (!chocan(l, visitante.primera, p)) return { local: l, visitante: visitante.primera };
  if (!chocan(l, visitante.segunda, p)) return { local: l, visitante: visitante.segunda };
  let mejor: string = PALETA[0];
  let mejorDistancia = -1;
  for (const c of PALETA) {
    const d = Math.min(...l.colores.map((x) => distanciaColor(c, x)));
    if (d > mejorDistancia) {
      mejorDistancia = d;
      mejor = c;
    }
  }
  return { local: l, visitante: lisa(mejor) };
}

// ---------- Patrón ----------

export interface RegionPatron {
  color: string;
  /** Polígono en coordenadas normalizadas (0..1), con el origen arriba a la izquierda. */
  puntos: [number, number][];
}

const rect = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

/**
 * Regiones del diseño en coordenadas normalizadas, en orden de pintado: el fondo con c1 y, encima, las del
 * diseño con c2 y los detalles (cuello y bocamangas) con c3, o con c2 si no hay c3. La usan el SVG `Camiseta` y
 * la chapa de la 2D, así que coinciden siempre (SC-022).
 */
export function patronDiseno(e: Equipacion): RegionPatron[] {
  const [c1, c2 = c1, c3] = e.colores;
  const detalle = c3 ?? c2;
  const regiones: RegionPatron[] = [{ color: c1, puntos: rect(0, 0, 1, 1) }];
  switch (e.diseno) {
    case 'lisa':
      break;
    case 'rayas':
      for (const x of [0.2, 0.6]) regiones.push({ color: c2, puntos: rect(x, 0, x + 0.2, 1) });
      break;
    case 'franjas':
      for (const y of [0.2, 0.6]) regiones.push({ color: c2, puntos: rect(0, y, 1, y + 0.2) });
      break;
    case 'banda':
      regiones.push({ color: c2, puntos: [[0, 0.15], [0.15, 0], [1, 0.85], [0.85, 1]] });
      break;
    case 'mitades':
      regiones.push({ color: c2, puntos: rect(0.5, 0, 1, 1) });
      break;
  }
  // Cuello (los detalles); en la lisa, el segundo color solo va aquí.
  regiones.push({ color: detalle, puntos: rect(0.35, 0, 0.65, 0.08) });
  return regiones;
}

/** Firma del patrón (para comparar la vista previa con la chapa de la 2D: `data-patron`). */
export function firmaPatron(e: Equipacion): string {
  return `${e.diseno}:${patronDiseno(e)
    .map((r) => `${r.color.toLowerCase()}@${r.puntos.map(([x, y]) => `${x},${y}`).join(' ')}`)
    .join('|')}`;
}

// ---------- Validación y conversión ----------

export type CodigoErrorEquipaciones = 'COLOR_INVALIDO' | 'DISENO_INVALIDO' | 'NUM_COLORES_INVALIDO' | 'EQUIPACIONES_PARECIDAS';

export interface ErrorEquipaciones {
  codigo: CodigoErrorEquipaciones;
  mensaje: string;
}

export function validarEquipaciones(e: Equipaciones, p: ParametrosEquilibrado): ErrorEquipaciones[] {
  const errores: ErrorEquipaciones[] = [];
  const ambas = [e?.primera, e?.segunda];
  if (ambas.some((x) => !x || !DISENOS_CAMISETA.includes(x.diseno))) {
    errores.push({ codigo: 'DISENO_INVALIDO', mensaje: 'Diseño de camiseta desconocido' });
  }
  if (ambas.some((x) => !Array.isArray(x?.colores) || x.colores.length < 1 || x.colores.length > 3)) {
    errores.push({ codigo: 'NUM_COLORES_INVALIDO', mensaje: 'Cada equipación lleva entre 1 y 3 colores' });
  }
  if (ambas.some((x) => Array.isArray(x?.colores) && x.colores.some((c) => typeof c !== 'string' || !HEX.test(c)))) {
    errores.push({ codigo: 'COLOR_INVALIDO', mensaje: 'Los colores deben tener el formato #rrggbb' });
  }
  if (errores.length === 0 && chocan(e.primera, e.segunda, p)) {
    errores.push({ codigo: 'EQUIPACIONES_PARECIDAS', mensaje: 'La primera y la segunda equipación se parecen demasiado' });
  }
  return errores;
}

function equipacionDesdeV1(x: unknown): Equipacion | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Partial<Equipacion & EquipacionV1>;
  if (typeof o.diseno === 'string' && Array.isArray(o.colores)) return o as Equipacion;
  if (typeof o.principal === 'string' && typeof o.secundario === 'string') return { diseno: 'lisa', colores: [o.principal, o.secundario] };
  return null;
}

/**
 * Convierte unas equipaciones v1 (`{ principal, secundario }`) en v2 (lisas con esos dos colores); si ya son v2,
 * las devuelve igual. `null` si el JSON no es ninguna de las dos.
 */
export function desdeV1(json: unknown): Equipaciones | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as { primera?: unknown; segunda?: unknown };
  const primera = equipacionDesdeV1(o.primera);
  const segunda = equipacionDesdeV1(o.segunda);
  return primera && segunda ? { primera, segunda } : null;
}
