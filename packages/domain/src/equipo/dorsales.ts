/**
 * Dorsales (FR-035 a FR-038; research R14; data-model §5).
 *
 * - Al definir por primera vez el once, la plantilla recibe exactamente los números del 1 al 24: los fijos
 *   por casilla según la posición efectiva de cada titular, y el resto al azar entre los libres.
 * - Se pueden reasignar del 1 al 99; si otro jugador llevaba ese número, se queda sin dorsal (el mapa
 *   admite jugadores sin entrada). Así nunca hay dos jugadores con el mismo dorsal (SC-014).
 * - Al empezar cada partido, cada convocado sin dorsal recibe el libre más bajo del 1 al 24, o a partir
 *   del 25 si están todos ocupados.
 */
import type { Posicion } from '../catalogo/tipos';
import { Rng, type Semilla } from '../rng/xoshiro';
import { FORMACIONES, type FormacionId } from './formaciones';

/** Dorsal fijo según la posición. El central del medio y el SD no tienen. */
export const DORSAL_FIJO: Readonly<Partial<Record<Posicion, number>>> = {
  POR: 1,
  LD: 2,
  CD: 2,
  LI: 3,
  CI: 3,
  DCD: 4,
  DCI: 5,
  MD: 6,
  MC: 8,
  MII: 8,
  MID: 8,
  MCO: 10,
  EI: 7,
  DC: 9,
  ED: 11,
};

/** `{ [jugadorId]: 1..99 }`; un jugador sin entrada está «sin dorsal». */
export type Dorsales = Record<number, number>;

export const DORSAL_MINIMO = 1;
export const DORSAL_MAXIMO = 99;
/** Números de la asignación inicial (FR-035). */
export const DORSALES_INICIALES = 24;

export class ErrorDorsales extends Error {
  constructor(
    readonly codigo: 'DORSAL_FUERA_DE_RANGO' | 'JUGADOR_DESCONOCIDO',
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorDorsales';
  }
}

/**
 * Dorsales iniciales de una plantilla: los fijos por casilla según la posición efectiva de cada titular
 * (`posicionDe`, si se colocó fuera de su casilla), en el orden de la formación, y el resto al azar entre
 * los libres del 1 al 24.
 */
export function asignarDorsalesIniciales(
  plantilla: readonly number[],
  titulares: readonly { casillaId: string; jugadorId: number }[],
  formacionId: FormacionId,
  semilla: Semilla,
  posicionDe?: (jugadorId: number) => Posicion | undefined,
): Dorsales {
  const rng = new Rng(semilla);
  const dorsales: Dorsales = {};
  const usados = new Set<number>();

  // Titulares en el orden de la formación (de atrás adelante y de derecha a izquierda).
  for (const casilla of FORMACIONES[formacionId].casillas) {
    const t = titulares.find((x) => x.casillaId === casilla.id);
    if (!t) continue;
    const posicion = posicionDe?.(t.jugadorId) ?? (casilla.posicionesAdmitidas.length === 1 ? casilla.posicionesAdmitidas[0] : undefined);
    const fijo = posicion ? DORSAL_FIJO[posicion] : undefined;
    if (fijo !== undefined && !usados.has(fijo)) {
      dorsales[t.jugadorId] = fijo;
      usados.add(fijo);
    }
  }

  // El resto (titulares sin dorsal fijo o con el suyo ocupado, y suplentes): un libre al azar del 1 al 24
  // (más allá solo si la plantilla tuviera más de 24 jugadores).
  const pendientes = [
    ...titulares.map((t) => t.jugadorId).filter((id) => dorsales[id] === undefined),
    ...plantilla.filter((id) => !titulares.some((t) => t.jugadorId === id)),
  ];
  for (const id of pendientes) {
    const tope = Math.max(DORSALES_INICIALES, plantilla.length);
    const libres = Array.from({ length: tope }, (_, i) => i + 1).filter((n) => !usados.has(n));
    const n = rng.elegir(libres);
    dorsales[id] = n;
    usados.add(n);
  }
  return dorsales;
}

/**
 * Da el dorsal `n` (1–99) a un jugador. Si otro lo llevaba, ese otro se queda sin dorsal (FR-037).
 * `plantilla`, si se indica, limita los jugadores admitidos.
 */
export function asignarDorsal(dorsales: Readonly<Dorsales>, jugadorId: number, n: number, plantilla?: readonly number[]): Dorsales {
  if (plantilla && !plantilla.includes(jugadorId)) throw new ErrorDorsales('JUGADOR_DESCONOCIDO', `El jugador ${jugadorId} no es de tu plantilla`);
  if (!Number.isInteger(n) || n < DORSAL_MINIMO || n > DORSAL_MAXIMO) {
    throw new ErrorDorsales('DORSAL_FUERA_DE_RANGO', 'Los dorsales van del 1 al 99');
  }
  const nuevo: Dorsales = {};
  for (const [id, d] of Object.entries(dorsales)) if (d !== n) nuevo[Number(id)] = d;
  nuevo[jugadorId] = n;
  return nuevo;
}

/** Jugadores de la plantilla sin dorsal. */
export function sinDorsal(dorsales: Readonly<Dorsales>, plantilla: readonly number[]): number[] {
  return plantilla.filter((id) => dorsales[id] === undefined);
}

/**
 * Al empezar un partido (FR-038): cada convocado sin dorsal recibe el libre más bajo del 1 al 24, o a partir
 * del 25 si están todos ocupados. Los no convocados pueden seguir sin dorsal.
 */
export function completarDorsales(
  dorsales: Readonly<Dorsales>,
  convocados: readonly number[],
): { dorsales: Dorsales; asignados: { jugadorId: number; dorsal: number }[] } {
  const nuevo: Dorsales = { ...dorsales };
  const usados = new Set(Object.values(nuevo));
  const asignados: { jugadorId: number; dorsal: number }[] = [];
  for (const id of convocados) {
    if (nuevo[id] !== undefined) continue;
    let n = 1;
    while (usados.has(n)) n++;
    nuevo[id] = n;
    usados.add(n);
    asignados.push({ jugadorId: id, dorsal: n });
  }
  return { dorsales: nuevo, asignados };
}
