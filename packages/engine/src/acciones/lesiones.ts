/**
 * Lesiones (T086; FR-043): probabilidad por entrada, reducida por Robusto; gravedad según el reparto
 * de los parámetros (leve, media, grave, larga duración 2 %). Robusto también reduce la gravedad: se
 * sortea dos veces y se queda la más leve.
 */
import type { GravedadLesion } from '@fbd/domain';
import type { EquipoEstado, JugadorEnPartido } from '../estado/estado';
import { deAcero, factorLesion, gravedadForzada } from '../modificadores/defectos';
import { tiene } from '../modificadores/virtudes';
import { emitir, type Contexto } from './contexto';
import { retirarLesionado } from './plantel';

const ORDEN: GravedadLesion[] = ['leve', 'media', 'grave', 'larga'];

function sortearGravedad(ctx: Contexto): GravedadLesion {
  const reparto = ctx.estado.parametros.lesiones.reparto;
  let x = ctx.rng.entero(0, 9999) / 10000;
  for (const g of ORDEN) {
    x -= reparto[g];
    if (x < 0) return g;
  }
  return 'leve';
}

/** Comprueba si el jugador se lesiona en una entrada. Devuelve `true` si se ha lesionado. */
export function comprobarLesion(ctx: Contexto, equipo: EquipoEstado, j: JugadorEnPartido, factor = 1): boolean {
  // De acero (spec 005, FR-031): nunca se lesiona; se comprueba antes que cualquier otro factor.
  if (deAcero(ctx.estado, j)) return false;
  const l = ctx.estado.parametros.lesiones;
  const robusto = tiene(j, 'Robusto');
  const prob = l.probabilidadPorEntrada * factor * (robusto ? 1 - l.reduccionRobusto : 1) * factorLesion(ctx.estado, j);
  if (!ctx.rng.probabilidad(Math.round(prob * 1000))) return false;
  // De cristal (spec 005): siempre de larga duración, sin sortear.
  const forzada = gravedadForzada(ctx.estado, j);
  let gravedad = forzada ?? sortearGravedad(ctx);
  if (robusto && !forzada) {
    const otra = sortearGravedad(ctx);
    if (ORDEN.indexOf(otra) < ORDEN.indexOf(gravedad)) gravedad = otra;
  }
  ctx.estado.estadisticas[equipo.lado].lesiones++;
  emitir(ctx, 'lesion', equipo.lado, [{ rol: 'autor', jugadorId: j.id }], { gravedad, partidos: l.partidos[gravedad] }, true);
  retirarLesionado(ctx, equipo, j);
  return true;
}
