/**
 * Mínimo de la colección activa (spec 006, R11; FR-012, FR-013). La colección activa debe tener, en cada combinación
 * demarcación × nivel, al menos las cartas de `minimos`, para que cualquier mesa de 8 se pueda generar. Desde la spec 008
 * Core no cumple exactamente `DISTRIBUCION_CORE`: quien aplica la regla pasa el recuento de la propia Core, que es el
 * pool que `generador.test` prueba.
 * El servidor lo aplica con las filas bloqueadas; el cliente solo lo usa para explicarlo.
 */
import { DISTRIBUCION_CORE, type RecuentoCatalogo } from '../catalogo/coleccionCore';
import { DEMARCACIONES, NIVELES, type Demarcacion, type Jugador, type Nivel } from '../catalogo/tipos';

export interface IncumplimientoMinimo {
  demarcacion: Demarcacion;
  nivel: Nivel;
  minimo: number;
  activas: number;
}

export type ResultadoMinimo = { ok: true } | ({ ok: false } & IncumplimientoMinimo);

export interface EstadoMinimo {
  cumple: boolean;
  incumplidas: IncumplimientoMinimo[];
}

/** ¿Se puede retirar `cambio` de las activas sin bajar del mínimo de su combinación? */
export function comprobarMinimoActivo(
  activas: RecuentoCatalogo,
  cambio: Pick<Jugador, 'demarcacion' | 'nivel'>,
  minimos: RecuentoCatalogo = DISTRIBUCION_CORE,
): ResultadoMinimo {
  const { demarcacion, nivel } = cambio;
  const minimo = minimos[demarcacion][nivel];
  const actuales = activas[demarcacion][nivel];
  return actuales - 1 >= minimo ? { ok: true } : { ok: false, demarcacion, nivel, minimo, activas: actuales };
}

export function estadoMinimo(activas: RecuentoCatalogo, minimos: RecuentoCatalogo = DISTRIBUCION_CORE): EstadoMinimo {
  const incumplidas = DEMARCACIONES.flatMap((demarcacion) =>
    NIVELES.filter((nivel) => activas[demarcacion][nivel] < minimos[demarcacion][nivel]).map((nivel) => ({
      demarcacion,
      nivel,
      minimo: minimos[demarcacion][nivel],
      activas: activas[demarcacion][nivel],
    })),
  );
  return { cumple: incumplidas.length === 0, incumplidas };
}
