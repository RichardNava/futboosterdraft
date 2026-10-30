import type { Nivel } from '@fbd/domain';

/** Etiquetas con tilde para la interfaz: en el código y en los datos los valores no llevan tildes. */
export const ETIQUETA_NIVEL: Readonly<Record<Nivel, string>> = {
  Superclase: 'Superclase',
  Crack: 'Crack',
  Legendario: 'Legendario',
  GOAT: 'GOAT',
};

/** Niveles de los NPC tal como se muestran en la interfaz. */
export type NivelNPC = 'amateur' | 'intermedio' | 'avanzado' | 'PRO';

export const ETIQUETA_NIVEL_NPC: Readonly<Record<NivelNPC, string>> = {
  amateur: 'Amateur',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
  PRO: 'PRO',
};

/** Dificultad de la partida (spec 003, FR-038a). */
export type Dificultad = 'facil' | 'normal' | 'dificil';

export const ETIQUETA_DIFICULTAD: Readonly<Record<Dificultad, string>> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
};

/** Niveles de los NPC de relleno con cada dificultad, tal como se explican en la interfaz. */
export const DESCRIPCION_DIFICULTAD: Readonly<Record<Dificultad, string>> = {
  facil: 'NPC amateur e intermedios a partes iguales',
  normal: 'NPC amateur, intermedios o avanzados al azar',
  dificil: 'NPC intermedios y avanzados a partes iguales',
};

/** Texto del distintivo de un NPC ("NPC · Avanzado"); vacío si lo controla una persona. */
export function etiquetaNPC(nivel: string | null | undefined): string {
  return nivel ? `NPC · ${ETIQUETA_NIVEL_NPC[nivel as NivelNPC] ?? nivel}` : '';
}

export const ETIQUETA_DEMARCACION = {
  POR: 'Portero',
  DEF: 'Defensa',
  MED: 'Centrocampista',
  DEL: 'Atacante',
} as const;

/** Abreviaturas de stats que se muestran en la ficha (especificación, "Abreviaturas"). */
export const ABREVIATURA_STAT: Readonly<Record<string, string>> = {
  agilidad: 'AGI',
  colocacion: 'COL',
  distribucion: 'DIS',
  aereo: 'AER',
  defensa: 'DEF',
  liderazgo: 'LID',
  velocidad: 'VEL',
  tecnica: 'TEC',
  tackling: 'TAK',
  anticipacion: 'ANT',
  marcaje: 'MAR',
  pase: 'PAS',
  posicionamiento: 'POS',
  vision: 'VIS',
  disparo: 'DIS',
  regate: 'REG',
  finalizacion: 'FIN',
  desmarque: 'DES',
  creatividad: 'CRE',
  agresividad: 'AGR',
};
