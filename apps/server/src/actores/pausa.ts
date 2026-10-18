/**
 * Pausa de una partida de un solo humano al salir desde la barra (FR-021; research R10; data-model §6.2).
 *
 * - `partida.pausar` detiene el turno del draft (guarda `restanteMs` y `pausadaEn`) o la ventana de decisión
 *   del descanso de su partido en directo, y responde `partida.pausada { pausada: true }`.
 * - Con varios humanos no tiene efecto (`pausada: false`): el torneo sigue con sus plazos.
 * - Al volver a conectar se reanuda con el tiempo que quedaba (`venceEn = ahora + restanteMs`).
 * - Cerrar la pestaña sin `partida.pausar` no pausa nada (reglas de la spec 001).
 */
import type { ContextoComando } from './actor';
import { mensajeTurno, programarTurno } from './draft';
import type { ControladorPartida } from './partida';
import { emitirPausa, programarVentana } from './partidoRapido';

type Resultado = { ok: true } | { ok: false; error: { codigo: string; mensaje: string } };

/** ¿Es el único humano activo de la partida? */
export function esUnicoHumano(c: ControladorPartida, participanteId: string): boolean {
  const humanos = c.participantes.filter((p) => p.tipo === 'humano' && !p.controladoPorNPC);
  return humanos.length === 1 && humanos[0]!.id === participanteId;
}

export async function procesarPausar(c: ControladorPartida, ctx: ContextoComando, participanteId: string): Promise<Resultado> {
  if (!c.participante(participanteId)) return { ok: false, error: { codigo: 'NO_PARTICIPA', mensaje: 'No participas en esta partida' } };
  if (!esUnicoHumano(c, participanteId)) {
    ctx.emitirA(participanteId, { t: 'partida.pausada', pausada: false });
    return { ok: true };
  }
  const { reloj, temporizadores, repoDraft } = c.servicios;
  const ahora = reloj.ahora();
  let pausada = false;

  const m = c.partida.estado === 'en_draft' ? c.mesaDe(participanteId) : undefined;
  if (m && m.mesa.estado === 'en_turno') {
    if (!m.pausa) {
      temporizadores.cancelar(c.clave(`turno:${m.indice}`));
      const restanteMs = Math.max(0, m.mesa.venceEn - ahora);
      m.pausa = { pausadaEn: ahora, restanteMs };
      await repoDraft.pausar(m.id, ahora, restanteMs);
    }
    pausada = true;
  }

  for (const p of c.partidosEnCurso.values()) {
    if (!p.pausa || (p.fila.localId !== participanteId && p.fila.visitanteId !== participanteId)) continue;
    if (p.pausa.restanteMs === undefined) {
      temporizadores.cancelar(c.clave(`pausa:${p.fila.id}`));
      p.pausa = { ...p.pausa, restanteMs: Math.max(0, p.pausa.venceEn - ahora) };
    }
    pausada = true;
  }

  ctx.emitirA(participanteId, { t: 'partida.pausada', pausada });
  return { ok: true };
}

/** Al volver a conectar, lo que estaba pausado sigue con el tiempo que le quedaba. */
export async function reanudarAlConectar(c: ControladorPartida, ctx: ContextoComando, participanteId: string): Promise<void> {
  const { reloj, repoDraft } = c.servicios;
  const ahora = reloj.ahora();
  let reanudada = false;

  for (const m of c.mesas) {
    if (!m.pausa || !m.mesa.participantes.includes(participanteId)) continue;
    const venceEn = ahora + m.pausa.restanteMs;
    m.mesa = { ...m.mesa, venceEn };
    m.pausa = null;
    await repoDraft.reanudar(m.id, venceEn);
    if (m.mesa.estado === 'en_turno') {
      programarTurno(c, m.indice);
      ctx.emitirA(participanteId, mensajeTurno(c, m.indice, m.mesa, participanteId));
    }
    reanudada = true;
  }

  for (const p of c.partidosEnCurso.values()) {
    if (p.pausa?.restanteMs === undefined || (p.fila.localId !== participanteId && p.fila.visitanteId !== participanteId)) continue;
    const { restanteMs, ...resto } = p.pausa;
    p.pausa = { ...resto, venceEn: ahora + restanteMs };
    programarVentana(c, p);
    emitirPausa(c, ctx, p);
    reanudada = true;
  }

  if (reanudada) ctx.emitirA(participanteId, { t: 'partida.pausada', pausada: false });
}
