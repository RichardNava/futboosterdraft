/**
 * Mensajes de preparación y partido (T092; contracts/realtime-protocol.md).
 */
import { z } from 'zod';
import { RequestId } from './base';
import { FotogramaSchema } from './partido2d';

const Equipacion = z.object({ principal: z.string(), secundario: z.string() });

export const EventoPartidoSchema = z.object({
  tick: z.number(),
  minuto: z.string(),
  tipo: z.string(),
  equipo: z.enum(['local', 'visitante']),
  jugadores: z.array(z.object({ rol: z.string(), jugadorId: z.number() })),
  datos: z.record(z.unknown()),
  relevante: z.boolean(),
});

// ---- Servidor → cliente ----

export const MsgPreparacionInicio = z.object({
  t: z.literal('preparacion.inicio'),
  partidoId: z.string(),
  rival: z.object({ id: z.string(), nombre: z.string(), bajas: z.array(z.number()) }),
  venceEn: z.string().datetime(),
});

export const MsgPartidoInicio = z.object({
  t: z.literal('partido.inicio'),
  partidoId: z.string(),
  modalidad: z.enum(['rapida', '2d']),
  local: z.object({ id: z.string(), nombre: z.string() }),
  visitante: z.object({ id: z.string(), nombre: z.string() }),
  alineaciones: z.object({ local: z.unknown(), visitante: z.unknown() }),
  dorsales: z.record(z.number()),
  equipaciones: z.object({ local: Equipacion, visitante: Equipacion }),
});

export const MsgPartidoTramo = z.object({
  t: z.literal('partido.tramo'),
  partidoId: z.string(),
  desdeTick: z.number(),
  hastaTick: z.number(),
  eventos: z.array(EventoPartidoSchema),
  marcador: z.object({ local: z.number(), visitante: z.number(), penaltis: z.object({ local: z.number(), visitante: z.number() }).optional() }),
  estadisticas: z.unknown(),
  fase: z.string(),
  /** Minuto de juego en que acaba el tramo ("67'", "45+2'"). */
  minuto: z.string().optional(),
  /** Solo en 2D: un fotograma por segundo de juego del tramo. */
  fotogramas: z.array(FotogramaSchema).optional(),
});

export const MsgPartidoPausa = z.object({
  t: z.literal('partido.pausa_decision'),
  partidoId: z.string(),
  motivo: z.enum(['descanso', 'pre_prorroga']),
  venceEn: z.string().datetime(),
  listos: z.array(z.string()),
});

export const MsgPartidoDecisionAplicada = z.object({
  t: z.literal('partido.decision_aplicada'),
  partidoId: z.string(),
  participanteId: z.string(),
  tipo: z.string(),
  datos: z.unknown(),
  aplicadaEnTick: z.number(),
});

export const MsgPartidoFin = z.object({
  t: z.literal('partido.fin'),
  partidoId: z.string(),
  marcador: MsgPartidoTramo.shape.marcador,
  eventos: z.array(EventoPartidoSchema),
  estadisticas: z.unknown(),
  bajasNuevas: z.array(z.unknown()),
});

// ---- Cliente → servidor ----

export const MsgPartidoSeguir = z.object({ t: z.literal('partido.seguir'), requestId: RequestId, partidoId: z.string() });

export const MsgPartidoDecision = z.object({
  t: z.literal('partido.decision'),
  requestId: RequestId,
  partidoId: z.string(),
  tipo: z.enum(['sustitucion', 'formacion', 'tactica', 'lanzadores', 'recolocacion']),
  datos: z.record(z.unknown()),
});
export type MsgPartidoDecision = z.infer<typeof MsgPartidoDecision>;
