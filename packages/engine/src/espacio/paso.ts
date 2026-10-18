/**
 * Paso espacial de cada tick (research R3): objetivos → movimiento de los jugadores → balón. Se llama una
 * vez por tick desde `pasarTiempo`, en cualquier modo de avance, así que la rápida y la 2D recorren
 * exactamente la misma secuencia.
 */
import type { EstadoMotor } from '../estado/estado';
import type { Fotograma } from '../tipos';
import { moverBalon } from './balon';
import { calcularObjetivos } from './objetivos';
import { moverJugadores, PASO_MOVIMIENTO } from './movimiento';

/** Ticks entre dos cálculos de los objetivos de forma (cambian despacio: siguen al bloque y al balón). */
const PASO_OBJETIVOS = 4;

export function pasoEspacial(estado: EstadoMotor): void {
  const esp = estado.espacio;
  if (estado.tick % PASO_MOVIMIENTO === 0) {
    // Se recalculan cada PASO_OBJETIVOS ticks (y durante los saques, para que cada uno vaya a su sitio).
    if (estado.tick % PASO_OBJETIVOS === 0 || esp.accion?.tipo === 'saque') esp.objetivos = calcularObjetivos(estado);
    moverJugadores(estado);
  }
  moverBalon(estado);
}

/** Orden de los jugadores en los fotogramas v2: los del local y después los del visitante (research R5). */
export function ordenJugadores(estado: EstadoMotor): number[] {
  return [...estado.equipos.local.jugadores, ...estado.equipos.visitante.jugadores].map((j) => j.id);
}

/** Fotograma v2 del estado actual: `[tick, bx, by, bz, x0, y0, …]` en unidades enteras de campo. */
export function fotograma(estado: EstadoMotor, orden: readonly number[]): Fotograma {
  const esp = estado.espacio;
  const f: number[] = [estado.tick, Math.round(esp.balon.x / 10), Math.round(esp.balon.y / 10), Math.round(esp.balon.z / 10)];
  for (const id of orden) {
    const p = esp.jugadores[id];
    if (p) f.push(Math.round(p.x / 10), Math.round(p.y / 10));
    else f.push(-1, -1);
  }
  return f;
}
