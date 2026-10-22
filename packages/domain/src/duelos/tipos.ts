/**
 * Tipos del modo Duelo de jugadores (spec 005, research R9; contracts/duelos-api.md; data-model §6.3).
 * Todas las puntuaciones van en centésimas enteras, para que el resultado no dependa de errores de coma flotante.
 */
import type { Jugador } from '../catalogo/tipos';
import type { FormacionId } from '../equipo/formaciones';

export interface ConfigDuelos {
  formacion: FormacionId;
  /** Cada jugador suma o resta hasta `duelos.estadoForma` puntos al azar en cada duelo (FR-064a). */
  estadoForma: boolean;
}

export interface OnceDuelos {
  participanteId: string;
  /** casillaId de la formación común → carta en la versión de catálogo de la partida. */
  titulares: Readonly<Record<string, Jugador>>;
}

export interface LadoDuelo {
  jugadorId: number;
  /** Media de la carta. */
  media: number;
  /** Restado por jugar fuera de posición. */
  penalizacion: number;
  bonusVirtudes: number;
  /** Positivo; se resta. */
  malusDefectos: number;
  /** [−200, 200] con los parámetros 4.0.0; 0 sin Estado de forma. */
  forma: number;
  /** media − penalizacion + bonusVirtudes − malusDefectos + forma. */
  puntuacion: number;
}

export type GanadorDuelo = 'local' | 'visitante' | 'nulo';

export interface Duelo {
  casillaId: string;
  local: LadoDuelo;
  visitante: LadoDuelo;
  ganador: GanadorDuelo;
}

export type Desempate = 'duelos' | 'suma' | 'sorteo';

export interface ResultadoCruce {
  formacion: FormacionId;
  estadoForma: boolean;
  /** En el orden de las casillas, de portero a delanteros. */
  duelos: Duelo[];
  ganados: { local: number; visitante: number };
  sumas: { local: number; visitante: number };
  desempate: Desempate;
  ganador: 'local' | 'visitante';
}

export type CodigoErrorDuelos = 'CASILLAS_INCOMPLETAS' | 'JUGADOR_REPETIDO';

export class ErrorDuelos extends Error {
  constructor(
    readonly codigo: CodigoErrorDuelos,
    mensaje: string,
  ) {
    super(mensaje);
  }
}
