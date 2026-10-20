/**
 * Esquemas HTTP de partidas (T047; contracts/http-api.md).
 */
import { z } from 'zod';
import { ParticipanteSala } from '../ws/draft';

export const NivelNPC = z.enum(['amateur', 'intermedio', 'avanzado', 'PRO']);
/** Dificultad de la partida: niveles del relleno automático de NPC (spec 003, FR-038a). */
export const Dificultad = z.enum(['facil', 'normal', 'dificil']);

/**
 * El ritmo ya no se elige: se deduce del número de humanos (research R9). El esquema es estricto, así que
 * un cuerpo con `ritmo` (o con los tiempos de preparación que desaparecen) se rechaza con un 400.
 *
 * El tipo de simulación tampoco (spec 003, FR-034): se elige en cada partido. Los clientes antiguos que aún lo
 * envían no fallan: `tipoSimulacion` se acepta y se ignora.
 */
export const CrearPartida = z
  .object({
  modo: z.enum(['liga', 'playoff', 'mixto']),
  numParticipantes: z.number().int(),
  /** Obsoleto (spec 003): se ignora. */
  tipoSimulacion: z.unknown().optional(),
  plazoJornadaHoras: z.number().int().min(1).max(24 * 14).optional(),
  npc: z.array(z.object({ nivel: NivelNPC })).optional(),
  plazasHumanas: z.number().int().min(1).optional(),
  /** Por defecto, `'normal'`. */
  dificultad: Dificultad.optional(),
  tiempos: z
    .object({
      busquedaS: z.number().int().positive(),
      turnoDraftS: z.number().int().positive(),
      descansoS: z.number().int().positive(),
    })
    .strict()
    .partial()
    .optional(),
  })
  .strict();
export type CrearPartida = z.infer<typeof CrearPartida>;

export const AnadirNPC = z.object({ nivel: NivelNPC });

export const ResumenPartida = z.object({
  id: z.string().uuid(),
  anfitrionId: z.string(),
  modo: z.enum(['liga', 'playoff', 'mixto']),
  numParticipantes: z.number().int(),
  /** Hay plazos de jornada: la partida tiene 2 o más humanos activos (research R9). */
  conPlazos: z.boolean(),
  plazoJornadaHoras: z.number().int(),
  dificultad: Dificultad,
  estado: z.enum(['buscando', 'en_draft', 'en_torneo', 'terminada', 'cancelada', 'abandonada']),
  participantes: z.array(ParticipanteSala),
  miParticipanteId: z.string().nullable(),
});
export type ResumenPartida = z.infer<typeof ResumenPartida>;

/** Partida en la lista «Mis partidas» (FR-017; contracts/http-api.md). */
export const PartidaResumen = z.object({
  id: z.string(),
  modo: z.string(),
  /** Estado de la partida: buscando, en_draft, en_torneo, finalizada o abandonada. */
  fase: z.string(),
  nombreEquipo: z.string(),
  rival: z.string().optional(),
  jornadaActual: z.number().int().optional(),
  accionPendiente: z.enum(['elegir', 'jugar', 'ver', 'siguiente_jornada']).optional(),
  actualizadaEn: z.string().datetime(),
});
export type PartidaResumen = z.infer<typeof PartidaResumen>;

/** `GET /api/mis-partidas`. */
export const MisPartidas = z.object({ enCurso: z.array(PartidaResumen), terminadas: z.array(PartidaResumen) });
export type MisPartidas = z.infer<typeof MisPartidas>;

/** `POST /api/partidas/:id/simular-resto` (spec 003, FR-041a). */
export const RespuestaSimularResto = z.object({ ok: z.literal(true), campeon: z.object({ id: z.string(), nombre: z.string() }) });
export type RespuestaSimularResto = z.infer<typeof RespuestaSimularResto>;

/** `POST /api/partidas/:id/pantalla-vista` (spec 003, FR-041). */
export const CuerpoPantallaVista = z.object({ pantalla: z.enum(['derrota', 'campeon']) });
export type CuerpoPantallaVista = z.infer<typeof CuerpoPantallaVista>;

/** `PUT /api/partidas/:id/nombre-equipo` (spec 003, FR-042). */
export const CuerpoNombreEquipo = z.object({ nombre: z.string() });
export type CuerpoNombreEquipo = z.infer<typeof CuerpoNombreEquipo>;
