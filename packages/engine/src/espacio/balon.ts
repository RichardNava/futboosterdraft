/**
 * Movimiento del balón (research R3): solo se mueve por acciones.
 *
 * - En vuelo (pases, centros, tiros, despejes): de su origen a su destino en el tiempo de la acción; si va
 *   hacia un jugador, sigue al jugador hasta llegarle. Los balones aéreos llevan una altura `z` en parábola.
 * - En un saque (reanudación): rueda hacia el punto del saque.
 * - Suelto tras una pérdida: rueda hacia quien lo recupera.
 * - En el resto de casos va pegado al pie de quien lo lleva (control, conducción, regate) o se queda quieto.
 */
import type { EstadoMotor } from '../estado/estado';
import { dividir, escalar, isqrt } from './aritmetica';

/** Altura máxima de un balón aéreo, en décimas de unidad. */
const ALTURA_AEREO = 400;
/** Distancia del balón al centro de la chapa de quien lo lleva, hacia donde ataca. */
const DELANTE = 70;

const VUELO = new Set(['pase_corto', 'pase_largo', 'pase_espacio', 'centro', 'tiro', 'despeje']);

export function esVuelo(tipo: string): boolean {
  return VUELO.has(tipo);
}

/** Punto al que va el balón en la acción actual (el jugador al que se dirige, o el punto fijo). */
export function destinoBalon(estado: EstadoMotor): { x: number; y: number } | null {
  const a = estado.espacio.accion;
  if (!a) return null;
  const jugador = a.aId !== undefined ? estado.espacio.jugadores[a.aId] : undefined;
  // Un pase va primero al punto de recepción y, si el receptor aún no está, sigue hasta él.
  if (jugador && esVuelo(a.tipo) && !a.enPunto) return a.destino;
  return jugador ? { x: jugador.x, y: jugador.y } : a.destino;
}

export function moverBalon(estado: EstadoMotor): void {
  const esp = estado.espacio;
  const a = esp.accion;
  const b = esp.balon;
  if (a && esVuelo(a.tipo)) {
    // Va hacia su destino (o hacia el jugador, si se mueve) a la velocidad de su tipo; la altura de los
    // aéreos es una parábola sobre la duración prevista.
    const destino = destinoBalon(estado)!;
    const dx = destino.x - b.x;
    const dy = destino.y - b.y;
    const d = isqrt(dx * dx + dy * dy);
    const v = a.velocidad ?? 1;
    const total = Math.max(1, a.finTick - a.inicioTick);
    const t = Math.min(total, estado.tick - a.inicioTick);
    const z = a.aerea && d > v ? dividir(4 * ALTURA_AEREO * t * (total - t), total * total) : 0;
    if (d <= v) {
      esp.balon = { x: destino.x, y: destino.y, z: 0 };
      if (a.aId !== undefined) a.enPunto = true;
    } else {
      const [mx, my] = escalar(dx, dy, v);
      esp.balon = { x: b.x + mx, y: b.y + my, z };
    }
    return;
  }
  if (a && (a.tipo === 'saque' || (a.tipo === 'control' && a.motivo === 'suelto'))) {
    // Rueda hacia su destino (o hacia quien va a por él) a velocidad de balón suelto.
    const destino = destinoBalon(estado)!;
    const dx = destino.x - b.x;
    const dy = destino.y - b.y;
    const d = isqrt(dx * dx + dy * dy);
    const v = estado.parametros.espacio.velocidadBalon.suelto;
    if (d <= v) esp.balon = { x: destino.x, y: destino.y, z: 0 };
    else {
      const [mx, my] = escalar(dx, dy, v);
      esp.balon = { x: b.x + mx, y: b.y + my, z: 0 };
    }
    return;
  }
  // Pegado a quien lo lleva.
  const portador = esp.jugadores[estado.balon.portadorId];
  if (!portador) return;
  const sentido = estado.balon.posesion === 'local' ? 1 : -1;
  esp.balon = { x: portador.x + sentido * DELANTE, y: portador.y, z: 0 };
}
