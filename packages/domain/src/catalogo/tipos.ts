/**
 * Tipos del catálogo de jugadores (data-model §1.1 y §1.2; FR-016 a FR-023).
 * Identificadores y valores sin tildes; las etiquetas con tilde viven en la interfaz.
 */

export const DEMARCACIONES = ['POR', 'DEF', 'MED', 'DEL'] as const;
export type Demarcacion = (typeof DEMARCACIONES)[number];

export const POSICIONES = [
  'POR',
  'LI',
  'LD',
  'DCI',
  'DCD',
  'CI',
  'CD',
  'MD',
  'MC',
  'MII',
  'MID',
  'MCO',
  'DC',
  'SD',
  'EI',
  'ED',
] as const;
export type Posicion = (typeof POSICIONES)[number];

export const POSICIONES_POR_DEMARCACION: Readonly<Record<Demarcacion, readonly Posicion[]>> = {
  POR: ['POR'],
  DEF: ['LI', 'LD', 'DCI', 'DCD', 'CI', 'CD'],
  MED: ['MD', 'MC', 'MII', 'MID', 'MCO'],
  DEL: ['DC', 'SD', 'EI', 'ED'],
};

export const NIVELES = ['Superclase', 'Epico', 'Legendario', 'GOAT'] as const;
export type Nivel = (typeof NIVELES)[number];

/** Máximo de specials por nivel (FR-021). */
export const MAX_SPECIALS: Readonly<Record<Nivel, number>> = {
  Superclase: 1,
  Epico: 2,
  Legendario: 3,
  GOAT: 4,
};

export const SPECIALS_GENERICOS = [
  'Incansable',
  'Motivador',
  'LanzadorFaltas',
  'LanzadorPenalties',
  'Aura',
  'Capitania',
  'Filigranas',
  'FortalezaMental',
  'Intimidante',
  'Elegante',
  'Presionador',
  'RecuperadorTrasPerdida',
  'Carismatico',
  'Potente',
  'Robusto',
] as const;

export const SPECIALS_POR = ['Parapenalties', 'OneToOne', 'Santo', 'Ordenabarreras', 'JugadorDeCampo'] as const;
export const SPECIALS_DEF = ['Infranqueable', 'Jerarquia', 'Volador', 'Libero', 'MuroDefensivo'] as const;
export const SPECIALS_MED = ['Llegador', 'BoxToBox', 'PrimerToque', 'Todocampista', 'JugadorEntreLineas'] as const;
export const SPECIALS_DEL = ['Matador', 'Rematador', 'Cabeceador', 'Desbordante', 'GuanteEnElPie'] as const;

export type SpecialGenerico = (typeof SPECIALS_GENERICOS)[number];
export type SpecialPOR = (typeof SPECIALS_POR)[number];
export type SpecialDEF = (typeof SPECIALS_DEF)[number];
export type SpecialMED = (typeof SPECIALS_MED)[number];
export type SpecialDEL = (typeof SPECIALS_DEL)[number];
export type Special = SpecialGenerico | SpecialPOR | SpecialDEF | SpecialMED | SpecialDEL;

export const SPECIALS_POR_DEMARCACION: Readonly<Record<Demarcacion, readonly Special[]>> = {
  POR: SPECIALS_POR,
  DEF: SPECIALS_DEF,
  MED: SPECIALS_MED,
  DEL: SPECIALS_DEL,
};

export const TODOS_LOS_SPECIALS: readonly Special[] = [
  ...SPECIALS_GENERICOS,
  ...SPECIALS_POR,
  ...SPECIALS_DEF,
  ...SPECIALS_MED,
  ...SPECIALS_DEL,
];

/** Claves exactas de stats por demarcación (FR-019). */
export const CLAVES_STATS = {
  POR: ['agilidad', 'colocacion', 'distribucion', 'aereo', 'defensa', 'liderazgo'],
  DEF: ['velocidad', 'tecnica', 'tackling', 'anticipacion', 'marcaje', 'liderazgo'],
  MED: ['velocidad', 'tecnica', 'pase', 'posicionamiento', 'vision', 'disparo'],
  DEL: ['velocidad', 'regate', 'finalizacion', 'desmarque', 'creatividad', 'agresividad'],
} as const satisfies Record<Demarcacion, readonly string[]>;

type StatsDe<D extends Demarcacion> = { [K in (typeof CLAVES_STATS)[D][number]]: number };

export type StatsPOR = StatsDe<'POR'>;
export type StatsDEF = StatsDe<'DEF'>;
export type StatsMED = StatsDe<'MED'>;
export type StatsDEL = StatsDe<'DEL'>;
export type Stats = StatsPOR | StatsDEF | StatsMED | StatsDEL;

/** Jugador (carta) del catálogo: los 14 campos de FR-016. */
export interface Jugador {
  id: number;
  nombre: string;
  apellidos: string;
  nacionalidad: string;
  fecha_nacimiento: string;
  altura: number;
  demarcacion: Demarcacion;
  posicion: Posicion[];
  historia: string;
  stats: Stats;
  media: number;
  specials: Special[];
  nivel: Nivel;
  coleccion: string;
}

/** Valores de los stats de un jugador en el orden canónico de su demarcación. */
export function valoresStats(jugador: Pick<Jugador, 'demarcacion' | 'stats'>): number[] {
  const stats = jugador.stats as Record<string, number>;
  return CLAVES_STATS[jugador.demarcacion].map((clave) => stats[clave] ?? Number.NaN);
}

/** Media aritmética de los seis stats (FR-020). */
export function calcularMedia(jugador: Pick<Jugador, 'demarcacion' | 'stats'>): number {
  const valores = valoresStats(jugador);
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** Specials que puede tener un jugador según su demarcación y posiciones (FR-022, FR-023). */
export function specialsPermitidos(jugador: Pick<Jugador, 'demarcacion' | 'posicion'>): ReadonlySet<Special> {
  const permitidos = new Set<Special>([...SPECIALS_GENERICOS, ...SPECIALS_POR_DEMARCACION[jugador.demarcacion]]);
  const esCarrilero = jugador.posicion.includes('CI') || jugador.posicion.includes('CD');
  if (jugador.demarcacion === 'DEF' && esCarrilero) {
    for (const s of SPECIALS_MED) permitidos.add(s);
  }
  return permitidos;
}
