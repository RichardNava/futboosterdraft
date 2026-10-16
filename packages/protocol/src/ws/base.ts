/**
 * Formato común de los mensajes WebSocket (contracts/realtime-protocol.md).
 * Todo mensaje es `{ t: "<tipo>", ...datos }`. El cliente envía intenciones; el servidor decide.
 */
import { z } from 'zod';

export const RequestId = z.string().uuid();

export const ErrorProtocolo = z.object({
  codigo: z.string().min(1),
  mensaje: z.string(),
});
export type ErrorProtocolo = z.infer<typeof ErrorProtocolo>;

// ---- Servidor → cliente ----

export const MsgAck = z.union([
  z.object({ t: z.literal('ack'), requestId: RequestId, ok: z.literal(true) }),
  z.object({ t: z.literal('ack'), requestId: RequestId, ok: z.literal(false), error: ErrorProtocolo }),
]);
export type MsgAck = z.infer<typeof MsgAck>;

export const MsgError = z.object({ t: z.literal('error') }).merge(ErrorProtocolo);
export type MsgError = z.infer<typeof MsgError>;

export const FaseVista = z.enum(['sala', 'draft', 'preparacion', 'partido', 'torneo']);
export type FaseVista = z.infer<typeof FaseVista>;

/**
 * Instantánea completa visible para el participante. Su contenido (`vista`) lo define cada fase;
 * aquí solo se fija el sobre común.
 */
export const MsgEstado = z.object({
  t: z.literal('estado'),
  serverTime: z.string().datetime(),
  fase: FaseVista,
  vista: z.unknown(),
});
export type MsgEstado = z.infer<typeof MsgEstado>;

export const MsgPong = z.object({ t: z.literal('pong') });

// ---- Cliente → servidor ----

export const MsgPing = z.object({ t: z.literal('ping') });

/** Todo mensaje del cliente que cambia estado lleva `requestId` para descartar duplicados (FR-062). */
export const conRequestId = <T extends z.ZodRawShape>(forma: T) => z.object({ requestId: RequestId, ...forma });
