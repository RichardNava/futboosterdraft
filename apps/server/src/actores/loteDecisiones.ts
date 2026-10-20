/**
 * Lote atómico de decisiones de la gestión del equipo (spec 003, research R17; FR-028 a FR-030;
 * contracts/realtime-protocol.md): se validan todas en orden sobre una copia del estado del motor y, solo si todas
 * valen, se encolan en el estado real en el mismo orden. Si una falla, no se aplica ninguna y se indica cuál.
 */
import { encolarLote, type DecisionPartido, type EstadoMotor } from '@fbd/engine';

export type DecisionLote = { tipo: DecisionPartido['tipo']; datos: Record<string, unknown> };

export type ResultadoLote = { ok: true } | { ok: false; indice: number; codigo: string; mensaje: string };

export function aplicarLote(motor: EstadoMotor, participanteId: string, decisiones: readonly DecisionLote[]): ResultadoLote {
  const completas = decisiones.map((d) => ({ participanteId, tipo: d.tipo, datos: d.datos }) as DecisionPartido);
  return encolarLote(motor, completas);
}
