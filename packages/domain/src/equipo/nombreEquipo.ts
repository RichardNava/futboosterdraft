/**
 * Nombre de equipo (spec 003, FR-042 a FR-044; data-model §3.1): de 3 a 24 caracteres tras normalizar y único en
 * la partida sin distinguir mayúsculas (índice `(partida_id, lower(nombre_equipo))`).
 */
export const NOMBRE_MIN = 3;
export const NOMBRE_MAX = 24;

export type CodigoErrorNombre = 'NOMBRE_VACIO' | 'NOMBRE_CORTO' | 'NOMBRE_LARGO' | 'NOMBRE_REPETIDO';

export interface ErrorNombre {
  codigo: CodigoErrorNombre;
  mensaje: string;
}

/** Recorta los espacios del principio y del final y colapsa los internos repetidos. */
export function normalizarNombre(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/** Clave de comparación: normalizado y en minúsculas (la del índice único). */
export const claveNombre = (s: string): string => normalizarNombre(s).toLowerCase();

/**
 * Errores del nombre: vacío, corto (< 3), largo (> 24) o repetido (con otro equipo de la partida, sin distinguir
 * mayúsculas). `usados` son los nombres de los demás equipos.
 */
export function validarNombre(s: string, usados: Iterable<string>): ErrorNombre[] {
  const n = normalizarNombre(s);
  if (n.length === 0) return [{ codigo: 'NOMBRE_VACIO', mensaje: 'Escribe un nombre' }];
  const errores: ErrorNombre[] = [];
  if (n.length < NOMBRE_MIN) errores.push({ codigo: 'NOMBRE_CORTO', mensaje: `Mínimo ${NOMBRE_MIN} caracteres` });
  if (n.length > NOMBRE_MAX) errores.push({ codigo: 'NOMBRE_LARGO', mensaje: `Máximo ${NOMBRE_MAX} caracteres` });
  const clave = n.toLowerCase();
  for (const u of usados) {
    if (claveNombre(u) === clave) {
      errores.push({ codigo: 'NOMBRE_REPETIDO', mensaje: 'Ese nombre ya lo usa otro equipo' });
      break;
    }
  }
  return errores;
}

/**
 * «Equipo de {apodo}», recortado a 24 caracteres; si está ocupado, con el sufijo « 2», « 3»… (sin pasar de 24).
 */
export function nombrePorDefecto(apodo: string, usados: Iterable<string>): string {
  const ocupados = new Set([...usados].map(claveNombre));
  const base = normalizarNombre(`Equipo de ${normalizarNombre(apodo)}`).slice(0, NOMBRE_MAX).trim();
  if (!ocupados.has(base.toLowerCase())) return base;
  for (let i = 2; ; i++) {
    const sufijo = ` ${i}`;
    const candidato = `${base.slice(0, NOMBRE_MAX - sufijo.length).trim()}${sufijo}`;
    if (!ocupados.has(candidato.toLowerCase())) return candidato;
  }
}
