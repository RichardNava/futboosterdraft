/**
 * Partido en 2D en directo contra un NPC (research R6; FR-021, FR-022, FR-025a, FR-030).
 *
 * - La velocidad es solo del cliente. El cliente informa por dónde va (`partido.reproduccion`, cada
 *   ~250 ms) y el servidor mantiene simulados `reproduccion.anticipacionTicks` (60) ticks de juego por
 *   delante de ese punto, y nunca más: simula por trozos acotados con `avanzar('ticks', { hastaTick })`.
 * - Cada trozo se guarda antes de anunciarse con `partido.tramo` (igual que la rápida), con sus fotogramas
 *   v2 y sus acciones. Los tramos enviados no se rehacen nunca (`provisional: false`).
 * - Paradas duras: el descanso y el final del tiempo reglamentario de una eliminatoria nunca se adelantan;
 *   se espera a «Seguir» o a que venza la ventana (`descansoS`), como en la rápida.
 * - Las decisiones se aplican en la primera interrupción aún no simulada; llega
 *   `partido.decision_aplicada` con el tick y el minuto.
 * - Sin informes de reproducción el búfer no crece: el partido queda en pausa sin coste. Al volver, la
 *   vista `estado` trae los tramos simulados y el último tick informado.
 */
import { avanzar } from '@fbd/engine';
import type { Velocidad2D } from '@fbd/protocol';
import type { ContextoComando } from './actor';
import type { ControladorPartida } from './partida';
import { abrirPausa, registrarTramo, terminarPartido, type PartidoEnCurso } from './partidoRapido';

type Tramo2D = Record<string, unknown> & { t: string; hastaTick: number };

export interface Estado2D {
  /** Último tick de juego que ha mostrado el cliente (nunca retrocede). */
  ultimoTickInformado: number;
  /** Velocidad a la que reproduce el cliente (solo informativa: no cambia nada en el servidor). */
  velocidad: Velocidad2D;
  /** Tramos ya enviados, para la reconexión. Solo conservan los fotogramas los que el cliente aún no ha visto. */
  tramos: Tramo2D[];
}

export function crearEstado2D(): Estado2D {
  return { ultimoTickInformado: 0, velocidad: 2, tramos: [] };
}

/** Quita los fotogramas de los tramos que el cliente ya ha visto entero (no hacen falta para seguir). */
function olvidarVistos(d: Estado2D): void {
  for (let i = 0; i < d.tramos.length; i++) {
    const tramo = d.tramos[i]!;
    if (tramo.hastaTick >= d.ultimoTickInformado || !('fotogramas' in tramo)) continue;
    // Se copia en lugar de modificarlo: el actor envía los mensajes al terminar el comando.
    const { fotogramas: _fotogramas, ...sinFotogramas } = tramo;
    d.tramos[i] = sinFotogramas as Tramo2D;
  }
}

/**
 * Simula hasta tener `anticipacionTicks` por delante del último tick informado, sin pasar del descanso ni
 * del final del tiempo reglamentario. Termina el partido al llegar al final.
 */
export async function avanzar2D(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso): Promise<void> {
  const d = p.dosD!;
  const anticipacion = p.motor.parametros.reproduccion.anticipacionTicks;
  while (p.fila.estado !== 'finalizado' && !p.pausa && c.partidosEnCurso.get(p.fila.id) === p) {
    const hasta = d.ultimoTickInformado + anticipacion;
    if (p.motor.tick >= hasta) return;
    const r = avanzar(p.motor, 'ticks', { hastaTick: hasta, fotogramas: true });
    const tramo = await registrarTramo(c, ctx, p, r);
    d.tramos.push(tramo as Tramo2D);
    if (r.fase === 'finalizado') {
      await terminarPartido(c, ctx, p);
      return;
    }
    if (r.fase === 'descanso' || r.fase === 'pre_prorroga') {
      abrirPausa(c, ctx, p, r.fase === 'descanso' ? 'descanso' : 'pre_prorroga');
      return;
    }
  }
}

type Resultado = { ok: true } | { ok: false; error: { codigo: string; mensaje: string } };

/** `partido.reproduccion`: el cliente informa del tick que está mostrando y de su velocidad. */
export async function procesarReproduccion(
  c: ControladorPartida,
  ctx: ContextoComando,
  participanteId: string,
  partidoId: string,
  tick: number,
  velocidad: Velocidad2D,
): Promise<Resultado> {
  const p = c.partidosEnCurso.get(partidoId);
  // Solo en un partido 2D en directo contra un NPC (el único que tiene búfer de anticipación).
  if (!p?.dosD || (p.fila.localId !== participanteId && p.fila.visitanteId !== participanteId)) {
    return { ok: false, error: { codigo: 'PARTIDO_NO_ENCONTRADO', mensaje: 'No estás viendo ese partido en directo' } };
  }
  const d = p.dosD;
  // El reloj de reproducción no retrocede (p. ej. tras recargar la página) ni va más allá de lo simulado.
  d.ultimoTickInformado = Math.max(d.ultimoTickInformado, Math.min(tick, p.motor.tick));
  d.velocidad = velocidad;
  olvidarVistos(d);
  await avanzar2D(c, ctx, p);
  return { ok: true };
}

/** Parte 2D de la vista del partido (mensaje `estado` al conectar o reconectar). */
export function vista2D(p: PartidoEnCurso) {
  const d = p.dosD!;
  return {
    tramos: d.tramos,
    ultimoTickInformado: d.ultimoTickInformado,
    ...(p.pausa ? { pausa: { motivo: p.pausa.motivo, venceEn: new Date(p.pausa.venceEn).toISOString() } } : {}),
  };
}
