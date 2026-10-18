/**
 * Mensajes de preparación y partido (T092; contracts/realtime-protocol.md).
 */
import { z } from 'zod';
import { RequestId } from './base';
import { AccionVisibleSchema, FotogramaSchema } from './partido2d';

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
  jornada: z.number().int().nullable(),
  partidoId: z.string(),
  rival: z.object({ id: z.string(), nombre: z.string(), bajas: z.array(z.number()), humano: z.boolean() }),
  /** Plazo de la jornada; solo con varios humanos (research R9). */
  venceEn: z.string().datetime().optional(),
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
  /** false al ver un partido entre humanos ya resuelto: no hay panel de cambios (FR-030). */
  decisiones: z.boolean(),
  /** Orden de los jugadores en los fotogramas v2 (los del local y después los del visitante). */
  ordenJugadores: z.array(z.number().int()),
  /** Dorsales que se han dado al empezar a convocados que no tenían (FR-038). */
  dorsalesAsignados: z.array(z.object({ jugadorId: z.number().int(), dorsal: z.number().int() })).optional(),
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
  /** Acciones con balón del tramo (research R4). */
  acciones: z.array(AccionVisibleSchema),
  /** Solo en 2D: fotogramas v2 del tramo (research R5). */
  fotogramas: z.array(FotogramaSchema).optional(),
  /** Los tramos ya enviados no se rehacen nunca (research R6). */
  provisional: z.literal(false),
});

export const MsgPartidoPausa = z.object({
  t: z.literal('partido.pausa_decision'),
  partidoId: z.string(),
  motivo: z.enum(['descanso', 'pre_prorroga']),
  /** Límite de la ventana frente a un humano ausente; «Seguir» reanuda al instante (FR-012). */
  venceEn: z.string().datetime(),
});

export const MsgPartidoDecisionAplicada = z.object({
  t: z.literal('partido.decision_aplicada'),
  partidoId: z.string(),
  participanteId: z.string(),
  tipo: z.string(),
  datos: z.unknown(),
  aplicadaEnTick: z.number(),
  /** Minuto de juego en que se aplica ("67'"), para «Se aplicará en el minuto N». */
  minuto: z.string().optional(),
});

export const MsgPartidoFin = z.object({
  t: z.literal('partido.fin'),
  partidoId: z.string(),
  marcador: MsgPartidoTramo.shape.marcador,
  eventos: z.array(EventoPartidoSchema),
  /** Estadísticas finales de cada equipo, con pases, precisión de pase, centros y tiros (FR-024). */
  estadisticas: z.unknown(),
  bajasNuevas: z.array(z.unknown()),
});

// ---- Cliente → servidor ----

export const MsgPartidoSeguir = z.object({ t: z.literal('partido.seguir'), requestId: RequestId, partidoId: z.string() });

/**
 * «Finalizar partido» (FR-026 a FR-028; research R7): en un partido en directo del participante, 2D o
 * rápido, en cualquier fase menos `finalizado`. Es idempotente.
 */
export const MsgPartidoFinalizar = z.object({ t: z.literal('partido.finalizar'), requestId: RequestId, partidoId: z.string() });
export type MsgPartidoFinalizar = z.infer<typeof MsgPartidoFinalizar>;

export const MsgPartidoDecision = z.object({
  t: z.literal('partido.decision'),
  requestId: RequestId,
  partidoId: z.string(),
  tipo: z.enum(['sustitucion', 'formacion', 'tactica', 'lanzadores', 'recolocacion']),
  datos: z.record(z.unknown()),
});
export type MsgPartidoDecision = z.infer<typeof MsgPartidoDecision>;
