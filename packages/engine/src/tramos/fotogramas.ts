/**
 * Fotogramas para la reproducción 2D (T134): posiciones aproximadas de los 22 jugadores y del balón,
 * un fotograma por segundo de juego.
 *
 * Se calculan a partir de la rejilla del estado (zona y carril del balón, portador, casillas de la
 * formación) sin consumir números del PRNG del partido, de modo que pedirlos no cambia el partido
 * (FR-032, SC-008). Coordenadas absolutas: x 0–1000 (el local ataca hacia x = 1000), y 0–640.
 *
 * - El balón está en el centro de su celda (6 zonas × 3 carriles) desde el punto de vista del equipo
 *   que lo tiene.
 * - Cada equipo desplaza su bloque hacia el balón: en largo según la zona y en ancho según el carril.
 *   El que ataca sube y el que defiende se repliega; el portero apenas se mueve.
 * - El portador va pegado al balón.
 * - Un pequeño vaivén, que solo depende del tick y del jugador, evita que el dibujo parezca congelado.
 */
import { FORMACIONES } from '@fbd/domain';
import type { EstadoMotor } from '../estado/estado';
import type { Fotograma, Lado } from '../tipos';

const LARGO = 1000;
const ANCHO = 640;
const ZONAS = 6;
const Y_CARRIL = [107, 320, 533] as const;

/** Cuánto sigue el bloque al balón (fracción de la distancia del balón al centro). */
const SEGUIMIENTO_LARGO = 0.35;
const SEGUIMIENTO_ANCHO = 0.25;
const SEGUIMIENTO_PORTERO = 0.05;
/** Lo que sube el equipo que ataca y se repliega el que defiende. */
const EMPUJE_POSESION = 40;
const VAIVEN = 6;

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const redondear = (v: number) => Math.round(v * 10) / 10;

/** Posición del balón en coordenadas absolutas. */
function posicionBalon(estado: EstadoMotor): [number, number] {
  const b = estado.balon;
  const x = ((b.zona + 0.5) * LARGO) / ZONAS;
  const y = Y_CARRIL[b.carril] ?? ANCHO / 2;
  return b.posesion === 'local' ? [x, y] : [LARGO - x, ANCHO - y];
}

/** De coordenadas propias de un equipo (ataca hacia x = 1000) a absolutas, y al revés (es simétrico). */
const absoluta = (lado: Lado, x: number, y: number): [number, number] => (lado === 'local' ? [x, y] : [LARGO - x, ANCHO - y]);

export function fotogramaActual(estado: EstadoMotor): Fotograma {
  const balon = posicionBalon(estado);
  const j: Record<number, [number, number]> = {};
  for (const lado of ['local', 'visitante'] as const) {
    const equipo = estado.equipos[lado];
    const casillas = FORMACIONES[equipo.formacion].casillas;
    const [bx, by] = absoluta(lado, balon[0], balon[1]);
    const empuje = estado.balon.posesion === lado ? EMPUJE_POSESION : -EMPUJE_POSESION;
    for (const jugador of equipo.jugadores) {
      if (!jugador.enCampo) continue;
      const zona = casillas.find((x) => x.id === jugador.casillaId)?.zona ?? { x: 450, y: 320 };
      const portero = jugador.casillaId === 'POR';
      const fase = estado.tick * 0.9 + jugador.id;
      const x = portero
        ? zona.x + (bx - LARGO / 2) * SEGUIMIENTO_PORTERO
        : zona.x + (bx - LARGO / 2) * SEGUIMIENTO_LARGO + empuje + Math.sin(fase) * VAIVEN;
      const y = portero ? zona.y + (by - ANCHO / 2) * SEGUIMIENTO_PORTERO : zona.y + (by - ANCHO / 2) * SEGUIMIENTO_ANCHO + Math.cos(fase) * VAIVEN;
      const [ax, ay] = absoluta(lado, limitar(x, 10, LARGO - 10), limitar(y, 10, ANCHO - 10));
      j[jugador.id] = [redondear(ax), redondear(ay)];
    }
  }
  // El portador va pegado al balón, un poco por detrás según hacia dónde ataca.
  const portador = estado.balon.portadorId;
  if (j[portador]) j[portador] = [redondear(balon[0] + (estado.balon.posesion === 'local' ? -8 : 8)), redondear(balon[1])];
  return { tick: estado.tick, balon: [redondear(balon[0]), redondear(balon[1])], j };
}

/**
 * Fotogramas de los segundos que hay entre `a` y `b` (sin incluirlos), interpolados linealmente: una
 * acción del motor puede durar varios segundos y la reproducción necesita uno por segundo.
 */
export function fotogramasIntermedios(a: Fotograma, b: Fotograma): Fotograma[] {
  const desde = Math.floor(a.tick);
  const hasta = Math.floor(b.tick);
  if (hasta - desde <= 1 || b.tick <= a.tick) return [];
  const mezcla = (p: [number, number], q: [number, number], t: number): [number, number] => [redondear(p[0] + (q[0] - p[0]) * t), redondear(p[1] + (q[1] - p[1]) * t)];
  const intermedios: Fotograma[] = [];
  for (let s = desde + 1; s < hasta; s++) {
    const t = (s - a.tick) / (b.tick - a.tick);
    const j: Record<number, [number, number]> = {};
    for (const [id, pos] of Object.entries(b.j)) {
      const antes = a.j[Number(id)];
      j[Number(id)] = antes ? mezcla(antes, pos, t) : pos;
    }
    intermedios.push({ tick: s, balon: mezcla(a.balon, b.balon, t), j });
  }
  return intermedios;
}
