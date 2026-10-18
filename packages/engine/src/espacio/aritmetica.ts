/**
 * Aritmética entera de la capa espacial (research R3). Las posiciones y velocidades son enteros en décimas
 * de unidad de campo; solo se usan sumas, productos, divisiones enteras y una raíz cuadrada entera, para que
 * el partido sea idéntico en cualquier máquina y versión del motor de JavaScript (FR-040).
 */

/**
 * Raíz cuadrada entera: el mayor r con r² ≤ n. `Math.sqrt` está correctamente redondeada en IEEE 754 (igual en
 * cualquier motor de JavaScript), y la corrección final la hace exacta para cualquier entero seguro.
 */
export function isqrt(n: number): number {
  if (n <= 0) return 0;
  let r = Math.floor(Math.sqrt(n));
  while (r * r > n) r--;
  while ((r + 1) * (r + 1) <= n) r++;
  return r;
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

/** Longitud entera de un vector. */
export function norma(dx: number, dy: number): number {
  return isqrt(dx * dx + dy * dy);
}

/** División entera redondeada al más cercano (simétrica respecto al cero). */
export function dividir(a: number, b: number): number {
  const q = Math.trunc(a / b);
  const r = a - q * b;
  if (2 * Math.abs(r) >= Math.abs(b)) return q + (a < 0 !== b < 0 ? -1 : 1);
  return q;
}

/** El vector (dx, dy) con longitud `largo` (en enteros). Un vector nulo se queda nulo. */
export function escalar(dx: number, dy: number, largo: number): [number, number] {
  // La norma, en milésimas, para que también los vectores cortos conserven su dirección y su longitud.
  const n = isqrt((dx * dx + dy * dy) * 1_000_000);
  if (n === 0) return [0, 0];
  return [dividir(dx * largo * 1000, n), dividir(dy * largo * 1000, n)];
}

/** Acorta el vector si es más largo que `maximo`. */
export function limitar(dx: number, dy: number, maximo: number): [number, number] {
  return dx * dx + dy * dy > maximo * maximo ? escalar(dx, dy, maximo) : [dx, dy];
}

export const acotar = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);
