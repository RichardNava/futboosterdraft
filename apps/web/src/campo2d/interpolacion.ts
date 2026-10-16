/**
 * Interpolación lineal entre fotogramas (T137): el servidor envía un fotograma por segundo de juego y
 * el cliente dibuja a 60 fps, así que cada imagen mezcla los dos fotogramas que rodean al tick actual.
 */
export interface Fotograma {
  tick: number;
  balon: [number, number];
  j: Record<string, [number, number]>;
}

export interface Posiciones {
  balon: [number, number];
  jugadores: Map<number, [number, number]>;
}

/** Índice del último fotograma con `tick ≤ t` (búsqueda binaria; los fotogramas van ordenados). */
export function indiceFotograma(fotogramas: readonly Fotograma[], t: number): number {
  let bajo = 0;
  let alto = fotogramas.length - 1;
  if (alto < 0 || t < fotogramas[0]!.tick) return -1;
  while (bajo < alto) {
    const medio = (bajo + alto + 1) >> 1;
    if (fotogramas[medio]!.tick <= t) bajo = medio;
    else alto = medio - 1;
  }
  return bajo;
}

const mezclar = (a: [number, number], b: [number, number], f: number): [number, number] => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];

/** Posiciones en el tick `t` (fraccionario). Fuera del rango, el fotograma más cercano. */
export function posicionesEn(fotogramas: readonly Fotograma[], t: number): Posiciones | null {
  if (fotogramas.length === 0) return null;
  const i = Math.max(0, indiceFotograma(fotogramas, t));
  const a = fotogramas[i]!;
  const b = fotogramas[Math.min(i + 1, fotogramas.length - 1)]!;
  const f = b.tick > a.tick ? Math.min(1, Math.max(0, (t - a.tick) / (b.tick - a.tick))) : 0;
  const jugadores = new Map<number, [number, number]>();
  for (const [id, pos] of Object.entries(b.j)) {
    const antes = a.j[id];
    // Un jugador que acaba de entrar aparece directamente en su sitio.
    jugadores.set(Number(id), antes ? mezclar(antes, pos, f) : pos);
  }
  // Los que ya no están en el fotograma siguiente (sustituidos o expulsados) desaparecen al llegar a él.
  if (f < 1) for (const [id, pos] of Object.entries(a.j)) if (!b.j[id]) jugadores.set(Number(id), pos);
  return { balon: mezclar(a.balon, b.balon, f), jugadores };
}
