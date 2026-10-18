/**
 * Resolución del resto de un partido (research R7; contracts/engine-api.md).
 *
 * Un único procedimiento para «Finalizar partido», el vencimiento de un plazo, los partidos entre
 * humanos y los NPC contra NPC: así todos esos caminos comparten exactamente la misma secuencia de
 * decisiones automáticas, y el resultado es el mismo que viendo el partido hasta el final.
 */
import type { Semilla } from '@fbd/domain';
import { avanzar, type EstadoMotor, type EventoPartido, type ResultadoTramo } from '@fbd/engine';
import { decidirNPCEnPausa, type NivelesPartido } from './partido';

export interface ResultadoResolverResto {
  estado: EstadoMotor;
  eventos: EventoPartido[];
  /** Un tramo por cada parte simulada (y la tanda, si la hay), sin el estado. */
  tramos: Omit<ResultadoTramo, 'estado'>[];
}

/** Máximo de tramos por partido: dos partes, dos de prórroga y la tanda, con margen. */
const MAX_TRAMOS = 10;

/**
 * Encadena `avanzar(estado, 'parte')` hasta `finalizado`, con la prórroga y la tanda si corresponden.
 * En cada parada a la que llega (descanso, antes de la prórroga) deciden los lados de `niveles`; la ventana
 * del lado humano se cierra sin cambios. Si el estado de partida ya está en una parada, se considera que los
 * NPC ya decidieron en ella (como en la reproducción normal) y se reanuda directamente.
 *
 * Si el estado está a mitad de juego (un corte por ticks de la 2D en directo), primero se llega a la
 * siguiente interrupción: las decisiones pendientes se aplican ahí, igual que si se siguiera mirando.
 */
export function resolverResto(
  estado: EstadoMotor,
  niveles: NivelesPartido,
  semilla: Semilla,
  /** Se llama con cada tramo simulado, con su estado (el servidor lo guarda y lo anuncia por partes). */
  alTramo?: (tramo: ResultadoTramo) => void,
): ResultadoResolverResto {
  const tramos: Omit<ResultadoTramo, 'estado'>[] = [];
  const eventos: EventoPartido[] = [];
  let actual = estado;
  for (let i = 0; i < MAX_TRAMOS && actual.fase !== 'finalizado'; i++) {
    const resultado = avanzar(actual, actual.puntoDecision ? 'parte' : 'interrupcion');
    const { estado: siguiente, ...tramo } = resultado;
    tramos.push(tramo);
    eventos.push(...tramo.eventos);
    actual = siguiente;
    if (actual.fase === 'descanso' || actual.fase === 'pre_prorroga') decidirNPCEnPausa(actual, niveles, semilla);
    alTramo?.(resultado);
  }
  return { estado: actual, eventos, tramos };
}
