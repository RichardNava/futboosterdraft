/**
 * Peso de tirar y desplazamiento de la probabilidad de un tiro según la distancia y el ángulo reales del
 * tirador (spec 003, research R6; FR-018). Funciones puras: las usan la elección de acciones, el receptor
 * (callejón sin salida) y la resolución del tiro.
 */
import type { ParametrosEquilibrado } from '@fbd/domain';
import { decimasDeMetros } from '../espacio/campo';

/**
 * Peso de la acción de tirar (escala de `pesosAcciones`): por tramos de distancia (`tiro.pesoPorTramo`); más
 * allá del último, 0, salvo con el portero rival adelantado. Con menos ángulo que `anguloMinimoGrados`, 0; con
 * menos que `anguloReducidoGrados`, la mitad.
 */
export function pesoTiro(p: ParametrosEquilibrado, distancia: number, angulo: number, porteroAdelantado: boolean): number {
  const t = p.tiro;
  if (angulo < t.anguloMinimoGrados) return 0;
  let peso = -1;
  for (const tramo of t.pesoPorTramo) {
    if (distancia <= decimasDeMetros(tramo.hastaM)) {
      peso = tramo.peso;
      break;
    }
  }
  if (peso < 0) peso = porteroAdelantado ? (t.pesoPorTramo[t.pesoPorTramo.length - 1]?.peso ?? 0) : 0;
  return angulo < t.anguloReducidoGrados ? peso / 2 : peso;
}

/**
 * Desplazamiento de la sigmoide de puerta y de gol (≤ 0): `−pendienteDistancia` por cada 10 m por encima de
 * 11 m y `−pendienteAngulo` por cada 10° por debajo de `anguloReducidoGrados`.
 */
export function desplazamientoTiro(p: ParametrosEquilibrado, distancia: number, angulo: number): number {
  const t = p.tiro;
  const once = decimasDeMetros(11);
  const diez = decimasDeMetros(10);
  const porDistancia = distancia > once ? (t.pendienteDistancia * (distancia - once)) / diez : 0;
  const porAngulo = angulo < t.anguloReducidoGrados ? (t.pendienteAngulo * (t.anguloReducidoGrados - angulo)) / 10 : 0;
  return 0 - (porDistancia + porAngulo);
}
