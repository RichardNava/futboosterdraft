/**
 * API pública del motor de simulación (T089; contracts/engine-api.md). Motor único y puro: sin E/S,
 * sin reloj ni `Math.random`; con la misma entrada y las mismas decisiones da siempre el mismo partido.
 */
import type { EstadoMotor } from './estado/estado';
import { encolarDecision, type ResultadoDecision } from './tramos/decisiones';
import type { DecisionPartido, DecisionRegistrada } from './tipos';

export { crearPartido } from './estado/estado';
export type { EstadoMotor, JugadorEnPartido, EquipoEstado } from './estado/estado';
export { maxSustituciones, minutoDeJuego, minutoMostrable } from './estado/estado';
export { avanzar, type ResultadoTramo } from './tramos/avanzar';
export { validarDecision, type ResultadoDecision } from './tramos/decisiones';
export * from './tipos';

// La utilidad de stats efectivos forma parte del contrato del motor; vive en el dominio porque también
// la usa la pantalla de alineación.
export { statsEfectivos, type StatsEfectivos, type ContextoStats } from '@fbd/domain';

/**
 * Valida y encola una decisión; se aplica al empezar el siguiente tramo. Muta `estado` (la cola de
 * decisiones pendientes): llámese sobre el estado que se pasará al siguiente `avanzar`.
 *
 * Si la decisión trae `aplicadaEnTick` (reproducción de un partido registrado), se programa para ese
 * instante y se valida al aplicarse.
 */
export function aplicarDecision(estado: EstadoMotor, d: DecisionPartido | DecisionRegistrada): ResultadoDecision {
  if ((d as DecisionRegistrada).aplicadaEnTick !== undefined) {
    estado.decisionesPendientes.push({ ...(d as DecisionRegistrada) });
    return { ok: true };
  }
  return encolarDecision(estado, d);
}
