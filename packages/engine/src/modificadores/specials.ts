/**
 * Specials (T084; FR-037, FR-038).
 *
 * - Bonificaciones de equipo (se aplican una sola vez aunque haya varios jugadores con el special):
 *   Capitanía +1 a todos; Fortaleza mental +2 a todos yendo por detrás; Jerarquía +1 a los defensas;
 *   Líbero +2 a los centrocampistas; Box-to-Box +1 a defensas y delanteros.
 * - Bonificaciones de duelo: Intimidante −1 al rival del duelo; Infranqueable +2 a tackling y marcaje
 *   frente a regate ≥ 95; el resto, ajustes de probabilidad en su acción concreta.
 * - Repeticiones de tirada (reroll): Filigranas, Muro defensivo, Guante en el pie y Santo.
 *
 * Inventario de la acción que mide cada special con efecto en el partido (spec 003, research R10; SC-007 en
 * `tools/balance/src/checks/partido.ts`). Los marcados con «elección» también cambian qué acción se elige:
 *
 * | Special | Acción medida | Dónde |
 * |---|---|---|
 * | LanzadorFaltas | goles de falta directa (+30 %); elección: más tiro directo (×1,3) | tiro.ts, balonParado.ts |
 * | LanzadorPenalties | goles de penalti | tiro.ts |
 * | Cabeceador | goles de cabeza del jugador | tiro.ts |
 * | Rematador | goles tras centro | tiro.ts |
 * | Matador | goles en mano a mano; elección: en una jugada de mano a mano siempre tira | tiro.ts, juego.ts |
 * | Llegador | goles del centrocampista; elección: entra entre los rematadores de los centros | tiro.ts, juego.ts |
 * | Desbordante | regates ganados por banda; elección: regate por banda ×1,3 | juego.ts, opciones.ts |
 * | Filigranas | regates ganados (reroll) | juego.ts |
 * | GuanteEnElPie | centros completados (reroll) | juego.ts, tiro.ts |
 * | PrimerToque, Elegante, JugadorEntreLineas | pases completados | juego.ts |
 * | Potente | duelos de regate y conducción ganados | juego.ts |
 * | Presionador | pérdidas provocadas al rival | juego.ts |
 * | RecuperadorTrasPerdida | recuperaciones tras pérdida | juego.ts |
 * | MuroDefensivo | tiros a puerta en contra desde la frontal (reroll del defensor) | juego.ts |
 * | Volador | centros rivales despejados | tiro.ts |
 * | Intimidante, Aura, Infranqueable | duelos ganados | specials.ts |
 * | Parapenalties, Ordenabarreras, OneToOne, Santo | paradas del portero | tiro.ts |
 * | Robusto | lesiones (001/SC-015) | lesiones.ts |
 * | Incansable, Motivador | cansancio | cansancio.ts |
 * | Capitania, FortalezaMental, Jerarquia, Libero, BoxToBox | bonificación de equipo (stats) | specials.ts |
 * | Carismatico | balones recibidos | receptor.ts |
 */
import type { Special } from '@fbd/domain';
import { minutoDeJuego, rival, type EquipoEstado, type EstadoMotor, type JugadorEnPartido } from '../estado/estado';

const tiene = (j: JugadorEnPartido, s: Special) => j.jugador.specials.includes(s);

function algunoEnCampo(equipo: EquipoEstado, s: Special): boolean {
  return equipo.jugadores.some((j) => j.enCampo && tiene(j, s));
}

export function vaPerdiendo(estado: EstadoMotor, equipo: EquipoEstado): boolean {
  return estado.marcador[equipo.lado] < estado.marcador[rival(equipo.lado)];
}

/** Bonificación de equipo por demarcación (la misma para todos los de una demarcación, FR-038). */
export function bonusPorDemarcacion(estado: EstadoMotor, equipo: EquipoEstado): Record<'POR' | 'DEF' | 'MED' | 'DEL', number> {
  const s = estado.parametros.specials;
  let capitania = false;
  let fortaleza = false;
  let jerarquia = false;
  let libero = false;
  let boxToBox = false;
  for (const j of equipo.jugadores) {
    if (!j.enCampo) continue;
    const sp = j.jugador.specials;
    if (sp.length === 0) continue;
    capitania ||= sp.includes('Capitania');
    fortaleza ||= sp.includes('FortalezaMental');
    jerarquia ||= sp.includes('Jerarquia');
    libero ||= sp.includes('Libero');
    boxToBox ||= sp.includes('BoxToBox');
  }
  const comun = (capitania ? s.capitania : 0) + (fortaleza && vaPerdiendo(estado, equipo) ? s.fortalezaMental : 0);
  return {
    POR: comun,
    DEF: comun + (jerarquia ? s.jerarquia : 0) + (boxToBox ? s.boxToBox : 0),
    MED: comun + (libero ? s.libero : 0),
    DEL: comun + (boxToBox ? s.boxToBox : 0),
  };
}

/** Bonificación de equipo a todos los stats de un jugador (sin acumulación entre jugadores, FR-038). */
export function bonusEquipo(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido): number {
  if (!j.enCampo) return 0;
  const s = estado.parametros.specials;
  let bonus = 0;
  if (algunoEnCampo(equipo, 'Capitania')) bonus += s.capitania;
  if (vaPerdiendo(estado, equipo) && algunoEnCampo(equipo, 'FortalezaMental')) bonus += s.fortalezaMental;
  const dem = j.jugador.demarcacion;
  if (dem === 'DEF' && algunoEnCampo(equipo, 'Jerarquia')) bonus += s.jerarquia;
  if (dem === 'MED' && algunoEnCampo(equipo, 'Libero')) bonus += s.libero;
  if ((dem === 'DEF' || dem === 'DEL') && algunoEnCampo(equipo, 'BoxToBox')) bonus += s.boxToBox;
  return bonus;
}

/** Santo: desde el minuto 80, en toda la prórroga, y en eliminatoria yendo ganando o empatado. */
export function santoActivo(estado: EstadoMotor, equipoPortero: EquipoEstado): boolean {
  const minuto = minutoDeJuego(estado.reloj);
  if (estado.reloj.parte >= 3 || estado.fase === 'penaltis') return true;
  if (minuto >= estado.parametros.specials.santoMinutoInicio) return true;
  return estado.eliminatoria && !vaPerdiendo(estado, equipoPortero);
}

/** Ajustes de duelo entre un atacante y un defensor concretos. */
export function ajusteDuelo(
  estado: EstadoMotor,
  atacante: JugadorEnPartido,
  defensor: JugadorEnPartido | undefined,
): { atacante: number; defensor: number; probabilidad: number } {
  const s = estado.parametros.specials;
  let a = 0;
  let d = 0;
  let prob = 0;
  if (defensor) {
    // Intimidante: −1 a los atributos enfrentados del rival más cercano.
    if (tiene(defensor, 'Intimidante')) a -= s.intimidante;
    if (tiene(atacante, 'Intimidante')) d -= s.intimidante;
  }
  if (tiene(atacante, 'Aura')) prob += s.bonusProbabilidadLeve;
  if (defensor && tiene(defensor, 'Aura')) prob -= s.bonusProbabilidadLeve;
  return { atacante: a, defensor: d, probabilidad: prob };
}

/** Infranqueable: +2 a tackling y marcaje frente a jugadores con regate ≥ 95. */
export function bonusInfranqueable(estado: EstadoMotor, atacante: JugadorEnPartido, defensor: JugadorEnPartido | undefined): number {
  if (!defensor || !tiene(defensor, 'Infranqueable')) return 0;
  const regate = (atacante.jugador.stats as unknown as Record<string, number>).regate ?? 0;
  return regate >= estado.parametros.specials.infranqueableUmbralRegate ? estado.parametros.specials.infranqueable : 0;
}

export { tiene };
