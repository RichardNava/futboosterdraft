/**
 * Mensajes de sala y draft (T046; contracts/realtime-protocol.md).
 */
import { z } from 'zod';
import { RequestId } from './base';

export const JugadorResumen = z.object({
  id: z.number().int(),
  nombre: z.string(),
  apellidos: z.string(),
  demarcacion: z.enum(['POR', 'DEF', 'MED', 'DEL']),
  posicion: z.array(z.string()),
  media: z.number(),
  nivel: z.enum(['Superclase', 'Epico', 'Legendario', 'GOAT']),
  specials: z.array(z.string()),
  stats: z.record(z.number()),
});
export type JugadorResumen = z.infer<typeof JugadorResumen>;

export const ParticipanteSala = z.object({
  id: z.string(),
  nombre: z.string(),
  tipo: z.enum(['humano', 'npc']),
  nivelNPC: z.enum(['amateur', 'intermedio', 'avanzado', 'PRO']).nullable(),
  conectado: z.boolean(),
  esAnfitrion: z.boolean(),
});
export type ParticipanteSala = z.infer<typeof ParticipanteSala>;

// ---- Servidor → cliente ----

export const MsgSalaActualizada = z.object({
  t: z.literal('sala.actualizada'),
  participantes: z.array(ParticipanteSala),
  plazasLibres: z.number().int(),
  venceBusquedaEn: z.string().datetime().nullable(),
});
export type MsgSalaActualizada = z.infer<typeof MsgSalaActualizada>;

export const MsgDraftTurno = z.object({
  t: z.literal('draft.turno'),
  mesa: z.number().int(),
  ronda: z.number().int().min(1).max(3),
  turno: z.number().int().min(1).max(8),
  direccion: z.enum(['izquierda', 'derecha']),
  sobre: z.object({ id: z.string(), cartas: z.array(JugadorResumen) }),
  venceEn: z.string().datetime(),
  misElecciones: z.array(JugadorResumen),
});
export type MsgDraftTurno = z.infer<typeof MsgDraftTurno>;

/** Alguien ha elegido: no incluye qué carta (FR-007). */
export const MsgDraftProgreso = z.object({
  t: z.literal('draft.progreso'),
  ronda: z.number().int(),
  turno: z.number().int(),
  eligieron: z.array(z.string()),
});
export type MsgDraftProgreso = z.infer<typeof MsgDraftProgreso>;

export const MsgDraftEleccionAuto = z.object({
  t: z.literal('draft.eleccion_auto'),
  ronda: z.number().int(),
  turno: z.number().int(),
  jugador: JugadorResumen,
});
export type MsgDraftEleccionAuto = z.infer<typeof MsgDraftEleccionAuto>;

export const MsgDraftTerminado = z.object({
  t: z.literal('draft.terminado'),
  plantillas: z.array(z.object({ participanteId: z.string(), jugadores: z.array(JugadorResumen) })),
});
export type MsgDraftTerminado = z.infer<typeof MsgDraftTerminado>;

// ---- Cliente → servidor ----

export const MsgDraftElegir = z.object({
  t: z.literal('draft.elegir'),
  requestId: RequestId,
  ronda: z.number().int().min(1).max(3),
  turno: z.number().int().min(1).max(8),
  jugadorId: z.number().int(),
});
export type MsgDraftElegir = z.infer<typeof MsgDraftElegir>;
