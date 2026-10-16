/**
 * Duelo de stats (T082; research R7).
 *
 * probabilidad = sigmoide(base + pendiente · (atacante − defensor)) + ajustes, recortada a
 * [mínima, máxima] y expresada en milésimas enteras. La sigmoide es racional
 * (0,5 + x / (2·(1 + |x|))): solo sumas, productos y divisiones, de modo que el resultado es idéntico
 * en cualquier ejecución.
 */
import type { ParametrosEquilibrado, Rng } from '@fbd/domain';

export function sigmoide(x: number): number {
  return 0.5 + x / (2 * (1 + Math.abs(x)));
}

export interface Duelo {
  /** Desplazamiento base de la acción (más alto = más fácil). */
  base: number;
  atacante: number;
  defensor: number;
  /** Desplazamientos adicionales en la escala de la sigmoide (formación, táctica…). */
  desplazamiento?: number;
  /** Ajustes directos de probabilidad (specials como Aura: +0,04). */
  ajuste?: number;
}

/** Probabilidad de éxito del atacante, en milésimas (0–1000). */
export function probabilidad(d: Duelo, p: ParametrosEquilibrado): number {
  const x = d.base + p.duelo.pendiente * (d.atacante - d.defensor) + (d.desplazamiento ?? 0);
  const prob = sigmoide(x) + (d.ajuste ?? 0);
  const recortada = Math.min(p.duelo.probabilidadMaxima, Math.max(p.duelo.probabilidadMinima, prob));
  return Math.round(recortada * 1000);
}

/**
 * Resuelve un duelo. `rerollAtacante`: el atacante tira dos veces y se queda con la mejor
 * (Filigranas, Guante en el pie). `rerollDefensor`: el defensor también (Muro defensivo, Santo): el
 * atacante tiene que ganar las dos.
 */
export function resolver(rng: Rng, milesimas: number, opciones: { rerollAtacante?: boolean; rerollDefensor?: boolean } = {}): boolean {
  const tirada = () => rng.entero(0, 999) < milesimas;
  const atacante = opciones.rerollAtacante === true;
  const defensor = opciones.rerollDefensor === true;
  // Si los dos repiten, las ventajas se anulan: una sola tirada.
  if (atacante === defensor) return tirada();
  const a = tirada();
  const b = tirada();
  return atacante ? a || b : a && b;
}
