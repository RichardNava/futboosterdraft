/**
 * Participante de referencia (research R13, T090): un jugador medio con un comportamiento fijo y explícito
 * para medir la dificultad de los NPC (SC-010). No es un nivel de NPC del juego y no evoluciona con sus
 * perfiles:
 *
 * - draft: la mejor carta con el evaluador común, sin ruido, con pesos `{ media: 1, cobertura: 4,
 *   porteros: 6, sinergia: 0 }` y sin anticipación;
 * - alineación: `autoAlineacion` restringida a 4-4-2 y 4-3-3;
 * - táctica: la por defecto;
 * - sin decisiones durante el partido.
 */
import { autoAlineacion, parametrosActuales, tacticaPorDefecto, TURNOS_POR_RONDA, type Alineacion, type FormacionId, type Jugador, type ParametrosEquilibrado } from '@fbd/domain';
import { valorCarta } from '@fbd/ai';

export const PESOS_REFERENCIA = { media: 1, cobertura: 4, porteros: 6, sinergia: 0, rasgos: 0 } as const;
export const FORMACIONES_REFERENCIA: readonly FormacionId[] = ['4-4-2', '4-3-3'];

/**
 * Carta que elige el participante de referencia. Determinista: no usa ningún número aleatorio (la semilla
 * no hace falta). Como los NPC, da más peso a las necesidades según avanza el draft.
 */
export function elegirCartaReferencia(
  sobre: readonly Jugador[],
  plantillaParcial: readonly Jugador[],
  ronda: number,
  turno: number,
  p: ParametrosEquilibrado = parametrosActuales(),
): number {
  if (sobre.length === 0) throw new Error('El sobre está vacío');
  const eleccion = (ronda - 1) * TURNOS_POR_RONDA + (turno - 1);
  const urgencia = 1 + eleccion / (3 * TURNOS_POR_RONDA);
  const pesos = { ...PESOS_REFERENCIA, cobertura: PESOS_REFERENCIA.cobertura * urgencia, porteros: PESOS_REFERENCIA.porteros * urgencia };
  let mejor = sobre[0]!;
  let mejorValor = -Infinity;
  for (const carta of sobre) {
    const valor = valorCarta(carta, plantillaParcial, pesos, FORMACIONES_REFERENCIA, p);
    if (valor > mejorValor + 1e-9) {
      mejorValor = valor;
      mejor = carta;
    }
  }
  return mejor.id;
}

/** Alineación del participante de referencia: la mejor de 4-4-2 y 4-3-3 con la táctica por defecto. */
export function alineacionReferencia(plantilla: readonly Jugador[], bajas: ReadonlySet<number> = new Set(), p: ParametrosEquilibrado = parametrosActuales()): Alineacion {
  return autoAlineacion(plantilla, bajas, p, { formaciones: FORMACIONES_REFERENCIA, tactica: tacticaPorDefecto() });
}
