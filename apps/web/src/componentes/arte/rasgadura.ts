/**
 * Rasgadura propia de cada diseño de sobre (spec 011, US2-4; research R8): un `clip-path: polygon(...)` generado a
 * partir del id, con 17 a 23 vértices en el borde superior, picos de alto y ancho variables y la banda rota entre el
 * 8 % y el 22 % de la altura. El sobre original conserva su polígono de siempre (`.sobre-arte.rasgado`).
 */
import { fnv1a32 } from '@fbd/domain';

export const POLIGONO_ORIGINAL =
  'polygon(0% 16%, 5% 9%, 9% 19%, 14% 11%, 19% 22%, 25% 12%, 30% 18%, 36% 8%, 42% 20%, 48% 13%, 53% 21%, 59% 10%, 65% 19%, 70% 12%, 76% 22%, 82% 9%, 87% 18%, 93% 11%, 100% 17%, 100% 100%, 0 100%)';

/** mulberry32: suficiente para una forma decorativa reproducible. */
function generador(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const redondear = (x: number): number => Math.round(x * 10) / 10;

export function rasgaduraDe(id: string): string {
  if (id === 'sobre-original') return POLIGONO_ORIGINAL;
  const azar = generador(fnv1a32(id));
  // Vértices del borde (sin contar las dos esquinas inferiores): 17 a 23.
  const n = 17 + Math.floor(azar() * 7);
  // Anchos desiguales que suman el 100 %.
  const pesos = Array.from({ length: n - 1 }, () => 0.5 + azar());
  const total = pesos.reduce((a, b) => a + b, 0);
  const puntos: string[] = [];
  let x = 0;
  for (let i = 0; i < n; i++) {
    // Alterna valles y picos de profundidad variable dentro de la banda.
    const alto = i % 2 === 0 ? 15 + azar() * 7 : 8 + azar() * 7;
    puntos.push(`${redondear(i === n - 1 ? 100 : x)}% ${redondear(alto)}%`);
    if (i < n - 1) x += (pesos[i]! / total) * 100;
  }
  return `polygon(${[...puntos, '100% 100%', '0% 100%'].join(', ')})`;
}
