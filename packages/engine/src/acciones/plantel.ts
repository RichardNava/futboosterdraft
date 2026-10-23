/**
 * Cambios en los jugadores del campo: sustituciones, retiradas por lesión o expulsión, relevo del
 * portero y la regla de los 7 jugadores (FR-042; Edge Cases de la especificación).
 */
import { anclaDeCasilla, maxSustituciones, rival, type EquipoEstado, type JugadorEnPartido } from '../estado/estado';
import { repartirAnclas } from '../espacio/geometria';
import type { Lado } from '../tipos';
import { emitir, esPortero, type Contexto } from './contexto';

export const MINIMO_JUGADORES = 7;

export function sustitucionesDisponibles(ctx: Contexto, equipo: EquipoEstado): number {
  return maxSustituciones(ctx.estado) - equipo.sustitucionesUsadas;
}

/** Ejecuta una sustitución: el que entra ocupa la casilla del que sale. */
export function sustituir(ctx: Contexto, equipo: EquipoEstado, sale: JugadorEnPartido, entra: JugadorEnPartido, automatica = false): void {
  entra.casillaId = sale.casillaId;
  // El que entra ocupa el sitio del que sale y hereda su ancla (research R13).
  entra.ancla = sale.ancla ? { ...sale.ancla } : undefined;
  if (sale.posicion) entra.posicion = sale.posicion;
  const esp = ctx.estado.espacio;
  const donde = esp.jugadores[sale.id];
  if (donde) esp.jugadores[entra.id] = { x: donde.x, y: donde.y, vx: 0, vy: 0, papel: -1000 };
  delete esp.jugadores[sale.id];
  delete esp.destinos[sale.id];
  entra.enCampo = true;
  entra.entroDesdeBanquillo = true;
  sale.enCampo = false;
  sale.retirado = true;
  sale.casillaId = null;
  equipo.sustitucionesUsadas++;
  emitir(
    ctx,
    'sustitucion',
    equipo.lado,
    [
      { rol: 'sale', jugadorId: sale.id },
      { rol: 'entra', jugadorId: entra.id },
    ],
    automatica ? { automatica: true } : {},
    true,
  );
  if (ctx.estado.balon.portadorId === sale.id) ctx.estado.balon.portadorId = entra.id;
}

/** Mejor suplente disponible para una demarcación (o cualquiera de campo si no hay de esa). */
function mejorSuplente(equipo: EquipoEstado, demarcacion: string): JugadorEnPartido | undefined {
  const disponibles = equipo.jugadores.filter((j) => !j.enCampo && !j.retirado);
  const ordenar = (lista: JugadorEnPartido[]) => [...lista].sort((a, b) => b.jugador.media - a.jugador.media || a.id - b.id);
  return ordenar(disponibles.filter((j) => j.jugador.demarcacion === demarcacion))[0] ?? ordenar(disponibles.filter((j) => j.jugador.demarcacion !== 'POR'))[0];
}

/** Retira a un jugador lesionado: si quedan cambios, entra automáticamente el mejor suplente. */
export function retirarLesionado(ctx: Contexto, equipo: EquipoEstado, j: JugadorEnPartido): void {
  const casilla = j.casillaId;
  const suplente = sustitucionesDisponibles(ctx, equipo) > 0 ? mejorSuplente(equipo, j.jugador.demarcacion) : undefined;
  j.lesionado = true;
  if (suplente) {
    sustituir(ctx, equipo, j, suplente, true);
    return;
  }
  j.enCampo = false;
  j.retirado = true;
  j.casillaId = null;
  quitarDelCampo(ctx, j);
  if (casilla === 'POR') cubrirPorteria(ctx, equipo);
  repartirAnclas(equipo);
  comprobarInferioridad(ctx, equipo.lado);
}

/** El jugador desaparece de la capa espacial. */
function quitarDelCampo(ctx: Contexto, j: JugadorEnPartido): void {
  delete ctx.estado.espacio.jugadores[j.id];
  delete ctx.estado.espacio.destinos[j.id];
}

/** Expulsión: el jugador se va sin sustituto. Si era el portero, alguien tiene que cubrir la portería. */
export function expulsar(ctx: Contexto, equipo: EquipoEstado, j: JugadorEnPartido): void {
  const eraPortero = esPortero(j);
  j.expulsado = true;
  j.enCampo = false;
  j.retirado = true;
  j.casillaId = null;
  quitarDelCampo(ctx, j);
  if (ctx.estado.balon.portadorId === j.id) ctx.estado.balon.portadorId = 0;
  if (eraPortero) cubrirPorteria(ctx, equipo);
  repartirAnclas(equipo);
  comprobarInferioridad(ctx, equipo.lado);
}

/**
 * Portería vacía. Si quedan cambios y hay un portero en el banquillo, entra por un jugador de campo;
 * si no, el jugador de campo con mejor perfil pasa a la portería (con −60 %).
 */
function cubrirPorteria(ctx: Contexto, equipo: EquipoEstado): void {
  const enCampo = equipo.jugadores.filter((x) => x.enCampo);
  if (enCampo.length === 0) return;
  const porteroSuplente = equipo.jugadores.find((x) => !x.enCampo && !x.retirado && x.jugador.demarcacion === 'POR');
  if (porteroSuplente && sustitucionesDisponibles(ctx, equipo) > 0) {
    // Sale el jugador de campo de menor media; el portero suplente hereda la casilla de la portería
    // y la casilla del que sale queda vacía (el equipo juega con uno menos).
    const sale = [...enCampo].sort((a, b) => a.jugador.media - b.jugador.media || a.id - b.id)[0]!;
    sale.casillaId = 'POR';
    sale.ancla = anclaDeCasilla(equipo.formacion, 'POR');
    sustituir(ctx, equipo, sale, porteroSuplente, true);
    return;
  }
  const relevo = [...enCampo].sort(
    (a, b) => b.jugador.altura - a.jugador.altura || a.jugador.media - b.jugador.media || a.id - b.id,
  )[0]!;
  relevo.casillaId = 'POR';
  relevo.ancla = anclaDeCasilla(equipo.formacion, 'POR');
  delete relevo.posicion;
}

/** Regla de los 7 jugadores: el equipo pierde 3-0, o se mantiene el resultado si era peor para él. */
export function comprobarInferioridad(ctx: Contexto, lado: Lado): void {
  const e = ctx.estado;
  if (e.derrotaPorInferioridad) return;
  const enCampo = e.equipos[lado].jugadores.filter((j) => j.enCampo).length;
  if (enCampo >= MINIMO_JUGADORES) return;
  e.derrotaPorInferioridad = lado;
  const otro = rival(lado);
  if (e.marcador[otro] - e.marcador[lado] < 3) {
    e.marcador[lado] = 0;
    e.marcador[otro] = 3;
  }
  emitir(ctx, 'fin_tramo', lado, [], { motivo: 'inferioridad_numerica' }, true);
  e.fase = 'finalizado';
}
