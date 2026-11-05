/**
 * Diseño del sobre en cada apertura: favorito o carrusel con baraja por cuenta (spec 011, data-model §4; research R9).
 */
import type { Rng } from '../rng/xoshiro';
import { SOBRE_ORIGINAL, type PreferenciasSobre } from './tipos';

const usaCarrusel = (p: PreferenciasSobre): boolean => p.sobreCarrusel && p.sobresMarcados.length > 1;
const favorito = (p: PreferenciasSobre): string =>
  p.sobreCarrusel ? (p.sobresMarcados[0] ?? SOBRE_ORIGINAL) : (p.sobreFavorito ?? SOBRE_ORIGINAL);

/** Diseño de los sobres decorativos: no avanza la baraja. */
export function sobreActual(p: PreferenciasSobre): string {
  if (!usaCarrusel(p)) return favorito(p);
  return p.sobreBaraja[0] ?? p.sobreUltimo ?? p.sobresMarcados[0]!;
}

/** Saca el diseño de la siguiente apertura y devuelve el estado nuevo de la baraja. */
export function siguienteSobre(p: PreferenciasSobre, rng: Rng): { diseno: string; preferencias: PreferenciasSobre } {
  if (!usaCarrusel(p)) return { diseno: favorito(p), preferencias: p };
  let baraja = p.sobreBaraja.filter((id) => p.sobresMarcados.includes(id));
  if (baraja.length === 0) {
    baraja = [...p.sobresMarcados];
    for (let i = baraja.length - 1; i > 0; i--) {
      const j = rng.entero(0, i);
      [baraja[i], baraja[j]] = [baraja[j]!, baraja[i]!];
    }
    // No repetir el último de la vuelta anterior al empezar la nueva.
    if (baraja[0] === p.sobreUltimo) [baraja[0], baraja[1]] = [baraja[1]!, baraja[0]!];
  }
  const [diseno, ...resto] = baraja as [string, ...string[]];
  return { diseno, preferencias: { ...p, sobreBaraja: resto, sobreUltimo: diseno } };
}

/** Descarta los ids que ya no están disponibles para la cuenta (retirados sin poseerlos). */
export function limpiarPreferenciasSobre(p: PreferenciasSobre, disponibles: ReadonlySet<string>): PreferenciasSobre {
  const ok = (id: string): boolean => disponibles.has(id);
  return {
    sobreFavorito: p.sobreFavorito !== null && ok(p.sobreFavorito) ? p.sobreFavorito : null,
    sobreCarrusel: p.sobreCarrusel,
    sobresMarcados: p.sobresMarcados.filter(ok),
    sobreBaraja: p.sobreBaraja.filter(ok),
    sobreUltimo: p.sobreUltimo,
  };
}
