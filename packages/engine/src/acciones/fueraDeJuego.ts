/**
 * Fuera de juego por posición (spec 014, research R4; FR-008 a FR-012): sale de las posiciones reales en el momento
 * del pase, sin sorteo. Funciones puras; coordenadas del equipo que ataca (x hacia la portería rival).
 */
import type { EquipoEstado, EstadoMotor, JugadorEnPartido } from '../estado/estado';
import { decimasDeMetros } from '../espacio/campo';
import { aEquipo, LARGO, lineaDe } from '../espacio/geometria';
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
  return x > penultimoDefensor(estado, defensor, atacante.lado) + decimasDeMetros(estado.parametros.fueraDeJuego.toleranciaM);
}

/** Ventana de la línea rota: el penúltimo defensor si es de la línea defensiva, y su x y la del siguiente (atacante). */
function ventanaRezagado(estado: EstadoMotor, defensor: EquipoEstado, ladoAtacante: Lado): { rezagado: JugadorEnPartido; x2: number; x3: number } | null {
  let x1 = -Infinity;
  let x2 = -Infinity;
  let x3 = -Infinity;
  let j1: JugadorEnPartido | null = null;
  let j2: JugadorEnPartido | null = null;
  for (const j of defensor.jugadores) {
    const p = j.enCampo ? estado.espacio.jugadores[j.id] : undefined;
    if (!p) continue;
    const xj = aEquipo(ladoAtacante, p).x;
    if (xj > x1) {
      [x3, x2, j2, x1, j1] = [x2, x1, j1, xj, j];
    } else if (xj > x2) {
      [x3, x2, j2] = [x2, xj, j];
    } else if (xj > x3) x3 = xj;
  }
  return j2 && x3 !== -Infinity && lineaDe(defensor, j2) === 'defensa' ? { rezagado: j2, x2, x3 } : null;
}

/** El atacante en `x` (sus coordenadas) estaría en fuera de juego con la línea de los demás, pero el rezagado lo habilita. */
function habilitadoEn(estado: EstadoMotor, v: { x2: number; x3: number }, x: number, xBalon: number): boolean {
  const tolerancia = decimasDeMetros(estado.parametros.fueraDeJuego.toleranciaM);
  return x > LARGO / 2 && x > xBalon && x > v.x3 + tolerancia && x <= v.x2 + tolerancia;
}

/**
 * Defensa rezagado que deja en juego al receptor (spec 015, research R9; métrica `habilitaciones` de SC-006): el
 * penúltimo defensor, si es de la línea defensiva y el receptor estaría en fuera de juego con la línea de los demás (el
 * siguiente hacia arriba). `null` si no lo hay. `xBalon` en coordenadas del atacante.
 */
export function habilitador(estado: EstadoMotor, atacante: EquipoEstado, receptor: JugadorEnPartido, xBalon: number): JugadorEnPartido | null {
  const q = estado.espacio.jugadores[receptor.id];
  if (!q) return null;
  const v = ventanaRezagado(estado, estado.equipos[atacante.lado === 'local' ? 'visitante' : 'local'], atacante.lado);
  return v && habilitadoEn(estado, v, aEquipo(atacante.lado, q).x, xBalon) ? v.rezagado : null;
}

/**
 * Exposición de la línea de `ladoDefensor` en este momento (spec 015, SC-006; decisión del 2026-11-17): cuántos
 * atacantes de campo deja en juego un defensa rezagado. Es la versión continua de las habilitaciones, con muchas más
 * muestras; la herramienta de equilibrado la mide en cada tick.
 */
export function exposicionLinea(estado: EstadoMotor, ladoDefensor: Lado): number {
  const ladoAtacante: Lado = ladoDefensor === 'local' ? 'visitante' : 'local';
  const v = ventanaRezagado(estado, estado.equipos[ladoDefensor], ladoAtacante);
  if (!v) return 0;
  const xBalon = aEquipo(ladoAtacante, estado.espacio.balon).x;
  let n = 0;
  for (const j of estado.equipos[ladoAtacante].jugadores) {
    const q = j.enCampo && j.casillaId !== 'POR' ? estado.espacio.jugadores[j.id] : undefined;
    if (q && habilitadoEn(estado, v, aEquipo(ladoAtacante, q).x, xBalon)) n++;
  }
  return n;
}

/**
 * Pericia de 0 (stat 70 o menos) a 1 (stat 100): cuánto se evita un error que comete un jugador medio (desmarque del
 * que se pasa de la línea, visión del pasador que da el balón a un compañero en fuera de juego o se salta la directriz
 * del mano a mano).
 */
export function factorPericia(stat: number): number {
  return Math.min(1, Math.max(0, (stat - 70) / 30));
}
