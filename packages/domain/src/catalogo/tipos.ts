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

export const NIVELES = ['Superclase', 'Crack', 'Legendario', 'GOAT'] as const;
export type Nivel = (typeof NIVELES)[number];

/** Máximo de virtudes por nivel (FR-021). */
export const MAX_VIRTUDES: Readonly<Record<Nivel, number>> = {
  Superclase: 1,
  Crack: 2,
  Legendario: 3,
  GOAT: 4,
};

export const VIRTUDES_GENERICAS = [
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
  // Spec 005 (FR-030 a FR-034).
  'DeAcero',
  'Versatil',
  'FairPlayer',
  'Revulsivo',
] as const;

export const VIRTUDES_POR = ['Parapenalties', 'OneToOne', 'Santo', 'Ordenabarreras', 'JugadorDeCampo'] as const;
export const VIRTUDES_DEF = ['Infranqueable', 'Jerarquia', 'Volador', 'Libero', 'MuroDefensivo'] as const;
export const VIRTUDES_MED = ['Llegador', 'BoxToBox', 'PrimerToque', 'Todocampista', 'JugadorEntreLineas'] as const;
export const VIRTUDES_DEL = ['Matador', 'Rematador', 'Cabeceador', 'Desbordante', 'GuanteEnElPie'] as const;

export type VirtudGenerica = (typeof VIRTUDES_GENERICAS)[number];
export type VirtudPOR = (typeof VIRTUDES_POR)[number];
export type VirtudDEF = (typeof VIRTUDES_DEF)[number];
export type VirtudMED = (typeof VIRTUDES_MED)[number];
export type VirtudDEL = (typeof VIRTUDES_DEL)[number];
export type Virtud = VirtudGenerica | VirtudPOR | VirtudDEF | VirtudMED | VirtudDEL;

export const VIRTUDES_POR_DEMARCACION: Readonly<Record<Demarcacion, readonly Virtud[]>> = {
  POR: VIRTUDES_POR,
  DEF: VIRTUDES_DEF,
  MED: VIRTUDES_MED,
  DEL: VIRTUDES_DEL,
};

export const TODAS_LAS_VIRTUDES: readonly Virtud[] = [
  ...VIRTUDES_GENERICAS,
  ...VIRTUDES_POR,
  ...VIRTUDES_DEF,
  ...VIRTUDES_MED,
  ...VIRTUDES_DEL,
];

/** Defectos (spec 005, FR-010 a FR-016): todos genéricos. */
export const DEFECTOS = [
  'Agresivo',
  'Impulsivo',
  'Fragil',
  'Fatigado',
  'Polemico',
  'Indisciplinado',
  'Canchero',
  'Rebelde',
  'Torpe',
  'Provocador',
  'DeCristal',
  'Estrellita',
  'Chupon',
  'Inflexible',
  'MalDefensor',
] as const;
export type Defecto = (typeof DEFECTOS)[number];

/** Máximo de defectos de una carta, en cualquier nivel (FR-011). */
export const MAX_DEFECTOS = 2;

/** Virtud o defecto. */
export type Rasgo = Virtud | Defecto;

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

/**
 * Jugador (carta) del catálogo: los campos de FR-016. Desde la spec 006 la carta no sabe en qué colecciones está
 * (R1): la pertenencia vive en `Coleccion`.
 */
export interface Jugador {
  id: number;
  nombre: string;
  apellidos: string;
  /** Nombre corto que se destaca en la carta (FR-047a). */
  nombre_carta: string;
  /** Código de `SELECCIONES`. */
  nacionalidad: string;
  fecha_nacimiento: string;
  altura: number;
  demarcacion: Demarcacion;
  posicion: Posicion[];
  historia: string;
  stats: Stats;
  media: number;
  virtudes: Virtud[];
  defectos: Defecto[];
  nivel: Nivel;
  /** Imagen superior (ruta del sitio bajo `/cartas/`). */
  imagen: string;
  /** Imagen de fondo de la acción (ruta del sitio bajo `/cartas/`). */
  imagen_bg: string;
}

/** Versiones de una carta (R2). La premium llegará con su propia tabla de presentación. */
export const VERSIONES_CARTA = ['normal'] as const;
export type VersionCarta = (typeof VERSIONES_CARTA)[number];

export type TipoColeccion = 'basica' | 'pago';

/** Colección del catálogo, ya normalizada (data-model §1.2). */
export interface Coleccion {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoColeccion;
  precioCentimos?: number;
  destacadas?: number[];
  cartas: { id: number; version: VersionCarta }[];
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

/** Virtudes que puede tener un jugador según su demarcación y posiciones (FR-022, FR-023). */
export function virtudesPermitidas(jugador: Pick<Jugador, 'demarcacion' | 'posicion'>): ReadonlySet<Virtud> {
  const permitidos = new Set<Virtud>([...VIRTUDES_GENERICAS, ...VIRTUDES_POR_DEMARCACION[jugador.demarcacion]]);
  const esCarrilero = jugador.posicion.includes('CI') || jugador.posicion.includes('CD');
  if (jugador.demarcacion === 'DEF' && esCarrilero) {
    for (const s of VIRTUDES_MED) permitidos.add(s);
  }
  return permitidos;
}
