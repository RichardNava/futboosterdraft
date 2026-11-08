/**
 * Validación de los datos de un cosmético (spec 012, data-model §2): `datos` obligatorio en las celebraciones y
 * prohibido en los demás tipos; duración positiva y, en las de juego, de 3 s como mucho (FR-009).
 */
import { DURACION_MAXIMA_CELEBRACION_JUEGO_MS, type TipoCosmetico } from './tipos';

/** Devuelve los problemas encontrados (vacío si es válido). */
export function validarDatosCosmetico(tipo: TipoCosmetico, datos: unknown): string[] {
  if (tipo !== 'celebracion') return datos == null ? [] : ['Solo las celebraciones llevan datos'];
  if (datos == null || typeof datos !== 'object') return ['Una celebración necesita datos'];
  const d = datos as Record<string, unknown>;
  const errores: string[] = [];
  if (d.clase !== 'juego' && d.clase !== 'secuencia') errores.push(`Clase de celebración desconocida: ${String(d.clase)}`);
  if (typeof d.duracionMs !== 'number' || !Number.isFinite(d.duracionMs) || d.duracionMs <= 0) errores.push('La duración debe ser mayor que 0');
  else if (d.clase === 'juego' && d.duracionMs > DURACION_MAXIMA_CELEBRACION_JUEGO_MS) {
    errores.push(`Una celebración de juego dura como mucho ${DURACION_MAXIMA_CELEBRACION_JUEGO_MS} ms`);
  }
  if (d.sonido !== undefined && typeof d.sonido !== 'string') errores.push('El sonido debe ser el nombre de un efecto');
  return errores;
}
