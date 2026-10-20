/**
 * Perfil de usuario (spec 003, FR-042a, FR-045; contracts/http-api.md): nombre de equipo y equipaciones por
 * defecto de los usuarios registrados.
 */
import { z } from 'zod';
import { EquipacionesEntrada } from './alineacion';

export const CuerpoPerfil = z.object({
  nombreEquipo: z.string().nullable(),
  equipaciones: EquipacionesEntrada.nullable(),
});
export type CuerpoPerfil = z.infer<typeof CuerpoPerfil>;
