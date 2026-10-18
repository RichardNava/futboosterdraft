/**
 * Mensajes de la simulación 2D (contracts/realtime-protocol.md de la spec 002, research R5 y R6).
 *
 * - La velocidad es solo del cliente (x2, x4 o x8): ya no hay `partido.velocidad` ni velocidad común.
 * - El cliente informa por dónde va (`partido.reproduccion`, cada ~250 ms) y el servidor mantiene
 *   simulados 60 ticks por delante de ese punto (búfer de anticipación, FR-025a).
 * - Fotogramas v2: `[tick, bx, by, bz, x0, y0, x1, y1, …]`, enteros en unidades de campo (0–1000 de largo,
 *   0–640 de ancho), con los jugadores en el orden de `partido.inicio.ordenJugadores`; (-1, -1) = fuera
 *   del campo. Uno cada 2 ticks, más uno al empezar y al terminar cada acción.
 */
import { z } from 'zod';

export const VELOCIDADES_2D = [2, 4, 8] as const;
export const Velocidad2D = z.union([z.literal(2), z.literal(4), z.literal(8)]);
export type Velocidad2D = z.infer<typeof Velocidad2D>;

/** Fotograma v2 (research R5). */
export const FotogramaSchema = z.array(z.number().int());
export type FotogramaMsg = z.infer<typeof FotogramaSchema>;

/** Acción con balón visible en la 2D (research R4, data-model §7.5). */
export const AccionVisibleSchema = z.object({
  tipo: z.enum(['pase_corto', 'pase_largo', 'pase_espacio', 'conduccion', 'regate', 'centro', 'tiro', 'despeje', 'saque', 'control']),
  inicioTick: z.number().int(),
  finTick: z.number().int(),
  de: z.number().int(),
  a: z.number().int().optional(),
  exito: z.boolean(),
});
export type AccionVisibleMsg = z.infer<typeof AccionVisibleSchema>;

// ---- Cliente → servidor ----

/** Reloj de reproducción del cliente: tick de juego que está mostrando y su velocidad, cada ~250 ms. */
export const MsgPartidoReproduccion = z.object({
  t: z.literal('partido.reproduccion'),
  partidoId: z.string(),
  tick: z.number().int().nonnegative(),
  velocidad: Velocidad2D,
});
export type MsgPartidoReproduccion = z.infer<typeof MsgPartidoReproduccion>;
