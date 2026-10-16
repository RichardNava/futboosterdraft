/**
 * Mensajes de la simulación 2D (T135; contracts/realtime-protocol.md, research R11).
 *
 * El servidor envía cada tramo (de interrupción en interrupción) con sus fotogramas; cada cliente
 * reproduce a su velocidad y comunica por dónde va. El servidor solo simula el siguiente tramo cuando
 * todos los humanos han llegado a la interrupción, y la velocidad efectiva es la mínima de los dos.
 */
import { z } from 'zod';

export const VELOCIDADES_2D = [2, 4, 8, 16, 32] as const;
export const Velocidad2D = z.union([z.literal(2), z.literal(4), z.literal(8), z.literal(16), z.literal(32)]);
export type Velocidad2D = z.infer<typeof Velocidad2D>;

const Punto = z.tuple([z.number(), z.number()]);

/** Un fotograma por segundo de juego; coordenadas 0–1000 (largo) × 0–640 (ancho). */
export const FotogramaSchema = z.object({
  tick: z.number(),
  balon: Punto,
  j: z.record(Punto),
});
export type FotogramaMsg = z.infer<typeof FotogramaSchema>;

// ---- Servidor → cliente ----

/** Velocidad efectiva del partido: la mínima entre las elegidas por los humanos (FR-049). */
export const MsgPartidoVelocidadEfectiva = z.object({
  t: z.literal('partido.velocidad'),
  partidoId: z.string(),
  velocidadEfectiva: Velocidad2D,
});

// ---- Cliente → servidor ----

/** Velocidad que elige el participante (x2 … x32). */
export const MsgPartidoVelocidad = z.object({
  t: z.literal('partido.velocidad'),
  partidoId: z.string(),
  velocidad: Velocidad2D,
});
export type MsgPartidoVelocidad = z.infer<typeof MsgPartidoVelocidad>;

/** Reloj de reproducción del cliente (tick de juego que está mostrando), cada ~500 ms. */
export const MsgPartidoReproduccion = z.object({
  t: z.literal('partido.reproduccion'),
  partidoId: z.string(),
  tick: z.number().nonnegative(),
});
export type MsgPartidoReproduccion = z.infer<typeof MsgPartidoReproduccion>;
