/**
 * Tabla única de selecciones (spec 006, R6; FR-043). Códigos ISO 3166-1 alfa-3, más los cuatro de las naciones del
 * Reino Unido (`ENG`, `SCO`, `WAL`, `NIR`), que juegan por separado. `GBR` no es una selección.
 * Los nombres son textos de interfaz (llevan tildes).
 */
export const SELECCIONES = {
  ARG: { nombre: 'Argentina' },
  BEL: { nombre: 'Bélgica' },
  BRA: { nombre: 'Brasil' },
  CHL: { nombre: 'Chile' },
  COL: { nombre: 'Colombia' },
  DEU: { nombre: 'Alemania' },
  ENG: { nombre: 'Inglaterra' },
  ESP: { nombre: 'España' },
  FRA: { nombre: 'Francia' },
  HRV: { nombre: 'Croacia' },
  ITA: { nombre: 'Italia' },
  JPN: { nombre: 'Japón' },
  MAR: { nombre: 'Marruecos' },
  MEX: { nombre: 'México' },
  NGA: { nombre: 'Nigeria' },
  NIR: { nombre: 'Irlanda del Norte' },
  NLD: { nombre: 'Países Bajos' },
  PRT: { nombre: 'Portugal' },
  SCO: { nombre: 'Escocia' },
  SEN: { nombre: 'Senegal' },
  URY: { nombre: 'Uruguay' },
  USA: { nombre: 'Estados Unidos' },
  WAL: { nombre: 'Gales' },
} as const satisfies Record<string, { nombre: string }>;

export type CodigoSeleccion = keyof typeof SELECCIONES;

export const CODIGOS_SELECCION = Object.keys(SELECCIONES) as CodigoSeleccion[];

export function esSeleccion(codigo: unknown): codigo is CodigoSeleccion {
  return typeof codigo === 'string' && Object.hasOwn(SELECCIONES, codigo);
}
