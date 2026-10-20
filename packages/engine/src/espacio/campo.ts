/**
 * Medidas reales del campo para las decisiones del motor 3.0.0 (spec 003, research R3 a R7): área, distancias
 * en metros y ángulo de tiro. Todo con enteros (décimas de unidad, `isqrt` y una tabla de tangentes en
 * milésimas), para que el partido sea idéntico en cualquier máquina (FR-040).
 *
 * Las coordenadas son las del equipo que ataca: x = 10.000 es la línea de gol rival.
 */
import { dist2, dividir, isqrt } from './aritmetica';
import type { ZonaRemate } from '../tipos';
import { CENTRO_Y, LARGO, type Punto } from './geometria';

/** El campo mide 105 m de largo: 10.000 décimas. */
const DECIMAS_LARGO = LARGO;
const METROS_LARGO = 105;

/** Área grande: x ≥ 8.430 e y entre 1.390 y 5.010 (16,5 m × 40,3 m). */
export const AREA = { x0: 8430, y0: 1390, y1: 5010 } as const;
/** Medio ancho de la portería (7,32 m / 2), en décimas. */
const MEDIA_PORTERIA = 349;
/** Último tercio del campo rival (x ≥ 6.667). */
export const ULTIMO_TERCIO = 6667;

/** Décimas de unidad de una distancia en metros (redondeada). */
export function decimasDeMetros(m: number): number {
  return Math.round((m * DECIMAS_LARGO) / METROS_LARGO);
}

/** Metros enteros de una distancia en décimas. */
export function metrosDeDecimas(d: number): number {
  return dividir(d * METROS_LARGO, DECIMAS_LARGO);
}

/** El punto (del atacante) está dentro del área rival real. */
export function enAreaRival(p: Punto): boolean {
  return p.x >= AREA.x0 && p.y >= AREA.y0 && p.y <= AREA.y1;
}

/** Distancia (décimas) de un punto del atacante al centro de la portería rival. */
export function distanciaPorteria(p: Punto): number {
  return isqrt(dist2(p.x, p.y, LARGO, CENTRO_Y));
}

/** Zona del remate: en el área, en la frontal (fuera del área y ≤ 25 m) o más lejos (research R6). */
export function zonaRemate(p: Punto): ZonaRemate {
  if (enAreaRival(p)) return 'area';
  return distanciaPorteria(p) <= decimasDeMetros(25) ? 'frontal' : 'lejos';
}

/** tan(g°) en milésimas, para g = 0…89. */
const TAN_MILESIMAS = [
  0, 17, 35, 52, 70, 87, 105, 123, 141, 158, 176, 194, 213, 231, 249, 268, 287, 306, 325, 344, 364, 384, 404, 424, 445, 466, 488, 510, 532, 554, 577, 601, 625, 649, 675,
  700, 727, 754, 781, 810, 839, 869, 900, 933, 966, 1000, 1036, 1072, 1111, 1150, 1192, 1235, 1280, 1327, 1376, 1428, 1483, 1540, 1600, 1664, 1732, 1804, 1881, 1963,
  2050, 2145, 2246, 2356, 2475, 2605, 2747, 2904, 3078, 3271, 3487, 3732, 4011, 4331, 4705, 5145, 5671, 6314, 7115, 8144, 9514, 11430, 14301, 19081, 28636, 57290,
] as const;

/**
 * Ángulo de tiro en grados enteros (0–90): la apertura entre los dos postes vista desde `p`. Con los vectores a
 * los postes `a` y `b`, tan θ = |a × b| / (a · b); se busca el mayor grado g con tan g ≤ tan θ. Si la apertura
 * es de 90° o más (pegado a la portería), devuelve 90.
 */
export function anguloTiro(p: Punto): number {
  const dx = LARGO - p.x;
  if (dx <= 0) return 0;
  const y1 = CENTRO_Y - MEDIA_PORTERIA - p.y;
  const y2 = CENTRO_Y + MEDIA_PORTERIA - p.y;
  const cruz = dx * (y2 - y1);
  const punto = dx * dx + y1 * y2;
  if (punto <= 0) return 90;
  let lo = 0;
  let hi = 89;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (cruz * 1000 >= TAN_MILESIMAS[m]! * punto) lo = m;
    else hi = m - 1;
  }
  return lo;
}
