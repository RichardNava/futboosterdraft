/**
 * Nivel de rareza del draft (spec 013, FR-012 a FR-019; data-model §2.1 y §2.3).
 *
 * El nivel lo elige quien crea la partida y fija cuántas cartas de cada nivel lleva cada sobre de la mesa. El reparto
 * de cada nivel vive en los parámetros de equilibrado (`sobres.niveles`).
 */

export type NivelRareza = 'pobre' | 'escaso' | 'moderado' | 'abundante' | 'rico';

/** En el orden de la interfaz. */
export const NIVELES_RAREZA: readonly NivelRareza[] = ['pobre', 'escaso', 'moderado', 'abundante', 'rico'];

export const NIVEL_RAREZA_POR_DEFECTO: NivelRareza = 'moderado';

export function esNivelRareza(v: unknown): v is NivelRareza {
  return typeof v === 'string' && (NIVELES_RAREZA as readonly string[]).includes(v);
}

/**
 * Cartas de cada nivel en un sobre: `superclase + crack + legendario + altas = 8`. Cada carta alta es GOAT con
 * probabilidad `probGoatEnAlta` y Legendario si no.
 */
export interface RepartoSobre {
  superclase: number;
  crack: number;
  legendario: number;
  altas: number;
  probGoatEnAlta: number;
}

/** Ajuste `acceso_niveles_rareza`: `libre` (todos gratis) o `restringido` (FR-019). */
export type AccesoNivel = 'libre' | 'restringido';

export type ResultadoAccesoNivel = { permitido: true; coste: number } | { permitido: false; motivo: 'INVITADO' };

/** Tabla de FR-019 (data-model §2.3). */
export function accesoNivelRareza(e: {
  nivel: NivelRareza;
  acceso: AccesoNivel;
  tipoUsuario: 'registrado' | 'invitado';
  premiumActivo: boolean;
  precio: number;
}): ResultadoAccesoNivel {
  if (e.acceso === 'libre' || e.nivel === NIVEL_RAREZA_POR_DEFECTO) return { permitido: true, coste: 0 };
  if (e.tipoUsuario === 'invitado') return { permitido: false, motivo: 'INVITADO' };
  return { permitido: true, coste: e.premiumActivo ? 0 : e.precio };
}
