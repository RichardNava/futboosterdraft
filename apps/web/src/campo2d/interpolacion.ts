/**
 * Interpolación entre fotogramas v2 (research R5): el servidor envía un fotograma cada 2 ticks (más uno al
 * empezar y al terminar cada acción) y el cliente dibuja a 60 fps.
 *
 * - Jugadores: Hermite cúbica con las velocidades estimadas de los fotogramas vecinos (Catmull-Rom no
 *   uniforme), así que la posición y la velocidad son continuas al pasar de un fotograma al siguiente. Para
 *   que no haga bucles, nunca se aleja más de un radio de chapa del tramo entre los dos fotogramas.
 * - Balón: lineal en el plano (cambia de dirección de golpe en cada toque, como debe) y una parábola en la
 *   altura `z` por los tres fotogramas más cercanos, que reproduce exactamente la de un balón aéreo.
 * - Fotograma v2: `[tick, bx, by, bz, x0, y0, x1, y1, …]` con los jugadores en el orden de
 *   `ordenJugadores`; (-1, -1) = fuera del campo.
 */
export type Fotograma = readonly number[];

/** Radio de una chapa en unidades de campo: lo más que la curva puede salirse del tramo entre fotogramas. */
export const RADIO_CHAPA = 15;

export interface Posiciones {
  balon: [number, number, number];
  jugadores: Map<number, [number, number]>;
  /** Velocidad de cada jugador (unidades por tick), para orientar su chapa. */
  velocidades: Map<number, [number, number]>;
}

/** Añade fotogramas nuevos a una lista ordenada, sin repetir ticks. */
export function agregarFotogramas(destino: Fotograma[], nuevos: readonly Fotograma[]): void {
  for (const f of nuevos) {
    const ultimo = destino.at(-1);
    if (!ultimo || f[0]! > ultimo[0]!) destino.push(f);
  }
}

/** Índice del último fotograma con `tick ≤ t` (búsqueda binaria; los fotogramas van ordenados). */
export function indiceFotograma(fotogramas: readonly Fotograma[], t: number): number {
  let bajo = 0;
  let alto = fotogramas.length - 1;
  if (alto < 0 || t < fotogramas[0]![0]!) return -1;
  while (bajo < alto) {
    const medio = (bajo + alto + 1) >> 1;
    if (fotogramas[medio]![0]! <= t) bajo = medio;
    else alto = medio - 1;
  }
  return bajo;
}

const fuera = (f: Fotograma, i: number) => f[i] === -1 && f[i + 1] === -1;

/** Pendiente (por tick) de la coordenada `i` en el fotograma `k`, a partir de sus vecinos dentro del campo. */
function pendiente(fs: readonly Fotograma[], k: number, i: number, coord: 0 | 1): number {
  const indice = i + coord;
  const actual = fs[k]!;
  const antes = k > 0 && !fuera(fs[k - 1]!, i) ? fs[k - 1]! : actual;
  const despues = k < fs.length - 1 && !fuera(fs[k + 1]!, i) ? fs[k + 1]! : actual;
  const dt = despues[0]! - antes[0]!;
  return dt > 0 ? (despues[indice]! - antes[indice]!) / dt : 0;
}

/** Hermite cúbica en `s ∈ [0, 1]` con duración `h`: posición y derivada (por tick). */
function hermite(p0: number, p1: number, m0: number, m1: number, h: number, s: number): [number, number] {
  const s2 = s * s;
  const s3 = s2 * s;
  const p = (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * h * m1;
  const v = ((6 * s2 - 6 * s) * p0) / h + (3 * s2 - 4 * s + 1) * m0 + ((-6 * s2 + 6 * s) * p1) / h + (3 * s2 - 2 * s) * m1;
  return [p, v];
}

/** Parábola (Lagrange) por tres puntos `(t, z)`, evaluada en `t`. */
function parabola(t: number, a: Fotograma, b: Fotograma, c: Fotograma): number {
  const [ta, tb, tc] = [a[0]!, b[0]!, c[0]!];
  const [za, zb, zc] = [a[3]!, b[3]!, c[3]!];
  if (za === 0 && zb === 0 && zc === 0) return 0;
  const la = ((t - tb) * (t - tc)) / ((ta - tb) * (ta - tc));
  const lb = ((t - ta) * (t - tc)) / ((tb - ta) * (tb - tc));
  const lc = ((t - ta) * (t - tb)) / ((tc - ta) * (tc - tb));
  return Math.max(0, za * la + zb * lb + zc * lc);
}

/** Posiciones en el tick `t` (fraccionario). Fuera del rango, el fotograma más cercano. */
export function posicionesEn(fotogramas: readonly Fotograma[], orden: readonly number[], t: number): Posiciones | null {
  const n = fotogramas.length;
  if (n === 0) return null;
  const k = Math.min(Math.max(0, indiceFotograma(fotogramas, t)), n - 1);
  const a = fotogramas[k]!;
  const b = fotogramas[Math.min(k + 1, n - 1)]!;
  const h = b[0]! - a[0]!;
  const s = h > 0 ? Math.min(1, Math.max(0, (t - a[0]!) / h)) : 0;

  const jugadores = new Map<number, [number, number]>();
  const velocidades = new Map<number, [number, number]>();
  for (let j = 0; j < orden.length; j++) {
    const i = 4 + 2 * j;
    const id = orden[j]!;
    const sinA = fuera(a, i);
    const sinB = fuera(b, i);
    if (sinA && sinB) continue;
    // Quien entra aparece en su sitio; quien sale desaparece al llegar al fotograma siguiente.
    if (sinA || sinB || h === 0) {
      const f = sinA ? b : a;
      if (sinB && s >= 1) continue;
      jugadores.set(id, [f[i]!, f[i + 1]!]);
      velocidades.set(id, [0, 0]);
      continue;
    }
    const kb = Math.min(k + 1, n - 1);
    const [x, vx] = hermite(a[i]!, b[i]!, pendiente(fotogramas, k, i, 0), pendiente(fotogramas, kb, i, 0), h, s);
    const [y, vy] = hermite(a[i + 1]!, b[i + 1]!, pendiente(fotogramas, k, i, 1), pendiente(fotogramas, kb, i, 1), h, s);
    const acotar = (v: number, p: number, q: number) => Math.min(Math.max(p, q) + RADIO_CHAPA, Math.max(Math.min(p, q) - RADIO_CHAPA, v));
    jugadores.set(id, [acotar(x, a[i]!, b[i]!), acotar(y, a[i + 1]!, b[i + 1]!)]);
    velocidades.set(id, [vx, vy]);
  }

  const bx = a[1]! + (b[1]! - a[1]!) * s;
  const by = a[2]! + (b[2]! - a[2]!) * s;
  let bz = 0;
  if (n >= 3) {
    // Los tres fotogramas más cercanos a `t`.
    const inicio = Math.min(Math.max(0, s < 0.5 ? k - 1 : k), n - 3);
    bz = parabola(t, fotogramas[inicio]!, fotogramas[inicio + 1]!, fotogramas[inicio + 2]!);
  } else {
    bz = a[3]! + (b[3]! - a[3]!) * s;
  }
  return { balon: [bx, by, bz], jugadores, velocidades };
}
