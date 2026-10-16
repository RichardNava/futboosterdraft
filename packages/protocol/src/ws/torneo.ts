/**
 * Mensajes del torneo (T115; contracts/realtime-protocol.md).
 */
import { z } from 'zod';

const Ref = z.object({ id: z.string(), nombre: z.string() }).nullable();

export const MsgTorneoActualizado = z.object({
  t: z.literal('torneo.actualizado'),
  modo: z.enum(['liga', 'playoff', 'mixto']),
  fase: z.enum(['liga', 'eliminatoria']).nullable(),
  jornadaActual: z.number().int().nullable(),
  jornadas: z.array(
    z.object({
      numero: z.number().int(),
      tipo: z.string(),
      estado: z.enum(['pendiente', 'abierta', 'cerrada']),
      abreEn: z.string().nullable(),
      venceEn: z.string().nullable(),
      descansa: Ref,
      partidos: z.array(
        z.object({
          partidoId: z.string().nullable(),
          local: Ref,
          visitante: Ref,
          marcador: z.unknown(),
          estado: z.string(),
          resueltoAutomaticamente: z.boolean(),
          listos: z.array(z.string()),
        }),
      ),
    }),
  ),
  clasificacion: z.array(z.unknown()),
  cuadro: z.unknown(),
  campeon: Ref,
});

export const MsgAviso = z.object({
  t: z.literal('aviso'),
  id: z.string(),
  tipo: z.enum(['jornada_abierta', 'rival_listo', 'plazo_proximo', 'partido_auto_resuelto', 'torneo_terminado']),
  partidaId: z.string(),
  partidoId: z.string().optional(),
  texto: z.string(),
});
