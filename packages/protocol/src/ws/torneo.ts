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
          /** null mientras el partido esté "pendiente de ver" para quien recibe la vista (FR-030). */
          marcador: z.unknown(),
          /** `'pendiente_de_ver'` para un partido entre humanos que quien recibe la vista aún no ha visto. */
          estado: z.string(),
          resueltoAutomaticamente: z.boolean(),
          resolucion: z.enum(['directo', 'apertura', 'plazo', 'npc']).nullable().optional(),
        }),
      ),
    }),
  ),
  clasificacion: z.array(z.unknown()),
  cuadro: z.unknown(),
  campeon: Ref,
  /** Partidos propios que quien recibe la vista aún no ha visto: no cuentan en la clasificación (research R8). */
  pendientesDeVer: z.array(z.string()),
  /** `manual`: con un solo humano, la siguiente jornada se abre con «Siguiente jornada» (research R9). */
  siguienteJornada: z.enum(['manual', 'automatica']),
  /** Máximos goleadores y asistentes (10 primeras filas; FR-039 a FR-042). */
  goleadores: z.array(z.lazy(() => FilaGoleadores)),
  asistentes: z.array(z.lazy(() => FilaGoleadores)),
});

/** Fila de las tablas de goleadores y asistentes. */
export const FilaGoleadores = z.object({
  posicion: z.number().int(),
  jugador: z.object({ id: z.number().int(), nombre: z.string(), apellidos: z.string(), dorsal: z.number().int().optional() }),
  equipo: z.object({ id: z.string(), nombre: z.string() }),
  total: z.number().int(),
  partidosJugados: z.number().int(),
});

export const MsgAviso = z.object({
  t: z.literal('aviso'),
  id: z.string(),
  tipo: z.enum(['jornada_abierta', 'plazo_proximo', 'partido_auto_resuelto', 'torneo_terminado', 'dorsal_asignado']),
  partidaId: z.string(),
  partidoId: z.string().optional(),
  texto: z.string(),
});
