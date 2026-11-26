/**
 * Defectos y virtudes de la spec 005 en el partido (research R6; FR-014 a FR-016, FR-031 a FR-034, FR-042).
 *
 * Funciones puras que consultan los rasgos del jugador y los parámetros, enganchadas donde el motor ya resuelve cada
 * situación:
 *
 * | Rasgo | Dónde | Regla |
 * |---|---|---|
 * | Canchero, Impulsivo, Agresivo | `acciones/juego.ts`, `acciones/balonParado.ts` | probabilidad de falta, amarilla y roja directa |
 * | Frágil, De cristal | `acciones/lesiones.ts` | probabilidad de lesión × 3; gravedad siempre larga |
 * | Fatigado, Indisciplinado | `modificadores/cansancio.ts` | ritmo × 1,3; tramos 5 min antes y acciones × 1,5 |
 * | Torpe | `acciones/tiro.ts` | autogol en el despeje y en el desvío × 2 |
 * | Chupón | `acciones/opciones.ts` | peso de los pases × 0,5 |
 * | Mal defensor | `acciones/contexto.ts`, `acciones/receptor.ts`, `espacio/objetivos.ts` | peso como candidato defensivo × 0,5 |
 * | Polémico, Rebelde | `multiplicadorEquipo` | × 0,95 a los stats de todo el once |
 * | Estrellita | `multiplicadorIndividual` | × 0,90 si no es la mejor media efectiva del equipo en el campo |
 * | Provocador | `bonusProvocador` | +1 a cada GOAT rival en el campo |
 * | De acero, Fair player | `acciones/lesiones.ts`, `acciones/balonParado.ts` | sin lesiones; sin rojas |
 * | Revulsivo | `multiplicadorIndividual` | × 1,05 si entró desde el banquillo |
 *
 * Todas las condiciones se leen en el estado del momento, así que se reevalúan solas (FR-042). Un mismo defecto cuenta
 * una sola vez por equipo y defectos distintos se multiplican (FR-016).
 */
import type { Defecto, GravedadLesion, ParametrosDefectos } from '@fbd/domain';
import { emitir, type Contexto } from '../acciones/contexto';
import { enAreaRival } from '../espacio/campo';
import { aEquipo } from '../espacio/geometria';
import { rival, type EquipoEstado, type EstadoMotor, type JugadorEnPartido } from '../estado/estado';
import { mediaEfectiva } from './atributos';
import { tiene } from './virtudes';

const parametrosDefectos = (estado: EstadoMotor): ParametrosDefectos => estado.parametros.defectos;

const esPortero = (j: JugadorEnPartido) => j.casillaId === 'POR';

const conDefectos = (j: JugadorEnPartido) => j.jugador.defectos.length > 0;

/** Convocado en el banquillo: no ha jugado ni puede volver (Rebelde). */
const enBanquillo = (j: JugadorEnPartido) => !j.enCampo && !j.retirado && !j.expulsado && !j.lesionado;

const multiplicadoresPorEquipo = new WeakMap<EquipoEstado, boolean>();

/**
 * Si algún jugador del equipo tiene un rasgo que multiplica los stats (cualquier defecto o Revulsivo). Los rasgos no
 * cambian durante el partido: se calcula una vez por objeto de equipo (que `avanzar` copia en cada llamada).
 */
export function equipoConMultiplicadores(equipo: EquipoEstado): boolean {
  let v = multiplicadoresPorEquipo.get(equipo);
  if (v === undefined) {
    v = equipo.jugadores.some((j) => j.jugador.defectos.length > 0 || j.jugador.virtudes.includes('Revulsivo'));
    multiplicadoresPorEquipo.set(equipo, v);
  }
  return v;
}

const malestarPorEquipo = new WeakMap<EquipoEstado, boolean>();

/** Si la plantilla tiene algún Polémico o Rebelde (los rasgos no cambian durante el partido). */
function equipoConMalestar(equipo: EquipoEstado): boolean {
  let v = malestarPorEquipo.get(equipo);
  if (v === undefined) {
    v = equipo.jugadores.some((j) => conDefectos(j) && (tiene(j, 'Polemico') || tiene(j, 'Rebelde')));
    malestarPorEquipo.set(equipo, v);
  }
  return v;
}

/** Polémico en el campo con su equipo perdiendo (el primero, si hay varios). */
function polemicoActivo(estado: EstadoMotor, equipo: EquipoEstado): JugadorEnPartido | undefined {
  if (parametrosDefectos(estado).polemico <= 0) return undefined;
  if (estado.marcador[equipo.lado] >= estado.marcador[rival(equipo.lado)]) return undefined;
  return equipo.jugadores.find((j) => j.enCampo && conDefectos(j) && tiene(j, 'Polemico'));
}

/** Rebelde convocado en el banquillo (el primero, si hay varios). */
function rebeldeActivo(estado: EstadoMotor, equipo: EquipoEstado): JugadorEnPartido | undefined {
  if (parametrosDefectos(estado).rebelde <= 0) return undefined;
  return equipo.jugadores.find((j) => enBanquillo(j) && conDefectos(j) && tiene(j, 'Rebelde'));
}

/** Multiplicador de equipo a los stats de los jugadores en el campo (Polémico, Rebelde). */
export function multiplicadorEquipo(estado: EstadoMotor, equipo: EquipoEstado): number {
  const d = parametrosDefectos(estado);
  let m = 1;
  if (polemicoActivo(estado, equipo)) m *= 1 - d.polemico;
  if (rebeldeActivo(estado, equipo)) m *= 1 - d.rebelde;
  return m;
}

/** Estrellita: su media efectiva (sin este efecto) es la mayor del equipo en el campo, o empata con la mayor. */
function esElMejor(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido): boolean {
  const propia = mediaEfectiva(estado, equipo, j);
  return equipo.jugadores.every((o) => o === j || !o.enCampo || mediaEfectiva(estado, equipo, o) <= propia);
}

/** Multiplicador individual a los stats (Estrellita y Revulsivo). */
export function multiplicadorIndividual(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido): number {
  if (!j.enCampo) return 1;
  const d = parametrosDefectos(estado);
  let m = 1;
  if (d.estrellita > 0 && conDefectos(j) && tiene(j, 'Estrellita') && !esElMejor(estado, equipo, j)) m *= 1 - d.estrellita;
  // Revulsivo (FR-034): +5 % desde que entra del banquillo hasta el final.
  if (j.entroDesdeBanquillo && tiene(j, 'Revulsivo')) m *= 1 + estado.parametros.virtudes.revulsivo;
  return m;
}

/** De acero (FR-031): nunca se lesiona. */
export const deAcero = (_estado: EstadoMotor, j: JugadorEnPartido): boolean => tiene(j, 'DeAcero');

/** Fair player (FR-033): nunca ve la roja, ni directa ni por doble amarilla. */
export const fairPlayer = (_estado: EstadoMotor, j: JugadorEnPartido): boolean => tiene(j, 'FairPlayer');

/** Puntos que suma a un GOAT en el campo el Provocador del rival (una sola vez por equipo). */
export function bonusProvocador(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido): number {
  if (!j.enCampo || j.jugador.nivel !== 'GOAT') return 0;
  const puntos = parametrosDefectos(estado).provocador;
  if (puntos === 0) return 0;
  const rivales = estado.equipos[rival(equipo.lado)];
  return rivales.jugadores.some((o) => o.enCampo && conDefectos(o) && tiene(o, 'Provocador')) ? puntos : 0;
}

/** Factor de un defecto concreto del jugador (1 si no lo tiene). */
function factor(estado: EstadoMotor, j: JugadorEnPartido, defecto: Defecto, valor: (d: ParametrosDefectos) => number): number {
  return conDefectos(j) && tiene(j, defecto) ? valor(parametrosDefectos(estado)) : 1;
}

/** Canchero: probabilidad de cometer falta en una entrada. */
export const factorFalta = (estado: EstadoMotor, j: JugadorEnPartido) => factor(estado, j, 'Canchero', (d) => d.canchero);
/** Impulsivo: probabilidad de amarilla por falta. */
export const factorAmarilla = (estado: EstadoMotor, j: JugadorEnPartido) => factor(estado, j, 'Impulsivo', (d) => d.impulsivo);
/** Agresivo: probabilidad de roja directa por falta. */
export const factorRoja = (estado: EstadoMotor, j: JugadorEnPartido) => factor(estado, j, 'Agresivo', (d) => d.agresivo);
/** Frágil: probabilidad de lesión. */
export const factorLesion = (estado: EstadoMotor, j: JugadorEnPartido) => factor(estado, j, 'Fragil', (d) => d.fragil);
/** Torpe: probabilidad de autogol al despejar o al desviar un tiro. */
export const factorAutogol = (estado: EstadoMotor, j: JugadorEnPartido) => factor(estado, j, 'Torpe', (d) => d.torpe);

/** Chupón: peso de las opciones de pase. Un portero conserva sus acciones. */
export function factorPase(estado: EstadoMotor, j: JugadorEnPartido): number {
  return esPortero(j) ? 1 : factor(estado, j, 'Chupon', (d) => d.chupon);
}

/** Mal defensor: peso como candidato a defender (duelo, presión y cobertura). Un portero conserva sus acciones. */
export function factorDefensivo(estado: EstadoMotor, j: JugadorEnPartido): number {
  return esPortero(j) ? 1 : factor(estado, j, 'MalDefensor', (d) => d.malDefensor);
}

/** De cristal: sus lesiones son siempre de larga duración. */
export function gravedadForzada(_estado: EstadoMotor, j: JugadorEnPartido): GravedadLesion | undefined {
  return conDefectos(j) && tiene(j, 'DeCristal') ? 'larga' : undefined;
}

/**
 * Multiplicador de la probabilidad de falta dentro del área rival (spec 005, research R2; `disciplina.factorFaltaArea`):
 * mantiene los penaltis al subir las faltas. Sin punto, se aplica siempre (duelos aéreos del área).
 */
export function factorFaltaArea(estado: EstadoMotor, atacante?: 'local' | 'visitante', punto?: { x: number; y: number }): number {
  const f = estado.parametros.disciplina.factorFaltaArea;
  if (f === 1) return 1;
  if (!atacante || !punto) return f;
  return enAreaRival(aEquipo(atacante, punto)) ? f : 1;
}

/**
 * Aviso de efectos colectivos (FR-044): emite `malestar` cuando se activa o se desactiva Polémico o Rebelde en un
 * equipo, con `{ defecto, activo, jugadorId }`. No se repite mientras el estado no cambia.
 */
export function actualizarMalestar(ctx: Contexto): void {
  const e = ctx.estado;
  for (const lado of ['local', 'visitante'] as const) {
    const equipo = e.equipos[lado];
    // Se llama en cada tick: sin Polémico ni Rebelde en la plantilla no hay nada que avisar.
    if (!equipoConMalestar(equipo)) continue;
    const activos = e.malestar[lado];
    for (const [defecto, activo] of [
      ['Polemico', polemicoActivo(e, equipo)],
      ['Rebelde', rebeldeActivo(e, equipo)],
    ] as const) {
      const antes = activos.find((a) => a.defecto === defecto);
      if (activo && !antes) {
        activos.push({ defecto, jugadorId: activo.id });
        emitir(ctx, 'malestar', lado, [{ rol: 'autor', jugadorId: activo.id }], { defecto, activo: true, jugadorId: activo.id }, true);
      } else if (!activo && antes) {
        activos.splice(activos.indexOf(antes), 1);
        emitir(ctx, 'malestar', lado, [{ rol: 'autor', jugadorId: antes.jugadorId }], { defecto, activo: false, jugadorId: antes.jugadorId }, true);
      }
    }
  }
}
