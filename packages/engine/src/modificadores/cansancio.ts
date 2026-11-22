/**
 * Energía de los jugadores (spec 018, FR-005 a FR-018; research R1 a R5). Cada jugador tiene de 0 a 100 y gasta dentro de
 * los tramos de fatiga: un 80 % por el ritmo de su rol y sus rasgos, y un 20 % por sus acciones intensas (sprints,
 * presiones, regates y duelos) frente a la referencia de su rol. Nada de esto consume PRNG.
 */
import { parametrosActuales, type ParametrosFatiga } from '@fbd/domain';
import type { EquipoEstado, EstadoMotor, JugadorEnPartido } from '../estado/estado';
import { lineaDe } from '../espacio/geometria';
import { marcajeVigente } from './marcajeEstrella';
import { tiene } from './virtudes';

export type AccionIntensa = keyof ParametrosFatiga['pesosAccion'];
export type PausaEnergia = keyof ParametrosFatiga['recuperacion'];

/** Minutos que dura la primera parte: el inicio de la segunda en `inicioMin` se cuenta desde aquí. */
const MINUTOS_PARTE = 45;

/** Porcentaje que pierden las stats físicas con esa energía: tramos acumulados, sin saltos (FR-011). */
export function penalizacionFisicaDe(f: ParametrosFatiga, energia: number): number {
  let penalizacion = 0;
  let desde = 100;
  for (const t of f.penalizacion.tramos) {
    if (energia >= desde) break;
    penalizacion += (desde - Math.max(energia, t.hasta)) * t.pendiente;
    desde = t.hasta;
  }
  return penalizacion;
}

/** Fija la energía, siempre en [0, 100], y su penalización. */
function fijarEnergia(f: ParametrosFatiga, j: JugadorEnPartido, energia: number): void {
  j.energia = Math.min(100, Math.max(0, energia));
  j.penalizacionFisica = penalizacionFisicaDe(f, j.energia);
}

const indisciplinado = (j: JugadorEnPartido) => j.jugador.defectos.length > 0 && tiene(j, 'Indisciplinado');

function contarMotivadores(equipo: EquipoEstado): number {
  let n = 0;
  for (const o of equipo.jugadores) if (o.enCampo && o.jugador.virtudes.includes('Motivador')) n++;
  return n;
}

/** Segundo de la parte reglamentaria tras el que se gasta, con `adelanto` minutos de antelación (R3). */
function inicioTramoS(f: ParametrosFatiga, parte: number, adelanto: number): number {
  return ((parte === 1 ? f.inicioMin.parte1 : f.inicioMin.parte2 - MINUTOS_PARTE) - adelanto) * 60;
}

function enTramo(estado: EstadoMotor, j: JugadorEnPartido): boolean {
  const { parte, segundosEnParte } = estado.reloj;
  if (parte >= 3) return true;
  const f = estado.parametros.fatiga;
  return segundosEnParte > inicioTramoS(f, parte, indisciplinado(j) ? f.rasgos.indisciplinado.adelantoMin : 0);
}

/** Ritmo de gasto: rol de la posición que ocupa × rasgos × táctica (FR-010a, FR-018). Motivador no se aplica a sí mismo. */
function ritmoDe(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido, motivadores: number): number {
  const f = estado.parametros.fatiga;
  let ritmo = f.ritmoRol[lineaDe(equipo, j)];
  const virtudes = j.jugador.virtudes;
  if (virtudes.includes('Incansable')) ritmo *= f.rasgos.incansable;
  if (j.jugador.defectos.includes('Fatigado')) ritmo *= f.rasgos.fatigado;
  if (motivadores - (virtudes.includes('Motivador') ? 1 : 0) > 0) ritmo *= f.rasgos.motivador.ritmo;
  if (equipo.tactica.sistemaDefensivo === 'individual') {
    const t = estado.parametros.tacticas.individual;
    ritmo *= t.ritmoEquipo;
    if (marcajeVigente(equipo)?.marcadorId === j.id) ritmo *= t.ritmoMarcador;
  }
  return ritmo;
}

/** Gasto por rol de `segundos` de juego para los jugadores en el campo que estén en su tramo. */
export function acumularCansancio(estado: EstadoMotor, equipo: EquipoEstado, segundos: number): void {
  const f = estado.parametros.fatiga;
  const { parte, segundosEnParte } = estado.reloj;
  if (parte < 3 && segundosEnParte <= inicioTramoS(f, parte, f.rasgos.indisciplinado.adelantoMin)) return;
  const motivadores = contarMotivadores(equipo);
  for (const j of equipo.jugadores) {
    if (!j.enCampo || !enTramo(estado, j)) continue;
    fijarEnergia(f, j, j.energia - (ritmoDe(estado, equipo, j, motivadores) * f.reparto.rol * f.gastoPorMinuto * segundos) / 60);
  }
}

/** Gasto de una acción intensa: solo dentro del tramo del jugador (FR-009), ×1,5 para un Indisciplinado (FR-015). */
export function gastarAccion(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido, accion: AccionIntensa): void {
  if (!j.enCampo || !enTramo(estado, j)) return;
  const f = estado.parametros.fatiga;
  const coste = indisciplinado(j) ? f.rasgos.indisciplinado.costeAccion : 1;
  const ritmo = ritmoDe(estado, equipo, j, contarMotivadores(equipo));
  fijarEnergia(f, j, j.energia - (ritmo * f.reparto.acciones * f.gastoPorMinuto * f.pesosAccion[accion] * coste) / f.referenciaAcciones[lineaDe(equipo, j)]);
}

/**
 * Recuperación al pitarse una pausa, antes de sus cambios (R3): solo los que están en el campo. En el descanso del
 * partido, más si hay otro Motivador en el campo (FR-016).
 */
export function recuperarEnPausa(estado: EstadoMotor, pausa: PausaEnergia): void {
  const f = estado.parametros.fatiga;
  for (const equipo of [estado.equipos.local, estado.equipos.visitante]) {
    const motivadores = contarMotivadores(equipo);
    for (const j of equipo.jugadores) {
      if (!j.enCampo) continue;
      const otroMotivador = motivadores - (j.jugador.virtudes.includes('Motivador') ? 1 : 0) > 0;
      fijarEnergia(f, j, j.energia + (pausa === 'descanso' && otroMotivador ? f.rasgos.motivador.recuperacionDescanso : f.recuperacion[pausa]));
    }
  }
}

/** Energía (0–100) y penalización física (%) de un jugador, en enteros: la única salida hacia la interfaz. */
export function energiaDe(_estado: EstadoMotor, jugador: JugadorEnPartido): { energia: number; penalizacion: number } {
  return { energia: Math.round(jugador.energia), penalizacion: Math.round(jugador.penalizacionFisica) };
}

export interface PerfilEnergia {
  ritmo: number;
  adelantoMin?: number;
  costeAccion?: number;
  recuperacionDescanso?: number;
}

/**
 * Energía de referencia de un perfil con acciones medias, a los 45', 90' y 120' (R5). El descuento de la primera parte
 * se gasta antes del descanso, y el tope de 100 se respeta al recuperar.
 */
export function curvaEnergia(
  perfil: PerfilEnergia,
  { descuentoPrimeraParte = 0, fatiga = parametrosActuales().fatiga }: { descuentoPrimeraParte?: number; fatiga?: ParametrosFatiga } = {},
): { minuto45: number; minuto90: number; minuto120: number } {
  const f = fatiga;
  const adelanto = perfil.adelantoMin ?? 0;
  const gasto = perfil.ritmo * f.gastoPorMinuto * (f.reparto.rol + f.reparto.acciones * (perfil.costeAccion ?? 1));
  const acotar = (v: number) => Math.min(100, Math.max(0, v));
  const minuto45 = acotar(100 - gasto * (MINUTOS_PARTE - (f.inicioMin.parte1 - adelanto) + descuentoPrimeraParte));
  const trasDescanso = acotar(minuto45 + (perfil.recuperacionDescanso ?? f.recuperacion.descanso));
  const minuto90 = acotar(trasDescanso - gasto * (2 * MINUTOS_PARTE - (f.inicioMin.parte2 - adelanto)));
  const minuto105 = acotar(acotar(minuto90 + f.recuperacion.preProrroga) - gasto * 15);
  const minuto120 = acotar(acotar(minuto105 + f.recuperacion.descansoProrroga) - gasto * 15);
  return { minuto45, minuto90, minuto120 };
}
