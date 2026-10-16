/**
 * Partido en 2D en el servidor (T136; FR-048 a FR-050, research R11).
 *
 * - Simula de interrupción en interrupción (`avanzar('interrupcion')`) con fotogramas, y guarda cada
 *   tramo antes de anunciarlo con `partido.tramo` (igual que la rápida).
 * - Cada humano reproduce a su velocidad y comunica por dónde va (`partido.reproduccion`). El
 *   siguiente tramo solo se simula cuando el más lento ha llegado a la interrupción, así que la
 *   reproducción avanza a la menor de las velocidades (`partido.velocidad`, la mínima).
 * - Las decisiones se aceptan en cualquier momento y el motor las aplica en la siguiente interrupción;
 *   ambos reciben `partido.decision_aplicada` (FR-050).
 * - Contra un NPC, el partido va al ritmo del humano. Los NPC deciden en el descanso y antes de la
 *   prórroga.
 * - Nunca se bloquea (SC-011): a un humano que lleva 10 s desconectado se le deja de esperar hasta que
 *   vuelve, y aunque un cliente deje de informar, como mucho se espera lo que dura el tramo a x2.
 */
import { decidirNPCEnPausa } from '@fbd/ai';
import { avanzar } from '@fbd/engine';
import type { ContextoComando } from './actor';
import type { ControladorPartida } from './partida';
import { emitirAParticipantes, esHumano, nivelesDe, registrarTramo, terminarPartido, type PartidoEnCurso } from './partidoRapido';

export type Velocidad2D = 2 | 4 | 8 | 16 | 32;

export const VELOCIDAD_INICIAL: Velocidad2D = 4;
export const VELOCIDAD_MINIMA: Velocidad2D = 2;
/** Tras este tiempo desconectado, el servidor deja de esperar el reloj de reproducción del humano. */
export const ESPERA_DESCONECTADO_MS = 10_000;
/** Margen sobre la duración del tramo a la velocidad mínima antes de dejar de esperar a un cliente. */
const MARGEN_ESPERA_MS = 10_000;

type Tramo2D = Record<string, unknown> & { t: string; hastaTick?: unknown };

export interface Estado2D {
  /** Velocidad elegida por cada humano. */
  velocidades: Map<string, Velocidad2D>;
  /** Último tick de juego que ha mostrado cada humano. */
  reproduccion: Map<string, number>;
  velocidadEfectiva: Velocidad2D;
  /** Tick de la interrupción en la que acaba el último tramo enviado: hay que llegar a él para seguir. */
  objetivoTick: number;
  desdeTick: number;
  /** Hora (reloj del servidor) a la que se envió el último tramo. */
  enviadoEn: number;
  /** Tramos ya enviados, para la reconexión (el último con sus fotogramas). */
  tramos: Tramo2D[];
}

const clave = (c: ControladorPartida, p: PartidoEnCurso) => c.clave(`2d:${p.fila.id}`);

export function crearEstado2D(c: ControladorPartida, p: PartidoEnCurso): Estado2D {
  const humanos = [p.fila.localId, p.fila.visitanteId].filter((pid) => esHumano(c, pid));
  return {
    velocidades: new Map(humanos.map((pid) => [pid, VELOCIDAD_INICIAL])),
    reproduccion: new Map(),
    velocidadEfectiva: VELOCIDAD_INICIAL,
    objetivoTick: 0,
    desdeTick: 0,
    enviadoEn: c.servicios.reloj.ahora(),
    tramos: [],
  };
}

/**
 * Humanos de este partido a los que hay que esperar: los conectados y los que llevan menos de 10 s
 * desconectados. A quien no ha abierto la partida no se le espera.
 */
function aEsperar(c: ControladorPartida, p: PartidoEnCurso): string[] {
  const ahora = c.servicios.reloj.ahora();
  return [p.fila.localId, p.fila.visitanteId].filter((pid) => {
    if (!esHumano(c, pid)) return false;
    if (c.servicios.difusor.estaConectado(c.id, pid)) return true;
    const desde = c.desconectados.get(pid);
    return desde !== undefined && ahora - desde < ESPERA_DESCONECTADO_MS;
  });
}

function esperaMaxima(d: Estado2D): number {
  return ((d.objetivoTick - d.desdeTick) / VELOCIDAD_MINIMA) * 1000 + MARGEN_ESPERA_MS;
}

function puedeAvanzar(c: ControladorPartida, p: PartidoEnCurso): boolean {
  const d = p.dosD!;
  const esperados = aEsperar(c, p);
  if (esperados.length === 0) return true;
  if (c.servicios.reloj.ahora() >= d.enviadoEn + esperaMaxima(d)) return true;
  return esperados.every((pid) => (d.reproduccion.get(pid) ?? -1) >= d.objetivoTick);
}

/** Recalcula la velocidad efectiva (la mínima de los humanos a los que se espera) y la anuncia si cambia. */
function actualizarVelocidad(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso, forzar = false): void {
  const d = p.dosD!;
  const esperados = aEsperar(c, p);
  const velocidades = esperados.map((pid) => d.velocidades.get(pid) ?? VELOCIDAD_INICIAL);
  const efectiva = (velocidades.length ? Math.min(...velocidades) : Math.max(...d.velocidades.values(), VELOCIDAD_INICIAL)) as Velocidad2D;
  if (efectiva === d.velocidadEfectiva && !forzar) return;
  d.velocidadEfectiva = efectiva;
  emitirAParticipantes(c, ctx, p.fila, { t: 'partido.velocidad', partidoId: p.fila.id, velocidadEfectiva: efectiva });
}

/** Simula tramos mientras no haya que esperar a nadie; termina el partido al llegar al final. */
export async function avanzar2D(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso): Promise<void> {
  const d = p.dosD!;
  if (d.tramos.length === 0) actualizarVelocidad(c, ctx, p, true);
  for (;;) {
    cancelarEspera2D(c, p);
    const r = avanzar(p.motor, 'interrupcion', { fotogramas: true });
    const tramo = await registrarTramo(c, ctx, p, r);
    // Para reconectar basta con los fotogramas del último tramo. Se copia en lugar de modificarlo: el
    // actor envía los mensajes al terminar el comando y el anterior puede estar aún por enviar.
    const anterior = d.tramos.at(-1);
    if (anterior) {
      const { fotogramas: _fotogramas, ...sinFotogramas } = anterior;
      d.tramos[d.tramos.length - 1] = sinFotogramas;
    }
    d.tramos.push(tramo);
    d.desdeTick = r.desdeTick;
    d.objetivoTick = r.hastaTick;
    d.enviadoEn = c.servicios.reloj.ahora();

    if (r.fase === 'finalizado') {
      await terminarPartido(c, ctx, p);
      return;
    }
    // Los NPC deciden en el descanso y antes de la prórroga; se aplica al reanudar, como lo del humano.
    if (r.fase === 'descanso' || r.fase === 'pre_prorroga') decidirNPCEnPausa(p.motor, nivelesDe(c, p.fila), p.fila.semilla);
    if (!puedeAvanzar(c, p)) {
      programarEspera(c, p);
      return;
    }
  }
}

/**
 * Programa la próxima comprobación: cuando un humano desconectado cumpla 10 s o cuando venza la espera
 * máxima del tramo, lo que llegue antes.
 */
function programarEspera(c: ControladorPartida, p: PartidoEnCurso): void {
  const d = p.dosD!;
  let vence = d.enviadoEn + esperaMaxima(d);
  for (const pid of aEsperar(c, p)) {
    const desde = c.desconectados.get(pid);
    if (desde !== undefined) vence = Math.min(vence, desde + ESPERA_DESCONECTADO_MS);
  }
  c.servicios.temporizadores.programar(clave(c, p), vence, () => {
    void c
      .ejecutar((ctx) => reevaluar2D(c, ctx, p))
      .catch((err: unknown) => c.servicios.logger.error({ err, partidaId: c.id }, 'Error al avanzar el partido 2D'));
  });
}

export function cancelarEspera2D(c: ControladorPartida, p: PartidoEnCurso): void {
  c.servicios.temporizadores.cancelar(clave(c, p));
}

/** Vuelve a mirar si se puede seguir (reproducción nueva, cambio de conexión o temporizador). */
export async function reevaluar2D(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso): Promise<void> {
  if (!p.dosD || p.fila.estado === 'finalizado' || c.partidosEnCurso.get(p.fila.id) !== p) return;
  actualizarVelocidad(c, ctx, p);
  if (puedeAvanzar(c, p)) await avanzar2D(c, ctx, p);
  else programarEspera(c, p);
}

/** Partidos 2D en juego de un participante (para reevaluarlos cuando se conecta o desconecta). */
export function partidos2DDe(c: ControladorPartida, participanteId: string): PartidoEnCurso[] {
  return [...c.partidosEnCurso.values()].filter(
    (p) => p.dosD && p.fila.estado !== 'finalizado' && (p.fila.localId === participanteId || p.fila.visitanteId === participanteId),
  );
}

type Resultado = { ok: true } | { ok: false; error: { codigo: string; mensaje: string } };

function partido2DDe(c: ControladorPartida, participanteId: string, partidoId: string): PartidoEnCurso | null {
  const p = c.partidosEnCurso.get(partidoId);
  if (!p?.dosD || (p.fila.localId !== participanteId && p.fila.visitanteId !== participanteId)) return null;
  return p;
}

/** `partido.reproduccion`: el cliente informa del tick que está mostrando. */
export async function procesarReproduccion(c: ControladorPartida, ctx: ContextoComando, participanteId: string, partidoId: string, tick: number): Promise<Resultado> {
  const p = partido2DDe(c, participanteId, partidoId);
  if (!p) return { ok: false, error: { codigo: 'PARTIDO_NO_ENCONTRADO', mensaje: 'No juegas ese partido en 2D' } };
  const d = p.dosD!;
  // El reloj de reproducción no retrocede (p. ej. tras recargar la página) ni va más allá de lo enviado.
  d.reproduccion.set(participanteId, Math.max(d.reproduccion.get(participanteId) ?? -1, Math.min(tick, d.objetivoTick)));
  await reevaluar2D(c, ctx, p);
  return { ok: true };
}

/** `partido.velocidad`: el participante elige x2 … x32. */
export function procesarVelocidad(c: ControladorPartida, ctx: ContextoComando, participanteId: string, partidoId: string, velocidad: Velocidad2D): Resultado {
  const p = partido2DDe(c, participanteId, partidoId);
  if (!p) return { ok: false, error: { codigo: 'PARTIDO_NO_ENCONTRADO', mensaje: 'No juegas ese partido en 2D' } };
  p.dosD!.velocidades.set(participanteId, velocidad);
  actualizarVelocidad(c, ctx, p);
  return { ok: true };
}

/** Parte 2D de la vista del partido (mensaje `estado` al conectar o reconectar). */
export function vista2D(p: PartidoEnCurso, participanteId: string) {
  const d = p.dosD!;
  return {
    velocidadEfectiva: d.velocidadEfectiva,
    miVelocidad: d.velocidades.get(participanteId) ?? VELOCIDAD_INICIAL,
    objetivoTick: d.objetivoTick,
    tramos: d.tramos,
  };
}
