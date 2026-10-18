/**
 * Mensajes de la partida en general (spec 002, research R10): pausa de una partida de un solo humano al
 * navegar desde la barra.
 */
import { z } from 'zod';
import { RequestId } from './base';

// ---- Cliente → servidor ----

/**
 * Se envía al salir de la partida desde la barra. Solo tiene efecto si el participante es el único humano
 * (FR-021): detiene el turno del draft o la ventana del descanso y guarda el tiempo que quedaba. Al
 * reconectar, la partida se reanuda sola.
 */
export const MsgPartidaPausar = z.object({ t: z.literal('partida.pausar'), requestId: RequestId });
export type MsgPartidaPausar = z.infer<typeof MsgPartidaPausar>;

// ---- Servidor → cliente ----

/** Confirma la pausa (`true`) o la reanudación (`false`) de una partida de un humano. */
export const MsgPartidaPausada = z.object({ t: z.literal('partida.pausada'), pausada: z.boolean() });
export type MsgPartidaPausada = z.infer<typeof MsgPartidaPausada>;
