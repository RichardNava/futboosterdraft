/**
 * Resolución de un cruce del modo Duelo de jugadores (spec 005, research R9; FR-064a, FR-065, FR-066;
 * contracts/duelos-api.md). Función pura y determinista: el mismo cruce con la misma semilla da el mismo resultado.
 *
 * - Un duelo por casilla de la formación común, de portero a delanteros.
 * - Con el Estado de forma, cada jugador recibe un sorteo entero en [−100 × estadoForma, +100 × estadoForma] centésimas,
 *   en el orden de las casillas, primero el local y después el visitante.
 * - Gana el cruce quien gane más duelos; con empate, la mayor suma de puntuaciones; si sigue, un sorteo de 50 %.
 */
import type { Posicion } from '../catalogo/tipos';
import { formacion as formacionPorId, type Casilla } from '../equipo/formaciones';
import { parametrosEfectivos, type ParametrosEquilibrado } from '../parametros/index';
import { derivarSemilla, Rng, type Semilla } from '../rng/xoshiro';
import { puntuacionEfectiva } from './puntuacion';
import { ErrorDuelos, type ConfigDuelos, type Desempate, type Duelo, type LadoDuelo, type OnceDuelos, type ResultadoCruce } from './tipos';

const ORDEN_LINEA: Readonly<Record<Posicion, number>> = {
  POR: 0, LI: 1, LD: 1, DCI: 1, DCD: 1, CI: 1, CD: 1, MD: 2, MC: 2, MII: 2, MID: 2, MCO: 2, DC: 3, SD: 3, EI: 3, ED: 3,
};

/** Casillas de la formación de portero a delanteros (estable dentro de cada línea). */
export function casillasEnOrden(formacionId: ConfigDuelos['formacion']): Casilla[] {
  return [...formacionPorId(formacionId).casillas]
    .map((c, i) => ({ c, i }))
    .sort((a, b) => ORDEN_LINEA[a.c.posicionesAdmitidas[0]!] - ORDEN_LINEA[b.c.posicionesAdmitidas[0]!] || a.i - b.i)
    .map(({ c }) => c);
}

function validar(once: OnceDuelos, ids: readonly string[]): void {
  const faltan = ids.filter((id) => !once.titulares[id]);
  if (faltan.length) throw new ErrorDuelos('CASILLAS_INCOMPLETAS', `Al once de ${once.participanteId} le faltan las casillas ${faltan.join(', ')}`);
  const jugadores = ids.map((id) => once.titulares[id]!.id);
  if (new Set(jugadores).size !== jugadores.length) throw new ErrorDuelos('JUGADOR_REPETIDO', `El once de ${once.participanteId} repite jugador`);
}

export function resolverCruce(
  local: OnceDuelos,
  visitante: OnceDuelos,
  config: ConfigDuelos,
  semilla: Semilla,
  p: ParametrosEquilibrado,
): ResultadoCruce {
  const casillas = casillasEnOrden(config.formacion);
  const ids = casillas.map((c) => c.id);
  validar(local, ids);
  validar(visitante, ids);
  const rng = new Rng(derivarSemilla(semilla, 'duelos'));
  const amplitud = config.estadoForma ? Math.round(100 * parametrosEfectivos(p).duelos.estadoForma) : 0;
  const lado = (once: OnceDuelos, casilla: Casilla): LadoDuelo => {
    const { base, ...resto } = puntuacionEfectiva(once.titulares[casilla.id]!, casilla, p);
    const forma = amplitud > 0 ? rng.entero(-amplitud, amplitud) : 0;
    return { ...resto, forma, puntuacion: base + forma };
  };

  const duelos: Duelo[] = [];
  const ganados = { local: 0, visitante: 0 };
  const sumas = { local: 0, visitante: 0 };
  for (const casilla of casillas) {
    const l = lado(local, casilla);
    const v = lado(visitante, casilla);
    const ganador = l.puntuacion > v.puntuacion ? 'local' : v.puntuacion > l.puntuacion ? 'visitante' : 'nulo';
    if (ganador !== 'nulo') ganados[ganador]++;
    sumas.local += l.puntuacion;
    sumas.visitante += v.puntuacion;
    duelos.push({ casillaId: casilla.id, local: l, visitante: v, ganador });
  }

  let desempate: Desempate;
  let ganador: 'local' | 'visitante';
  if (ganados.local !== ganados.visitante) {
    desempate = 'duelos';
    ganador = ganados.local > ganados.visitante ? 'local' : 'visitante';
  } else if (sumas.local !== sumas.visitante) {
    desempate = 'suma';
    ganador = sumas.local > sumas.visitante ? 'local' : 'visitante';
  } else {
    desempate = 'sorteo';
    ganador = rng.entero(0, 1) === 0 ? 'local' : 'visitante';
  }
  return { formacion: config.formacion, estadoForma: config.estadoForma, duelos, ganados, sumas, desempate, ganador };
}
