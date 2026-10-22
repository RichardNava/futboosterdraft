/**
 * Esquemas HTTP de alineación, dorsales y equipaciones (T067; contracts/http-api.md).
 */
import { z } from 'zod';

export const TacticaEntrada = z.object({
  sistemaDefensivo: z.enum(['zona', 'individual']),
  alturaBloque: z.enum(['catenaccio', 'medio', 'presion_alta']),
  lineaAdelantada: z.boolean(),
  estiloConBalon: z.enum(['equilibrado', 'contraataque', 'combinativo']),
  juegoVertical: z.boolean(),
});

export const AlineacionEntrada = z.object({
  formacion: z.enum(['3-4-3', '4-3-3', '4-4-2', '4-4-2-diamante', '4-2-3-1', '3-5-2', '5-4-1', '5-3-2', '4-5-1', '3-3-3-1']),
  titulares: z.array(z.object({ casillaId: z.string(), jugadorId: z.number().int() })).max(11),
  suplentes: z.array(z.number().int()).max(7),
  tactica: TacticaEntrada,
  lanzadores: z.object({
    penaltis: z.number().int(),
    faltas: z.number().int(),
    corners: z.number().int(),
    tanda: z.array(z.number().int()).max(5),
  }),
  /** Colocación libre de los titulares (FR-034): puntos enteros en coordenadas del equipo. */
  colocacion: z.array(z.object({ jugadorId: z.number().int(), x: z.number(), y: z.number() })).max(11).optional(),
});
export type AlineacionEntrada = z.infer<typeof AlineacionEntrada>;

/**
 * Campos añadidos a `GET /api/partidas/:id/alineacion` en el modo duelos (spec 005, FR-063, FR-063a): el once se
 * confirma una sola vez en la formación común y solo cuentan los titulares.
 */
export const AlineacionDuelos = z.object({
  bloqueada: z.boolean(),
  soloTitulares: z.literal(true),
  formacionFija: AlineacionEntrada.shape.formacion,
});
export type AlineacionDuelos = z.infer<typeof AlineacionDuelos>;

/** Reasignación de un dorsal (FR-037): si otro jugador lo llevaba, se queda sin dorsal. */
export const DorsalesEntrada = z.object({ jugadorId: z.number().int(), dorsal: z.number() });

const Color = z.string();
/** Equipación v2 (spec 003, FR-045): diseño y 1–3 colores. Las reglas finas las valida el dominio (422). */
export const EquipacionV2 = z.object({ diseno: z.string(), colores: z.array(Color) });
/** Equipación v1, aceptada durante el periodo de compatibilidad y convertida con `desdeV1`. */
const EquipacionV1 = z.object({ principal: Color, secundario: Color });
export const EquipacionesEntrada = z.object({
  primera: z.union([EquipacionV2, EquipacionV1]),
  segunda: z.union([EquipacionV2, EquipacionV1]),
});
export type EquipacionesEntrada = z.infer<typeof EquipacionesEntrada>;
