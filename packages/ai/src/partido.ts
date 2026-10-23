/**
 * Decisiones de los NPC durante el partido (T127), en cada punto de decisión (descanso, antes de la
 * prórroga y, en 2D, en las interrupciones):
 * - sustituciones por cansancio y, en los niveles altos, para proteger a defensas con amarilla;
 * - cambio de táctica según el marcador y el minuto, más decidido cuanto mayor es el nivel.
 *
 * Nunca pide más cambios de los que quedan (FR-042) y deja de reserva los que marca su perfil para
 * posibles lesiones. Las lesiones y expulsiones las resuelve el motor.
 *
 * Spec 003 (FR-037): con la probabilidad de su nivel, un error de partido (`errorPartido`): un cambio tardío,
 * no reaccionar al marcador o un cambio de táctica contraproducente.
 */
import { resolverResto } from './resolverResto';
import { derivarSemilla, parametrosActuales, Rng, tacticaPorDefecto, validarTactica, type ParametrosEquilibrado, type Semilla, type Tactica } from '@fbd/domain';
import {
  aplicarDecision,
  avanzar,
  maxSustituciones,
  minutoDeJuego,
  type DecisionPartido,
  type EstadoMotor,
  type JugadorEnPartido,
  type Lado,
  type ResultadoTramo,
} from '@fbd/engine';
import { TACTICA_DEFENSIVA, TACTICA_OFENSIVA } from './alineacion';
import { errorPartido } from './errores';
import { erroresDe, PERFILES, type NivelIA } from './perfiles';
import { revulsivoParaEntrar, umbralCansancioDe } from './rasgos';

const iguales = (a: Tactica, b: Tactica) => JSON.stringify(a) === JSON.stringify(b);

export function decidirEnPartido(
  nivel: NivelIA,
  estado: EstadoMotor,
  lado: Lado,
  semilla: Semilla,
  p: ParametrosEquilibrado = parametrosActuales(),
): DecisionPartido[] {
  if (estado.fase === 'finalizado' || estado.fase === 'penaltis') return [];
  const perfil = PERFILES[nivel].partido;
  const rng = new Rng(semilla);
  const equipo = estado.equipos[lado];
  const participanteId = equipo.participanteId;
  const decisiones: DecisionPartido[] = [];

  // Sustituciones.
  let quedan = maxSustituciones(estado) - equipo.sustitucionesUsadas - perfil.reservaCambios;
  const banquillo = equipo.jugadores.filter((j) => !j.enCampo && !j.retirado);
  const usados = new Set<number>();
  const relevo = (sale: JugadorEnPartido) =>
    banquillo
      .filter((j) => !usados.has(j.id) && j.jugador.demarcacion === sale.jugador.demarcacion)
      .sort((a, b) => b.jugador.media - a.jugador.media || a.id - b.id)[0];
  const salen = equipo.jugadores
    .filter((j) => j.enCampo && j.jugador.demarcacion !== 'POR')
    .map((j) => ({ j, motivo: j.cansancio >= umbralCansancioDe(j.jugador, perfil.umbralCansancio) ? j.cansancio : perfil.protegeAmonestados && estado.fase === 'descanso' && j.amarillas > 0 && j.jugador.demarcacion === 'DEF' ? 0.5 : 0 }))
    .filter((x) => x.motivo > 0)
    .sort((a, b) => b.motivo - a.motivo || a.j.id - b.j.id);
  for (const { j } of salen) {
    if (quedan <= 0) break;
    const entra = relevo(j);
    if (!entra) continue;
    usados.add(entra.id);
    decisiones.push({ participanteId, tipo: 'sustitucion', datos: { sale: j.id, entra: entra.id } });
    quedan--;
  }
  // Revulsivo (spec 005): entra en el descanso.
  const revulsivo = quedan > 0 ? revulsivoParaEntrar(estado, lado, new Set([...usados, ...decisiones.flatMap((d) => (d.tipo === 'sustitucion' ? [d.datos.sale] : []))])) : null;
  if (revulsivo) {
    usados.add(revulsivo.entra.id);
    decisiones.push({ participanteId, tipo: 'sustitucion', datos: { sale: revulsivo.sale.id, entra: revulsivo.entra.id } });
    quedan--;
  }

  // Táctica según el marcador: perdiendo, a por el partido; ganando en la segunda mitad, a cerrarlo.
  const diferencia = estado.marcador[lado] - estado.marcador[lado === 'local' ? 'visitante' : 'local'];
  let objetivo: Tactica | null = null;
  if (diferencia < 0) objetivo = TACTICA_OFENSIVA;
  else if (diferencia > 0 && minutoDeJuego(estado.reloj) >= 45) objetivo = TACTICA_DEFENSIVA;
  else if (diferencia === 0 && !iguales(equipo.tactica, tacticaPorDefecto()) && estado.fase === 'descanso') objetivo = tacticaPorDefecto();
  if (objetivo && !iguales(objetivo, equipo.tactica) && validarTactica(objetivo).length === 0 && rng.probabilidad(Math.round(perfil.reaccionTactica * 1000))) {
    decisiones.push({ participanteId, tipo: 'tactica', datos: { tactica: objetivo } });
  }

  const rngError = new Rng(derivarSemilla(semilla, 'error'));
  if (rngError.probabilidad(erroresDe(nivel, p).probabilidad.partido)) {
    const error = errorPartido(decisiones, estado, lado, { ofensiva: TACTICA_OFENSIVA, defensiva: TACTICA_DEFENSIVA }, rngError);
    if (error) return error.decisiones;
  }
  return decisiones;
}

/** Niveles de los lados que controla un NPC (un lado sin nivel lo controla un humano o nadie). */
export type NivelesPartido = Partial<Record<Lado, NivelIA>>;

/**
 * Encola las decisiones de los NPC en el punto de decisión actual (descanso o antes de la prórroga).
 * La semilla de cada decisión depende del lado y del tick, así que repetir la llamada da lo mismo.
 */
export function decidirNPCEnPausa(estado: EstadoMotor, niveles: NivelesPartido, semilla: Semilla): DecisionPartido[] {
  const aplicadas: DecisionPartido[] = [];
  for (const lado of ['local', 'visitante'] as const) {
    const nivel = niveles[lado];
    if (!nivel) continue;
    for (const d of decidirEnPartido(nivel, estado, lado, derivarSemilla(semilla, `npc:${lado}:${estado.tick}`))) {
      if (aplicarDecision(estado, d).ok) aplicadas.push(d);
    }
  }
  return aplicadas;
}

/**
 * Juega hasta el final un partido en el que no hay que esperar a ningún humano (NPC contra NPC,
 * resolución automática, simulaciones de equilibrado), parándose en el descanso y antes de la prórroga
 * para que los NPC decidan. Devuelve un único tramo con todos los eventos (ver `resolverResto`).
 */
export function jugarHastaElFinal(estado: EstadoMotor, niveles: NivelesPartido, semilla: Semilla): ResultadoTramo {
  const r = resolverResto(estado, niveles, semilla);
  const ultimo = r.tramos[r.tramos.length - 1];
  if (!ultimo) return avanzar(estado, 'final');
  return { ...ultimo, estado: r.estado, desdeTick: r.tramos[0]!.desdeTick, eventos: r.eventos };
}
