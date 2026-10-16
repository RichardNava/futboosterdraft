/**
 * Esquemas HTTP de partidas (T047; contracts/http-api.md).
 */
import { z } from 'zod';
import { ParticipanteSala } from '../ws/draft';

export const NivelNPC = z.enum(['amateur', 'intermedio', 'avanzado', 'PRO']);

export const CrearPartida = z.object({
  modo: z.enum(['liga', 'playoff', 'mixto']),
  numParticipantes: z.number().int(),
  tipoSimulacion: z.enum(['rapida', '2d']),
  ritmo: z.enum(['directo', 'asincrono']),
  plazoJornadaHoras: z.number().int().min(1).max(24 * 14).optional(),
  npc: z.array(z.object({ nivel: NivelNPC })).optional(),
  plazasHumanas: z.number().int().min(1).optional(),
  tiempos: z
    .object({
      busquedaS: z.number().int().positive(),
      turnoDraftS: z.number().int().positive(),
      preparacionS: z.number().int().positive(),
      preparacionInicialS: z.number().int().positive(),
      descansoS: z.number().int().positive(),
    })
    .partial()
    .optional(),
});
export type CrearPartida = z.infer<typeof CrearPartida>;

export const AnadirNPC = z.object({ nivel: NivelNPC });

export const ResumenPartida = z.object({
  id: z.string().uuid(),
  anfitrionId: z.string(),
  modo: z.enum(['liga', 'playoff', 'mixto']),
  numParticipantes: z.number().int(),
  tipoSimulacion: z.enum(['rapida', '2d']),
  ritmo: z.enum(['directo', 'asincrono']),
  plazoJornadaHoras: z.number().int(),
  estado: z.enum(['buscando', 'en_draft', 'en_torneo', 'terminada', 'cancelada', 'abandonada']),
  participantes: z.array(ParticipanteSala),
  miParticipanteId: z.string().nullable(),
});
export type ResumenPartida = z.infer<typeof ResumenPartida>;
