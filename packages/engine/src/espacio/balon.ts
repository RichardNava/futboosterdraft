/**
 * Movimiento del balón (research R3; spec 014, research R1): solo se mueve por acciones.
 *
 * - En vuelo (pases, centros, tiros, despejes): de su origen a su destino en el tiempo de la acción; si va
 *   hacia un jugador, sigue al jugador hasta llegarle. Los balones aéreos llevan una altura `z` en parábola.
 * - En un saque (reanudación): rueda hacia el punto del saque.
 * - Suelto: rueda en su última dirección y frena (`espacio.rozamientoSuelto`) hasta pararse; nunca va al encuentro
 *   de quien lo persigue (FR-001).
 * - En el resto de casos va pegado al pie de quien lo lleva (control, conducción, regate) o se queda quieto.
 */
import type { EstadoMotor } from '../estado/estado';
import { acotar, dividir, escalar, isqrt } from './aritmetica';
import { ANCHO, LARGO } from './geometria';

/** Altura máxima de un balón aéreo, en décimas de unidad. */
const ALTURA_AEREO = 400;
/** Distancia del balón al centro de la chapa de quien lo lleva, hacia donde ataca. */
const DELANTE = 70;
/** Distancia a las líneas a la que se para un balón suelto. */
const MARGEN_LINEA = 200;

const VUELO = new Set(['pase_corto', 'pase_largo', 'pase_espacio', 'centro', 'tiro', 'despeje']);

/** La acción mueve el balón por el aire o raso de un punto a otro (pases, centros, tiros y despejes). */
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

/** Balón suelto: un tick de rodadura en su dirección, frenando, sin salir del campo. */
function rodar(estado: EstadoMotor): void {
  const esp = estado.espacio;
  const v = esp.velocidadBalon;
  const conservado = 1 - estado.parametros.espacio.rozamientoSuelto!;
  const vx = Math.trunc(v.x * conservado);
  const vy = Math.trunc(v.y * conservado);
  // Un balón que ya está más cerca de la línea no vuelve hacia dentro.
  const b = esp.balon;
  const x = acotar(b.x + vx, Math.min(MARGEN_LINEA, b.x), Math.max(LARGO - MARGEN_LINEA, b.x));
  const y = acotar(b.y + vy, Math.min(MARGEN_LINEA, b.y), Math.max(ANCHO - MARGEN_LINEA, b.y));
  // Junto a la línea se para (la salida del campo solo la deciden las acciones); con margen, para que quien va a por él
  // llegue sin chocar con la línea.
  // Si llegaría a la línea, se para donde está (sin deslizarse por ella).
  if (x !== b.x + vx || y !== b.y + vy) {
    esp.velocidadBalon = { x: 0, y: 0 };
    return;
  }
  esp.velocidadBalon = { x: vx, y: vy };
  esp.balon = { x, y, z: 0 };
}

/** Mueve el balón un tick según la acción en curso (vuelo, saque, suelto) o pegado a quien lo lleva. */
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
    // La velocidad es la del vuelo aunque llegue antes: al terminar, el balón sigue rodando en esa dirección.
    if (d > 0) {
      const [vx, vy] = escalar(dx, dy, v);
      esp.velocidadBalon = { x: vx, y: vy };
    }
    if (d <= v) {
      esp.balon = { x: destino.x, y: destino.y, z: 0 };
      if (a.aId !== undefined) a.enPunto = true;
    } else {
      const [mx, my] = escalar(dx, dy, v);
      esp.balon = { x: b.x + mx, y: b.y + my, z };
    }
    return;
  }
  if (a && a.tipo === 'saque') {
    // Reanudación reglamentaria: rueda hasta el punto del saque a velocidad de balón suelto.
    const destino = a.destino;
    const dx = destino.x - b.x;
    const dy = destino.y - b.y;
    const d = isqrt(dx * dx + dy * dy);
    const v = estado.parametros.espacio.velocidadBalon.suelto;
    if (d <= v) esp.balon = { x: destino.x, y: destino.y, z: 0 };
    else {
      const [mx, my] = escalar(dx, dy, v);
      esp.balon = { x: b.x + mx, y: b.y + my, z: 0 };
    }
    esp.velocidadBalon = { x: 0, y: 0 };
    return;
  }
  if (a && a.tipo === 'control' && a.motivo === 'suelto') {
    rodar(estado);
    return;
  }
  // Pegado a quien lo lleva: su velocidad es la del jugador.
  const portador = esp.jugadores[estado.balon.portadorId];
  if (!portador) return;
  const sentido = estado.balon.posesion === 'local' ? 1 : -1;
  esp.balon = { x: portador.x + sentido * DELANTE, y: portador.y, z: 0 };
  esp.velocidadBalon = { x: portador.vx, y: portador.vy };
}
