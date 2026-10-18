/**
 * Esquemas HTTP de los partidos de la spec 002 (contracts/http-api.md; research R8).
 */
import { z } from 'zod';
import { EventoPartidoSchema, MsgPartidoInicio } from '../ws/partido';

/** «Comenzar partido» o «Ver partido»: en directo contra un NPC, o reproducción si el rival es humano. */
export const RespuestaAbrir = z.object({ modo: z.enum(['directo', 'reproduccion']) });
export type RespuestaAbrir = z.infer<typeof RespuestaAbrir>;

const Marcador = z.object({
  local: z.number(),
  visitante: z.number(),
  penaltis: z.object({ local: z.number(), visitante: z.number() }).optional(),
});

/** Un tramo de la reproducción: de interrupción en interrupción (2D) o una parte (simulación rápida). */
export const TramoReproduccion = z.object({
  desdeTick: z.number(),
  hastaTick: z.number(),
  fase: z.string(),
  minuto: z.string(),
  eventos: z.array(EventoPartidoSchema),
  marcador: Marcador,
  acciones: z.array(z.unknown()).optional(),
  fotogramas: z.array(z.unknown()).optional(),
});

/** `GET /api/partidos/:id/reproduccion`: el partido entero, igual para sus dos participantes. */
export const RespuestaReproduccion = z.object({
  inicio: MsgPartidoInicio,
  tramos: z.array(TramoReproduccion),
  fin: z.object({ marcador: Marcador, estadisticas: z.unknown(), eventos: z.array(EventoPartidoSchema) }),
});
export type RespuestaReproduccion = z.infer<typeof RespuestaReproduccion>;

/** `GET /api/partidos/:id` para quien aún no ha visto el partido: sin marcador ni eventos. */
export const PartidoPendienteDeVer = z.object({
  id: z.string(),
  estado: z.literal('pendiente_de_ver'),
  jornada: z.number().int(),
  local: z.object({ id: z.string(), nombre: z.string() }),
  visitante: z.object({ id: z.string(), nombre: z.string() }),
});
