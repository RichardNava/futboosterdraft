/**
 * Cambios en los jugadores del campo: sustituciones, retiradas por lesión o expulsión, relevo del
 * portero y la regla de los 7 jugadores (FR-042; Edge Cases de la especificación).
 *
 * Spec 012 (research R2; contracts/motor.md): la lesión y la expulsión solo sacan al jugador del campo y anotan una
 * `Incidencia`; al terminar el paso, `resolverIncidencias` aplica la resolución automática de siempre o, si el
 * participante decidió en la parada de «control total», solo lo imprescindible (portería y anclas).
 */
import {
  anclaDeCasilla,
  maxSustituciones,
  minutoMostrable,
  rival,
  type EquipoEstado,
  type Incidencia,
  type JugadorEnPartido,
} from '../estado/estado';
import { repartirAnclas } from '../espacio/geometria';
import type { Lado } from '../tipos';
import { emitir, type Contexto } from './contexto';

export const MINIMO_JUGADORES = 7;

/** Sustituciones que le quedan al equipo (una más en la prórroga). */
function sustitucionesDisponibles(ctx: Contexto, equipo: EquipoEstado): number {
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

/** Saca del campo a un lesionado o expulsado y anota la incidencia, con la casilla, el ancla y el sitio que deja. */
function anotarIncidencia(ctx: Contexto, equipo: EquipoEstado, j: JugadorEnPartido, motivo: Incidencia['motivo']): void {
  const e = ctx.estado;
  const sitio = e.espacio.jugadores[j.id];
  (e.incidencias ??= []).push({
    lado: equipo.lado,
    jugadorId: j.id,
    motivo,
    tick: e.tick,
    minuto: minutoMostrable(e.reloj),
    casillaId: j.casillaId,
    ...(j.ancla ? { ancla: { ...j.ancla } } : {}),
    ...(sitio ? { sitio: { x: sitio.x, y: sitio.y } } : {}),
    estado: 'pendiente',
  });
  j.enCampo = false;
  j.retirado = true;
  j.casillaId = null;
  quitarDelCampo(ctx, j);
  if (e.balon.portadorId === j.id) e.balon.portadorId = 0;
}

/** Lesión: el jugador sale y queda una incidencia; el cambio se resuelve al terminar el paso. */
export function retirarLesionado(ctx: Contexto, equipo: EquipoEstado, j: JugadorEnPartido): void {
  j.lesionado = true;
  anotarIncidencia(ctx, equipo, j, 'lesion');
}

/** Lesión pendiente de un jugador (la que se puede resolver con un cambio en su sitio). */
export function lesionPendiente(ctx: Pick<Contexto, 'estado'>, lado: EquipoEstado['lado'], jugadorId: number): Incidencia | undefined {
  return (ctx.estado.incidencias ?? []).find((i) => i.estado === 'pendiente' && i.motivo === 'lesion' && i.lado === lado && i.jugadorId === jugadorId);
}

/** El que entra ocupa la casilla, el ancla y el sitio que dejó el lesionado. */
export function sustituirLesionado(ctx: Contexto, equipo: EquipoEstado, incidencia: Incidencia, entra: JugadorEnPartido, automatica: boolean): void {
  const sale = equipo.jugadores.find((j) => j.id === incidencia.jugadorId)!;
  sale.casillaId = incidencia.casillaId;
  sale.ancla = incidencia.ancla ? { ...incidencia.ancla } : undefined;
  if (incidencia.sitio) ctx.estado.espacio.jugadores[sale.id] = { x: incidencia.sitio.x, y: incidencia.sitio.y, vx: 0, vy: 0, papel: -1000 };
  sustituir(ctx, equipo, sale, entra, automatica);
}

/**
 * Resuelve las incidencias pendientes al terminar el paso (o al reanudar tras la parada de «control total»).
 * `decididos`: equipos que decidieron algo en la parada (sus incidencias, `resuelta_participante`); `recolocados`:
 * los que además cambiaron la formación o la colocación (no se les reparten las anclas). Para el resto, lo de
 * siempre: el mejor suplente entra por el lesionado si quedan cambios; si no, o en una expulsión, se cubre la
 * portería si hace falta, se reparten las anclas y se aplica la regla de los 7.
 */
export function resolverIncidencias(ctx: Contexto, decididos: ReadonlySet<string> = new Set(), recolocados: ReadonlySet<string> = new Set()): void {
  for (const inc of ctx.estado.incidencias ?? []) {
    if (inc.estado !== 'pendiente') continue;
    const equipo = ctx.estado.equipos[inc.lado];
    const j = equipo.jugadores.find((x) => x.id === inc.jugadorId)!;
    if (decididos.has(inc.lado)) {
      inc.estado = 'resuelta_participante';
      // Seguridad, no decisión: nadie en la portería, alguien la cubre; anclas repartidas si no se recolocó.
      if (!equipo.jugadores.some((x) => x.enCampo && x.casillaId === 'POR')) cubrirPorteria(ctx, equipo);
      if (!recolocados.has(inc.lado)) repartirAnclas(equipo);
      comprobarInferioridad(ctx, inc.lado);
      continue;
    }
    inc.estado = 'resuelta_automatica';
    if (inc.motivo === 'lesion') {
      const suplente = sustitucionesDisponibles(ctx, equipo) > 0 ? mejorSuplente(equipo, j.jugador.demarcacion) : undefined;
      if (suplente) {
        sustituirLesionado(ctx, equipo, inc, suplente, true);
        continue;
      }
    }
    if (inc.casillaId === 'POR') cubrirPorteria(ctx, equipo);
    repartirAnclas(equipo);
    comprobarInferioridad(ctx, inc.lado);
  }
}

/** El jugador desaparece de la capa espacial. */
function quitarDelCampo(ctx: Contexto, j: JugadorEnPartido): void {
  delete ctx.estado.espacio.jugadores[j.id];
  delete ctx.estado.espacio.destinos[j.id];
}

/**
 * Expulsión: el jugador se va sin sustituto y queda una incidencia. Al resolverla, si era el portero, alguien tiene
 * que cubrir la portería.
 */
export function expulsar(ctx: Contexto, equipo: EquipoEstado, j: JugadorEnPartido): void {
  j.expulsado = true;
  anotarIncidencia(ctx, equipo, j, 'expulsion');
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
