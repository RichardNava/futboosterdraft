/**
 * Zonas del campo para la colocación libre (FR-034; research R13; data-model §2).
 *
 * Coordenadas del equipo: x = 0 en la propia línea de gol y 1000 en la rival; y = 0 en la banda izquierda y
 * 640 en la derecha. Cada zona es un rectángulo semiabierto `[x0, x1) × [y0, y1)` (la última franja de
 * cada eje incluye el borde del campo), con las posiciones que admite (la misma forma que una casilla, así
 * que `statsEfectivos` acepta una zona) y su línea. Las zonas cubren el campo sin huecos ni solapes; la de
 * portería tiene prioridad sobre las demás.
 */
import type { Posicion } from '../catalogo/tipos';

export const LARGO_CAMPO = 1000;
export const ANCHO_CAMPO = 640;

export type LineaZona = 'porteria' | 'defensa' | 'medio' | 'ataque';

export interface Zona {
  id: string;
  rect: { x0: number; x1: number; y0: number; y1: number };
  posicionesAdmitidas: readonly Posicion[];
  linea: LineaZona;
}

/** Zona de portería: x en [0, 110) e y en [200, 440). */
export const ZONA_PORTERIA: Zona = { id: 'POR', rect: { x0: 0, x1: 110, y0: 200, y1: 440 }, posicionesAdmitidas: ['POR'], linea: 'porteria' };

type Tramo = [x1: number, posiciones: readonly Posicion[], linea: LineaZona];

const ABREVIATURA: Record<LineaZona, string> = { porteria: 'POR', defensa: 'DEF', medio: 'MED', ataque: 'ATQ' };

/** Carriles (y) y sus tramos de x, de la propia portería a la rival. */
const CARRILES: readonly { id: string; y0: number; y1: number; tramos: readonly Tramo[] }[] = [
  {
    id: 'BI',
    y0: 0,
    y1: 140,
    tramos: [
      [230, ['LI'], 'defensa'],
      [330, ['CI'], 'defensa'],
      [440, ['CI'], 'medio'],
      [650, ['EI'], 'medio'],
      [LARGO_CAMPO, ['EI'], 'ataque'],
    ],
  },
  {
    id: 'II',
    y0: 140,
    y1: 240,
    tramos: [
      [280, ['DCI'], 'defensa'],
      [400, ['MD'], 'medio'],
      [560, ['MII'], 'medio'],
      [680, ['MCO'], 'medio'],
      [LARGO_CAMPO, ['EI'], 'ataque'],
    ],
  },
  {
    id: 'C',
    y0: 240,
    y1: 400,
    tramos: [
      [280, ['DCI', 'DCD'], 'defensa'],
      [400, ['MD'], 'medio'],
      [560, ['MC'], 'medio'],
      [660, ['MCO'], 'medio'],
      [750, ['SD'], 'ataque'],
      [LARGO_CAMPO, ['DC'], 'ataque'],
    ],
  },
  {
    id: 'ID',
    y0: 400,
    y1: 500,
    tramos: [
      [280, ['DCD'], 'defensa'],
      [400, ['MD'], 'medio'],
      [560, ['MID'], 'medio'],
      [680, ['MCO'], 'medio'],
      [LARGO_CAMPO, ['ED'], 'ataque'],
    ],
  },
  {
    id: 'BD',
    y0: 500,
    y1: ANCHO_CAMPO,
    tramos: [
      [230, ['LD'], 'defensa'],
      [330, ['CD'], 'defensa'],
      [440, ['CD'], 'medio'],
      [650, ['ED'], 'medio'],
      [LARGO_CAMPO, ['ED'], 'ataque'],
    ],
  },
];

/** Todas las zonas (sin la de portería, que se superpone con prioridad). */
export const ZONAS: readonly Zona[] = CARRILES.flatMap((carril) => {
  let x0 = 0;
  return carril.tramos.map(([x1, posiciones, linea]) => {
    const z: Zona = {
      id: `${carril.id}-${posiciones.length > 1 ? 'CENTRAL' : posiciones[0]}-${ABREVIATURA[linea]}`,
      rect: { x0, x1, y0: carril.y0, y1: carril.y1 },
      posicionesAdmitidas: posiciones,
      linea,
    };
    x0 = x1;
    return z;
  });
});

const dentro = (v: number, a: number, b: number, max: number) => v >= a && (v < b || (b === max && v === max));

/** ¿Está el punto dentro del campo? */
export function enCampo(x: number, y: number): boolean {
  return x >= 0 && x <= LARGO_CAMPO && y >= 0 && y <= ANCHO_CAMPO;
}

/** ¿Está el punto en la zona de portería? */
export function enPorteria(x: number, y: number): boolean {
  const r = ZONA_PORTERIA.rect;
  return x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1;
}

/** Zona que contiene el punto (la de portería tiene prioridad). Los puntos fuera del campo se acotan a él. */
export function zonaEn(x: number, y: number): Zona {
  const cx = Math.min(LARGO_CAMPO, Math.max(0, x));
  const cy = Math.min(ANCHO_CAMPO, Math.max(0, y));
  if (enPorteria(cx, cy)) return ZONA_PORTERIA;
  return ZONAS.find((z) => dentro(cx, z.rect.x0, z.rect.x1, LARGO_CAMPO) && dentro(cy, z.rect.y0, z.rect.y1, ANCHO_CAMPO))!;
}
