/**
 * Tabla única de selecciones (spec 006, R6; FR-043). Códigos ISO 3166-1 alfa-3, más los cuatro de las naciones del
 * Reino Unido (`ENG`, `SCO`, `WAL`, `NIR`), que juegan por separado, y `XKX` para Kosovo (sin código ISO oficial). `GBR` no es una selección.
 * Los nombres son textos de interfaz (llevan tildes).
 */
export const SELECCIONES = {
  ARG: { nombre: 'Argentina' },
  AUT: { nombre: 'Austria' },
  BEL: { nombre: 'Bélgica' },
  BRA: { nombre: 'Brasil' },
  CAN: { nombre: 'Canadá' },
  CHE: { nombre: 'Suiza' },
  CHL: { nombre: 'Chile' },
  CIV: { nombre: 'Costa de Marfil' },
  CMR: { nombre: 'Camerún' },
  COD: { nombre: 'RD del Congo' },
  COL: { nombre: 'Colombia' },
  CRI: { nombre: 'Costa Rica' },
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
  ISL: { nombre: 'Islandia' },
  ITA: { nombre: 'Italia' },
  JPN: { nombre: 'Japón' },
  KOR: { nombre: 'Corea del Sur' },
  MAR: { nombre: 'Marruecos' },
  MEX: { nombre: 'México' },
  MLI: { nombre: 'Malí' },
  NGA: { nombre: 'Nigeria' },
  NIR: { nombre: 'Irlanda del Norte' },
  NLD: { nombre: 'Países Bajos' },
  NOR: { nombre: 'Noruega' },
  PER: { nombre: 'Perú' },
  POL: { nombre: 'Polonia' },
  PRT: { nombre: 'Portugal' },
  PRY: { nombre: 'Paraguay' },
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
  XKX: { nombre: 'Kosovo' },
} as const satisfies Record<string, { nombre: string }>;

export type CodigoSeleccion = keyof typeof SELECCIONES;

export const CODIGOS_SELECCION = Object.keys(SELECCIONES) as CodigoSeleccion[];

/** El valor es un código de selección conocido. */
export function esSeleccion(codigo: unknown): codigo is CodigoSeleccion {
  return typeof codigo === 'string' && Object.hasOwn(SELECCIONES, codigo);
}
