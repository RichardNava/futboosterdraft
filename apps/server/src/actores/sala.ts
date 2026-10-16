/**
 * Sala de una partida (T049; FR-000 a FR-005, FR-059).
 */
import {
  derivarSemilla,
  MINUTOS_ABANDONO_INVITADO,
  rellenarConNPC,
  sortearAsientos,
  transicion,
  type NivelNPC,
} from '@fbd/domain';
import { errores } from '../http/errores';
import type { ContextoComando } from './actor';
import { iniciarDraft } from './draft';
import { nombresNPC } from './nombres';
import type { ControladorPartida } from './partida';

export function resumenSala(c: ControladorPartida) {
  return {
    participantes: c.participantes.map((p) => ({
      id: p.id,
      nombre: c.nombreDe(p),
      tipo: p.tipo as 'humano' | 'npc',
      nivelNPC: (p.nivelNPC as NivelNPC | null) ?? null,
      conectado: p.tipo === 'npc' || c.servicios.difusor.estaConectado(c.id, p.id),
      esAnfitrion: p.usuarioId === c.partida.anfitrionId,
    })),
    plazasLibres: c.partida.numParticipantes - c.participantes.length,
    venceBusquedaEn:
      c.partida.estado === 'buscando'
        ? new Date(c.partida.creadaEn.getTime() + (c.partida.tiempos as { busquedaS: number }).busquedaS * 1000).toISOString()
        : null,
  };
}

function emitirSala(c: ControladorPartida, ctx: ContextoComando): void {
  ctx.emitirATodos({ t: 'sala.actualizada', ...resumenSala(c) });
}

/** Programa el temporizador de búsqueda (FR-003): al vencer, se rellenan las plazas y empieza el draft. */
export function programarBusqueda(c: ControladorPartida): void {
  if (c.partida.estado !== 'buscando') return;
  const venceEn = c.partida.creadaEn.getTime() + (c.partida.tiempos as { busquedaS: number }).busquedaS * 1000;
  c.servicios.temporizadores.programar(c.clave('busqueda'), venceEn, () => {
    void c
      .ejecutar(async (ctx) => {
        if (c.partida.estado === 'buscando') await iniciar(c, ctx);
      })
      .catch((err: unknown) => c.servicios.logger.error({ err, partidaId: c.id }, 'Error al vencer la búsqueda'));
  });
}

export async function unirse(c: ControladorPartida, ctx: ContextoComando, usuarioId: string): Promise<string> {
  const existente = c.participanteDeUsuario(usuarioId);
  if (existente) return existente.id;
  if (c.partida.estado !== 'buscando') throw errores.conflicto('PARTIDA_INICIADA', 'La partida ya ha empezado');
  const humanos = c.humanos().length;
  if (c.participantes.length >= c.partida.numParticipantes || humanos >= c.partida.plazasHumanas) {
    throw errores.conflicto('PARTIDA_COMPLETA', 'No quedan plazas libres');
  }
  const apodo = c.apodos.get(usuarioId) ?? (await c.servicios.repoPartidas.apodos([usuarioId])).get(usuarioId) ?? 'Jugador';
  c.apodos.set(usuarioId, apodo);
  const fila = await c.servicios.repoPartidas.anadirHumano(c.id, usuarioId, apodo);
  c.participantes.push(fila);
  emitirSala(c, ctx);
  return fila.id;
}

export async function anadirNPC(c: ControladorPartida, ctx: ContextoComando, usuarioId: string, nivel: NivelNPC): Promise<string> {
  if (!c.esAnfitrion(usuarioId)) throw errores.prohibido('SOLO_ANFITRION', 'Solo el anfitrión puede añadir NPC');
  if (c.partida.estado !== 'buscando') throw errores.conflicto('PARTIDA_INICIADA', 'La partida ya ha empezado');
  if (c.participantes.length >= c.partida.numParticipantes) {
    throw errores.conflicto('PARTIDA_COMPLETA', 'No quedan plazas libres');
  }
  const usados = new Set(c.participantes.map((p) => p.nombreEquipo));
  const [nombre] = nombresNPC(1, derivarSemilla(c.partida.semilla, `npc:${c.participantes.length}`), usados);
  const fila = await c.servicios.repoPartidas.anadirNPC(c.id, nivel, nombre!);
  c.participantes.push(fila);
  emitirSala(c, ctx);
  return fila.id;
}

/** Rellena las plazas libres con NPC aleatorios (amateur, intermedio o avanzado). */
async function rellenarPlazas(c: ControladorPartida): Promise<void> {
  const libres = c.partida.numParticipantes - c.participantes.length;
  if (libres <= 0) return;
  const niveles = rellenarConNPC(libres, derivarSemilla(c.partida.semilla, `relleno:${c.participantes.length}`));
  const usados = new Set(c.participantes.map((p) => p.nombreEquipo));
  const nombres = nombresNPC(libres, derivarSemilla(c.partida.semilla, `nombres:${c.participantes.length}`), usados);
  for (const [i, nivel] of niveles.entries()) {
    c.participantes.push(await c.servicios.repoPartidas.anadirNPC(c.id, nivel, nombres[i]!));
  }
}

/** Empieza el draft: rellena plazas, sortea asientos (FR-005) y crea las mesas. */
export async function iniciar(c: ControladorPartida, ctx: ContextoComando, usuarioId?: string): Promise<void> {
  if (usuarioId !== undefined && !c.esAnfitrion(usuarioId)) {
    throw errores.prohibido('SOLO_ANFITRION', 'Solo el anfitrión puede iniciar la partida');
  }
  if (c.partida.estado !== 'buscando') throw errores.conflicto('PARTIDA_INICIADA', 'La partida ya ha empezado');
  c.servicios.temporizadores.cancelar(c.clave('busqueda'));
  await rellenarPlazas(c);

  const ordenados = [...c.participantes].sort((a, b) => a.id.localeCompare(b.id)).map((p) => p.id);
  const sorteados = sortearAsientos(ordenados, derivarSemilla(c.partida.semilla, 'asientos'));
  // Playoff de 16: dos drafts separados de 8 (FR-052).
  const asientos = c.partida.numParticipantes === 16 ? [sorteados.slice(0, 8), sorteados.slice(8)] : [sorteados];
  emitirSala(c, ctx);
  await iniciarDraft(c, ctx, asientos);
  const { emitirEstadoATodos } = await import('./vistas');
  await emitirEstadoATodos(c, ctx);
}

/** Pasa la partida a "abandonada" (partida de invitado). */
export async function abandonarPartidaInvitado(c: ControladorPartida, ctx: ContextoComando): Promise<void> {
  if (!['buscando', 'en_draft', 'en_torneo'].includes(c.partida.estado)) return;
  await c.servicios.repoPartidas.actualizarEstado(c.id, 'abandonada');
  c.partida = { ...c.partida, estado: transicion(c.partida.estado as 'en_draft', 'abandonar_invitado') };
  c.cancelarTemporizadores();
  ctx.emitirATodos({ t: 'error', codigo: 'PARTIDA_ABANDONADA', mensaje: 'La partida se ha abandonado' });
}

/**
 * Seguimiento de la conexión del invitado: tras 10 minutos seguidos sin conexión, su partida se
 * abandona; si vuelve antes, continúa donde lo dejó.
 */
export function alCambiarConexion(
  c: ControladorPartida,
  participanteId: string,
  conectado: boolean,
  alAbandonar: () => void,
): void {
  const p = c.participante(participanteId);
  if (!p || p.tipo !== 'humano') return;
  const clave = c.clave(`abandono:${participanteId}`);
  if (conectado) {
    c.desconectados.delete(participanteId);
    c.servicios.temporizadores.cancelar(clave);
    return;
  }
  const ahora = c.servicios.reloj.ahora();
  c.desconectados.set(participanteId, ahora);
  if (!c.anfitrionEsInvitado || p.usuarioId !== c.partida.anfitrionId) return;
  c.servicios.temporizadores.programar(clave, ahora + MINUTOS_ABANDONO_INVITADO * 60_000, () => {
    void c
      .ejecutar(async (ctx) => {
        if (c.desconectados.has(participanteId)) await abandonarPartidaInvitado(c, ctx);
      })
      .then(alAbandonar)
      .catch((err: unknown) => c.servicios.logger.error({ err, partidaId: c.id }, 'Error al abandonar la partida'));
  });
}
