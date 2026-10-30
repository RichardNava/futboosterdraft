/**
 * Tabla única de selecciones (spec 006, R6; FR-043). Códigos ISO 3166-1 alfa-3, más los cuatro de las naciones del
 * Reino Unido (`ENG`, `SCO`, `WAL`, `NIR`), que juegan por separado. `GBR` no es una selección.
 * Los nombres son textos de interfaz (llevan tildes).
 */
export const SELECCIONES = {
  ARG: { nombre: 'Argentina' },
  BEL: { nombre: 'Bélgica' },
  BRA: { nombre: 'Brasil' },
  CAN: { nombre: 'Canadá' },
  CHE: { nombre: 'Suiza' },
  CHL: { nombre: 'Chile' },
  CIV: { nombre: 'Costa de Marfil' },
  CMR: { nombre: 'Camerún' },
  COD: { nombre: 'RD del Congo' },
  COL: { nombre: 'Colombia' },
  DEU: { nombre: 'Alemania' },
  DNK: { nombre: 'Dinamarca' },
  DZA: { nombre: 'Argelia' },
  ECU: { nombre: 'Ecuador' },
  EGY: { nombre: 'Egipto' },
  ENG: { nombre: 'Inglaterra' },
  ESP: { nombre: 'España' },
  FRA: { nombre: 'Francia' },
  GEO: { nombre: 'Georgia' },
  GHA: { nombre: 'Ghana' },
  GMB: { nombre: 'Gambia' },
  GRC: { nombre: 'Grecia' },
  HRV: { nombre: 'Croacia' },
  HUN: { nombre: 'Hungría' },
  IRL: { nombre: 'Irlanda' },
  ITA: { nombre: 'Italia' },
  JPN: { nombre: 'Japón' },
  MAR: { nombre: 'Marruecos' },
  MEX: { nombre: 'México' },
  MLI: { nombre: 'Malí' },
  NGA: { nombre: 'Nigeria' },
  NIR: { nombre: 'Irlanda del Norte' },
  NLD: { nombre: 'Países Bajos' },
  NOR: { nombre: 'Noruega' },
  POL: { nombre: 'Polonia' },
  PRT: { nombre: 'Portugal' },
  RUS: { nombre: 'Rusia' },
  SCO: { nombre: 'Escocia' },
  SEN: { nombre: 'Senegal' },
  SRB: { nombre: 'Serbia' },
  SVK: { nombre: 'Eslovaquia' },
  SVN: { nombre: 'Eslovenia' },
  SWE: { nombre: 'Suecia' },
  TUR: { nombre: 'Turquía' },
  UKR: { nombre: 'Ucrania' },
  URY: { nombre: 'Uruguay' },
  USA: { nombre: 'Estados Unidos' },
  UZB: { nombre: 'Uzbekistán' },
  WAL: { nombre: 'Gales' },
} as const satisfies Record<string, { nombre: string }>;

export type CodigoSeleccion = keyof typeof SELECCIONES;

export const CODIGOS_SELECCION = Object.keys(SELECCIONES) as CodigoSeleccion[];

export function esSeleccion(codigo: unknown): codigo is CodigoSeleccion {
  return typeof codigo === 'string' && Object.hasOwn(SELECCIONES, codigo);
}
