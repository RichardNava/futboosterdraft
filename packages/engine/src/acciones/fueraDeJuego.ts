/**
 * Fuera de juego por posición (spec 014, research R4; FR-008 a FR-012): sale de las posiciones reales en el momento
 * del pase, sin sorteo. Funciones puras; coordenadas del equipo que ataca (x hacia la portería rival).
 */
import type { EquipoEstado, EstadoMotor, JugadorEnPartido } from '../estado/estado';
import { decimasDeMetros } from '../espacio/campo';
import { aEquipo, LARGO } from '../espacio/geometria';
import type { Lado } from '../tipos';

/** x (coordenadas del atacante) del penúltimo rival hacia su propia línea de gol, portero incluido. */
export function penultimoDefensor(estado: EstadoMotor, defensor: EquipoEstado, ladoAtacante: Lado): number {
  let primero = -Infinity;
  let segundo = -Infinity;
  for (const j of defensor.jugadores) {
    const q = j.enCampo ? estado.espacio.jugadores[j.id] : undefined;
    if (!q) continue;
    const x = aEquipo(ladoAtacante, q).x;
    if (x > primero) {
      segundo = primero;
      primero = x;
    } else if (x > segundo) segundo = x;
  }
  // Con menos de dos rivales en el campo no hay línea que respetar más allá de la mitad.
  return segundo === -Infinity ? LARGO / 2 : segundo;
}

/**
 * El receptor está en fuera de juego: en campo rival, por delante del balón y por delante del penúltimo defensor más
 * de `fueraDeJuego.toleranciaM` (a la altura es legal, FR-009). `xBalon` en coordenadas del atacante.
 */
export function enFueraDeJuego(estado: EstadoMotor, atacante: EquipoEstado, receptor: JugadorEnPartido, xBalon: number): boolean {
  const q = estado.espacio.jugadores[receptor.id];
  if (!q) return false;
  const x = aEquipo(atacante.lado, q).x;
  if (x <= LARGO / 2 || x <= xBalon) return false;
  const defensor = estado.equipos[atacante.lado === 'local' ? 'visitante' : 'local'];
  return x > penultimoDefensor(estado, defensor, atacante.lado) + decimasDeMetros(estado.parametros.fueraDeJuego!.toleranciaM);
}

/**
 * Pericia de 0 (stat 70 o menos) a 1 (stat 100): cuánto se evita un error que comete un jugador medio (desmarque del
 * que se pasa de la línea, visión del pasador que da el balón a un compañero en fuera de juego o se salta la directriz
 * del mano a mano).
 */
export function factorPericia(stat: number): number {
  return Math.min(1, Math.max(0, (stat - 70) / 30));
}
