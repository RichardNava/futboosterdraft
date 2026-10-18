/**
 * Formaciones como datos estáticos (FR-025, FR-025a, FR-034; tabla de Assumptions de spec.md).
 *
 * Coordenadas de `zona`: x = 0 en la propia línea de gol → 1000 en la rival; y = 0 banda izquierda →
 * 640 banda derecha (desde el punto de vista del equipo que ataca hacia x = 1000).
 *
 * Las casillas se listan de atrás adelante y, en cada línea, de derecha a izquierda. Ese orden es el
 * que usa la asignación de dorsales cuando dos casillas comparten dorsal fijo (FR-031a).
 */
import type { Posicion } from '../catalogo/tipos';

export const FORMACIONES_IDS = [
  '3-4-3',
  '4-3-3',
  '4-4-2',
  '4-4-2-diamante',
  '4-2-3-1',
  '3-5-2',
  '5-4-1',
  '5-3-2',
  '4-5-1',
  '3-3-3-1',
] as const;
export type FormacionId = (typeof FORMACIONES_IDS)[number];

export interface Casilla {
  /** Identificador único dentro de la formación (p. ej. "MC-1", "CENTRAL"). */
  id: string;
  /** Texto que se muestra en la casilla (p. ej. "MC", "DCI/DCD"). */
  etiqueta: string;
  /** Posiciones de jugador que ocupan esta casilla sin penalización. */
  posicionesAdmitidas: readonly Posicion[];
  zona: { x: number; y: number };
}

export interface Formacion {
  id: FormacionId;
  nombre: string;
  casillas: readonly Casilla[];
  /** ofensividad −2..+2 (FR-034) y amplitud −2..+2 (juego por bandas o por dentro). */
  perfil: { ofensividad: number; amplitud: number };
}

/** Identificador de la casilla central de una defensa de 3 o 5 (FR-025a). */
export const CASILLA_CENTRAL = 'CENTRAL';

// Alturas (x) por línea y anchuras (y) por carril.
const X = { por: 40, def: 190, carril: 300, md: 330, med: 450, mco: 600, del: 760 } as const;
const Y = { banda: 70, interiorAncho: 160, interior: 220, centroAncho: 260, centro: 320 } as const;
const der = (d: number) => 640 - d;

const c = (id: string, posiciones: readonly Posicion[], x: number, y: number, etiqueta?: string): Casilla => ({
  id,
  etiqueta: etiqueta ?? posiciones.join('/'),
  posicionesAdmitidas: posiciones,
  zona: { x, y },
});

const POR = c('POR', ['POR'], X.por, Y.centro);
const defensaCuatro: Casilla[] = [
  c('LD', ['LD'], X.def, der(Y.banda)),
  c('DCD', ['DCD'], X.def - 20, der(Y.interiorAncho + 60)),
  c('DCI', ['DCI'], X.def - 20, Y.interiorAncho + 60),
  c('LI', ['LI'], X.def, Y.banda),
];
const defensaTres: Casilla[] = [
  c('DCD', ['DCD'], X.def - 10, der(Y.interiorAncho)),
  c(CASILLA_CENTRAL, ['DCI', 'DCD'], X.def - 30, Y.centro, 'DCI/DCD'),
  c('DCI', ['DCI'], X.def - 10, Y.interiorAncho),
];
const defensaCinco: Casilla[] = [
  c('CD', ['CD'], 250, der(Y.banda)),
  ...defensaTres,
  c('CI', ['CI'], 250, Y.banda),
];

const FORMACIONES_LISTA: readonly Formacion[] = [
  {
    id: '3-4-3',
    nombre: '3-4-3',
    perfil: { ofensividad: 2, amplitud: 1 },
    casillas: [
      POR,
      ...defensaTres,
      c('CD', ['CD'], X.med - 30, der(Y.banda)),
      c('MC-1', ['MC'], X.med - 40, der(Y.centroAncho)),
      c('MC-2', ['MC'], X.med - 40, Y.centroAncho),
      c('CI', ['CI'], X.med - 30, Y.banda),
      c('ED', ['ED'], X.del - 30, der(Y.banda + 30)),
      c('DC', ['DC'], X.del, Y.centro),
      c('EI', ['EI'], X.del - 30, Y.banda + 30),
    ],
  },
  {
    id: '4-3-3',
    nombre: '4-3-3',
    perfil: { ofensividad: 1, amplitud: 2 },
    casillas: [
      POR,
      ...defensaCuatro,
      c('MD', ['MD'], X.md, Y.centro),
      c('MID', ['MID'], X.med, der(Y.interior)),
      c('MII', ['MII'], X.med, Y.interior),
      c('ED', ['ED'], X.del - 30, der(Y.banda + 20)),
      c('DC', ['DC'], X.del, Y.centro),
      c('EI', ['EI'], X.del - 30, Y.banda + 20),
    ],
  },
  {
    id: '4-4-2',
    nombre: '4-4-2 en cuadrado',
    perfil: { ofensividad: 0, amplitud: 1 },
    casillas: [
      POR,
      ...defensaCuatro,
      c('ED', ['ED'], X.med, der(Y.banda)),
      c('MC-1', ['MC'], X.med - 30, der(Y.centroAncho)),
      c('MC-2', ['MC'], X.med - 30, Y.centroAncho),
      c('EI', ['EI'], X.med, Y.banda),
      c('DC', ['DC'], X.del, der(Y.centroAncho)),
      c('SD', ['SD'], X.del - 40, Y.centroAncho),
    ],
  },
  {
    id: '4-4-2-diamante',
    nombre: '4-4-2 en diamante',
    perfil: { ofensividad: 0, amplitud: -2 },
    casillas: [
      POR,
      ...defensaCuatro,
      c('MD', ['MD'], X.md, Y.centro),
      c('MID', ['MID'], X.med, der(Y.interior)),
      c('MII', ['MII'], X.med, Y.interior),
      c('MCO', ['MCO'], X.mco, Y.centro),
      c('DC', ['DC'], X.del, der(Y.centroAncho)),
      c('SD', ['SD'], X.del - 40, Y.centroAncho),
    ],
  },
  {
    id: '4-2-3-1',
    nombre: '4-2-3-1',
    perfil: { ofensividad: 0, amplitud: 1 },
    casillas: [
      POR,
      ...defensaCuatro,
      c('MC', ['MC'], 410, der(Y.centroAncho)),
      c('MD', ['MD'], X.md, Y.centroAncho),
      c('ED', ['ED'], X.mco, der(Y.banda + 20)),
      c('MCO', ['MCO'], X.mco, Y.centro),
      c('EI', ['EI'], X.mco, Y.banda + 20),
      c('DC', ['DC'], X.del, Y.centro),
    ],
  },
  {
    id: '3-5-2',
    nombre: '3-5-2',
    perfil: { ofensividad: 1, amplitud: 0 },
    casillas: [
      POR,
      ...defensaTres,
      c('CD', ['CD'], 410, der(Y.banda)),
      c('MID', ['MID'], X.med, der(Y.interior - 20)),
      c('MD', ['MD'], X.md, Y.centro),
      c('MII', ['MII'], X.med, Y.interior - 20),
      c('CI', ['CI'], 410, Y.banda),
      c('DC', ['DC'], X.del, der(Y.centroAncho)),
      c('SD', ['SD'], X.del - 40, Y.centroAncho),
    ],
  },
  {
    id: '5-4-1',
    nombre: '5-4-1',
    perfil: { ofensividad: -2, amplitud: 1 },
    casillas: [
      POR,
      ...defensaCinco,
      c('ED', ['ED'], X.med, der(Y.banda)),
      c('MC-1', ['MC'], X.med - 30, der(Y.centroAncho)),
      c('MC-2', ['MC'], X.med - 30, Y.centroAncho),
      c('EI', ['EI'], X.med, Y.banda),
      c('DC', ['DC'], 770, Y.centro),
    ],
  },
  {
    id: '5-3-2',
    nombre: '5-3-2',
    perfil: { ofensividad: -1, amplitud: -1 },
    casillas: [
      POR,
      ...defensaCinco,
      c('MD', ['MD'], X.md, Y.centro),
      c('MID', ['MID'], X.med, der(Y.interior)),
      c('MII', ['MII'], X.med, Y.interior),
      c('DC', ['DC'], 770, der(Y.centroAncho)),
      c('SD', ['SD'], X.del - 60, Y.centroAncho),
    ],
  },
  {
    id: '4-5-1',
    nombre: '4-5-1',
    perfil: { ofensividad: -1, amplitud: 1 },
    casillas: [
      POR,
      ...defensaCuatro,
      c('ED', ['ED'], X.med + 20, der(Y.banda)),
      c('MID', ['MID'], X.med, der(Y.interior)),
      c('MD', ['MD'], X.md, Y.centro),
      c('MII', ['MII'], X.med, Y.interior),
      c('EI', ['EI'], X.med + 20, Y.banda),
      c('DC', ['DC'], 770, Y.centro),
    ],
  },
  {
    id: '3-3-3-1',
    nombre: '3-3-3-1',
    perfil: { ofensividad: 2, amplitud: 1 },
    casillas: [
      POR,
      ...defensaTres,
      c('CD', ['CD'], X.md + 30, der(Y.banda)),
      c('MD', ['MD'], X.md, Y.centro),
      c('CI', ['CI'], X.md + 30, Y.banda),
      c('ED', ['ED'], X.mco, der(Y.banda + 30)),
      c('MCO', ['MCO'], X.mco, Y.centro),
      c('EI', ['EI'], X.mco, Y.banda + 30),
      c('DC', ['DC'], X.del, Y.centro),
    ],
  },
];

export const FORMACIONES: Readonly<Record<FormacionId, Formacion>> = Object.fromEntries(
  FORMACIONES_LISTA.map((f) => [f.id, f]),
) as Record<FormacionId, Formacion>;

export function formacion(id: FormacionId): Formacion {
  const f = FORMACIONES[id];
  if (!f) throw new Error(`Formación desconocida: ${id}`);
  return f;
}

export function esFormacionId(valor: unknown): valor is FormacionId {
  return typeof valor === 'string' && (FORMACIONES_IDS as readonly string[]).includes(valor);
}

export function casilla(formacionId: FormacionId, casillaId: string): Casilla | undefined {
  return FORMACIONES[formacionId].casillas.find((c) => c.id === casillaId);
}
