/**
 * Dorsales (FR-031a). Se asignan una vez, al definir por primera vez el once, y quedan fijos para todo
 * el torneo salvo que el participante los edite.
 */
import type { Posicion } from '../catalogo/tipos';
import { Rng, type Semilla } from '../rng/xoshiro';
import { FORMACIONES, type FormacionId } from './formaciones';

/** Dorsal fijo según la posición de la casilla. El central del medio y el SD no tienen. */
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

export type Dorsales = Record<number, number>;

export class ErrorDorsales extends Error {
  constructor(
    readonly codigo: 'DORSAL_REPETIDO' | 'DORSAL_FUERA_DE_RANGO' | 'JUGADOR_DESCONOCIDO',
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorDorsales';
  }
}

export function asignarDorsalesIniciales(
  plantilla: readonly number[],
  titulares: readonly { casillaId: string; jugadorId: number }[],
  formacionId: FormacionId,
  semilla: Semilla,
): Dorsales {
  const rng = new Rng(semilla);
  const dorsales: Dorsales = {};
  const usados = new Set<number>();

  // Titulares en el orden de la formación (de atrás adelante y de derecha a izquierda).
  for (const casilla of FORMACIONES[formacionId].casillas) {
    const t = titulares.find((x) => x.casillaId === casilla.id);
    if (!t) continue;
    const fijo = casilla.posicionesAdmitidas.length === 1 ? DORSAL_FIJO[casilla.posicionesAdmitidas[0]!] : undefined;
    if (fijo !== undefined && !usados.has(fijo)) {
      dorsales[t.jugadorId] = fijo;
      usados.add(fijo);
    }
  }

  // El resto (titulares sin dorsal fijo o con el suyo ocupado, y suplentes): un dorsal libre al azar.
  const pendientes = [
    ...titulares.map((t) => t.jugadorId).filter((id) => dorsales[id] === undefined),
    ...plantilla.filter((id) => !titulares.some((t) => t.jugadorId === id)),
  ];
  for (const id of pendientes) {
    const libres = Array.from({ length: 99 }, (_, i) => i + 1).filter((n) => !usados.has(n));
    const n = rng.elegir(libres);
    dorsales[id] = n;
    usados.add(n);
  }
  return dorsales;
}

/** Aplica cambios de dorsal comprobando el rango 1–99 y la unicidad dentro de la plantilla. */
export function editarDorsales(dorsales: Readonly<Dorsales>, cambios: Readonly<Record<number, number>>): Dorsales {
  const nuevo: Dorsales = { ...dorsales };
  for (const [idTexto, dorsal] of Object.entries(cambios)) {
    const id = Number(idTexto);
    if (!(id in nuevo)) throw new ErrorDorsales('JUGADOR_DESCONOCIDO', `El jugador ${id} no es de tu plantilla`);
    if (!Number.isInteger(dorsal) || dorsal < 1 || dorsal > 99) {
      throw new ErrorDorsales('DORSAL_FUERA_DE_RANGO', 'Los dorsales van del 1 al 99');
    }
    nuevo[id] = dorsal;
  }
  const valores = Object.values(nuevo);
  if (new Set(valores).size !== valores.length) throw new ErrorDorsales('DORSAL_REPETIDO', 'Dos jugadores no pueden llevar el mismo dorsal');
  return nuevo;
}
