/**
 * Formato común de errores HTTP (contracts/http-api.md):
 * `{ "error": { "codigo": "...", "mensaje": "...", "detalles": {} } }`.
 */
import { z } from 'zod';

export const RespuestaError = z.object({
  error: z.object({
    codigo: z.string().min(1),
    mensaje: z.string(),
    detalles: z.record(z.unknown()).default({}),
  }),
});
export type RespuestaError = z.infer<typeof RespuestaError>;

/** Códigos HTTP usados por la API para los errores de dominio. */
export const ESTADO_HTTP = {
  validacion: 400,
  sinSesion: 401,
  prohibido: 403,
  noEncontrado: 404,
  conflicto: 409,
  reglaDominio: 422,
} as const;
