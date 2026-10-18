/**
 * Geometría de la capa espacial (research R3): coordenadas, celdas lógicas y anclas.
 *
 * - Coordenadas absolutas en décimas de unidad: x de 0 a 10000 (el local ataca hacia x = 10000), y de 0 a
 *   6400. Las del protocolo (fotogramas) son las mismas en unidades (÷ 10).
 * - Coordenadas de un equipo: x = 0 en su propia línea de gol; para el visitante, el campo girado 180°.
 * - La rejilla lógica del motor (6 zonas × 3 carriles desde el punto de vista del equipo con el balón) se
 *   corresponde con rectángulos del campo: el balón está siempre dentro de la celda de su zona y carril.
 */
import { FORMACIONES, FORMACIONES_IDS, type Posicion } from '@fbd/domain';
import type { EquipoEstado, JugadorEnPartido } from '../estado/estado';
import type { Lado } from '../tipos';
import { acotar, dividir } from './aritmetica';

export const LARGO = 10000;
export const ANCHO = 6400;
export const CENTRO_Y = ANCHO / 2;
/** Margen que se deja dentro de una celda al elegir un punto en ella. */
const MARGEN_CELDA = 150;

export interface Punto {
  x: number;
  y: number;
}

/** De coordenadas de un equipo a absolutas (y al revés: es simétrico). */
export function aAbsoluta(lado: Lado, p: Punto): Punto {
  return lado === 'local' ? { x: p.x, y: p.y } : { x: LARGO - p.x, y: ANCHO - p.y };
}
export const aEquipo = aAbsoluta;

/** Límites de una celda de la rejilla lógica, en coordenadas del equipo con el balón. */
export function celda(zona: number, carril: number): { x0: number; x1: number; y0: number; y1: number } {
  const z = acotar(zona, 0, 5);
  const c = acotar(carril, 0, 2);
  return {
    x0: dividir(z * LARGO, 6),
    x1: dividir((z + 1) * LARGO, 6),
    y0: dividir(c * ANCHO, 3),
    y1: dividir((c + 1) * ANCHO, 3),
  };
}

/** Centro de una celda en coordenadas del equipo. */
export function centroCelda(zona: number, carril: number): Punto {
  const c = celda(zona, carril);
  return { x: dividir(c.x0 + c.x1, 2), y: dividir(c.y0 + c.y1, 2) };
}

/** El punto de la celda más cercano a `p` (coordenadas del equipo), con un margen hacia dentro. */
export function puntoEnCelda(zona: number, carril: number, p: Punto): Punto {
  const c = celda(zona, carril);
  return {
    x: acotar(p.x, c.x0 + MARGEN_CELDA, c.x1 - MARGEN_CELDA),
    y: acotar(p.y, c.y0 + MARGEN_CELDA, c.y1 - MARGEN_CELDA),
  };
}

/** Zona y carril (del equipo `lado`) del punto absoluto `p`. */
export function zonaCarrilDe(lado: Lado, p: Punto): { zona: number; carril: number } {
  const q = aEquipo(lado, p);
  return { zona: acotar(Math.floor((q.x * 6) / LARGO), 0, 5), carril: acotar(Math.floor((q.y * 3) / ANCHO), 0, 2) };
}

export type Linea = 'porteria' | 'defensa' | 'medio' | 'ataque';

const LINEA_DE_POSICION: Readonly<Record<Posicion, Linea>> = {
  POR: 'porteria',
  LI: 'defensa',
  LD: 'defensa',
  DCI: 'defensa',
  DCD: 'defensa',
  CI: 'defensa',
  CD: 'defensa',
  MD: 'medio',
  MC: 'medio',
  MII: 'medio',
  MID: 'medio',
  MCO: 'medio',
  DC: 'ataque',
  SD: 'ataque',
  EI: 'ataque',
  ED: 'ataque',
};

/** Línea de cada casilla de cada formación, precalculada (se consulta en cada paso del movimiento). */
const LINEA_DE_CASILLA: Readonly<Record<string, Readonly<Record<string, Linea>>>> = Object.fromEntries(
  FORMACIONES_IDS.map((f) => [f, Object.fromEntries(FORMACIONES[f].casillas.map((c) => [c.id, LINEA_DE_POSICION[c.posicionesAdmitidas[0]!]]))]),
);

/** Línea en la que juega un titular (por su posición efectiva o la de su casilla). */
export function lineaDe(equipo: EquipoEstado, j: JugadorEnPartido): Linea {
  if (j.casillaId === 'POR') return 'porteria';
  if (j.posicion) return LINEA_DE_POSICION[j.posicion];
  return (j.casillaId && LINEA_DE_CASILLA[equipo.formacion]?.[j.casillaId]) || 'medio';
}

/** Punto de la casilla de un jugador en su formación, en décimas y coordenadas del equipo. */
export function puntoDeCasilla(equipo: EquipoEstado, casillaId: string | null): Punto {
  const casilla = casillaId ? FORMACIONES[equipo.formacion].casillas.find((c) => c.id === casillaId) : undefined;
  return casilla ? { x: casilla.zona.x * 10, y: casilla.zona.y * 10 } : { x: 4500, y: CENTRO_Y };
}

/** Ancla táctica de un titular (su punto de la colocación o el de su casilla), en décimas del equipo. */
export function anclaDe(equipo: EquipoEstado, j: JugadorEnPartido): Punto {
  return j.ancla ? { x: j.ancla.x * 10, y: j.ancla.y * 10 } : puntoDeCasilla(equipo, j.casillaId);
}

/**
 * Tras una expulsión o una lesión sin cambio, los que quedan en cada línea se reparten el ancho que ocupaba
 * la línea completa (Edge Case "Expulsión o lesión sin cambio"; research R3).
 */
export function repartirAnclas(equipo: EquipoEstado): void {
  const casillas = FORMACIONES[equipo.formacion].casillas;
  const porLinea = new Map<Linea, JugadorEnPartido[]>();
  for (const j of equipo.jugadores) {
    if (!j.enCampo) continue;
    const l = lineaDe(equipo, j);
    if (l === 'porteria') continue;
    porLinea.set(l, [...(porLinea.get(l) ?? []), j]);
  }
  for (const [l, jugadores] of porLinea) {
    const deLinea = casillas.filter((c) => c.id !== 'POR' && LINEA_DE_POSICION[c.posicionesAdmitidas[0]!] === l);
    if (deLinea.length === jugadores.length || jugadores.length === 0) continue;
    const ys = deLinea.map((c) => c.zona.y);
    const xs = deLinea.map((c) => c.zona.x);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const xMedia = Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
    const ordenados = [...jugadores].sort((a, b) => anclaDe(equipo, a).y - anclaDe(equipo, b).y || a.id - b.id);
    ordenados.forEach((j, i) => {
      const y = ordenados.length === 1 ? Math.round((yMin + yMax) / 2) : Math.round(yMin + ((yMax - yMin) * i) / (ordenados.length - 1));
      j.ancla = { x: j.ancla?.x ?? xMedia, y };
    });
  }
}
