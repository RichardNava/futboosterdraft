/**
 * NPC básico provisional (T045): elige la carta de mayor media del sobre y, con empate, la primera.
 * El servidor lo usa para cualquier nivel hasta que la fase US5 implemente los niveles reales.
 */
export function elegirCartaBasico(cartas: readonly number[], medias: Readonly<Record<number, number>>): number {
  if (cartas.length === 0) throw new Error('El sobre está vacío');
  let mejor = cartas[0]!;
  for (const id of cartas) if ((medias[id] ?? 0) > (medias[mejor] ?? 0)) mejor = id;
  return mejor;
}
