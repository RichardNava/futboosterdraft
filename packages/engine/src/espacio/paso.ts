/**
 * Paso espacial de cada tick (research R3): objetivos → movimiento de los jugadores → balón. Se llama una
 * vez por tick desde `pasarTiempo`, en cualquier modo de avance, así que la rápida y la 2D recorren
 * exactamente la misma secuencia. La misma cadencia para NPC y humanos (spec 018, FR-043).
 */
import type { EstadoMotor } from '../estado/estado';
import type { Fotograma } from '../tipos';
import { moverBalon } from './balon';
import { calcularObjetivos } from './objetivos';
import { avanzarMedioPaso, moverJugadores, PASO_MOVIMIENTO } from './movimiento';

/** Ticks entre dos cálculos de los objetivos de forma (cambian despacio: siguen al bloque y al balón). */
const PASO_OBJETIVOS = 4;

/**
 * Si toca recalcular los objetivos (spec 018, R8). Durante un saque, solo si cambia su clave (motivo, sacador y posición
 * del balón) o si la referencia de la forma aún no ha alcanzado el balón; fuera de él, cada `PASO_OBJETIVOS` ticks.
 */
function tocaObjetivos(estado: EstadoMotor): boolean {
  const esp = estado.espacio;
  const a = esp.accion;
  if (a?.tipo !== 'saque') {
    delete esp.claveSaque;
    return estado.tick % PASO_OBJETIVOS === 0;
  }
  const clave = `${a.motivo}:${a.deId}:${esp.balon.x}:${esp.balon.y}`;
  if (clave === esp.claveSaque && esp.referencia.x === esp.balon.x && esp.referencia.y === esp.balon.y) return false;
  esp.claveSaque = clave;
  return true;
}

/** Un tick de la capa espacial: objetivos de forma, movimiento de los jugadores y del balón. */
export function pasoEspacial(estado: EstadoMotor): void {
  const esp = estado.espacio;
  if (estado.tick % PASO_MOVIMIENTO === 0) {
    if (tocaObjetivos(estado)) esp.objetivos = calcularObjetivos(estado);
    moverJugadores(estado);
  } else if (estado.tick % (PASO_MOVIMIENTO / 2) === 0) {
    avanzarMedioPaso(estado);
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
