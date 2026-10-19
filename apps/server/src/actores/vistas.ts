/**
 * Instantánea visible para cada participante (mensaje `estado`). Se envía al conectar, al reconectar
 * y en cada cambio de fase (contracts/realtime-protocol.md). Solo incluye lo que ese participante
 * puede ver (FR-054a).
 */
import { soloUnHumano } from '@fbd/domain';
import type { ContextoComando } from './actor';
import { vistaDraft } from './draft';
import { detalleBajas } from './equipo';
import type { ControladorPartida } from './partida';
import { vistaPartido } from './partidoRapido';
import { modalidadPreferida } from './preparacion';
import { resumenSala } from './sala';

export function resumenPartida(c: ControladorPartida, usuarioId: string | undefined) {
  const p = c.partida;
  return {
    id: p.id,
    anfitrionId: p.anfitrionId,
    modo: p.modo,
    numParticipantes: p.numParticipantes,
    conPlazos: !soloUnHumano(c.participantes),
    plazoJornadaHoras: p.plazoJornadaHoras,
    dificultad: p.dificultad,
    estado: p.estado,
    participantes: resumenSala(c).participantes,
    miParticipanteId: (usuarioId && c.participanteDeUsuario(usuarioId)?.id) ?? null,
  };
}

export async function plantillasVisibles(c: ControladorPartida) {
  const { repoDraft, catalogo } = c.servicios;
  const porParticipante = await repoDraft.plantillas(c.participantes.map((p) => p.id));
  return c.participantes.map((p) => ({
    participanteId: p.id,
    nombre: c.nombreDe(p),
    tipo: p.tipo,
    nivelNPC: p.nivelNPC,
    jugadores: (porParticipante.get(p.id) ?? []).map((id) => catalogo.resumen(id)),
    bajas: detalleBajas(c, p.id),
  }));
}

/** Fase y vista para un participante. Debe llamarse dentro de un comando del actor. */
export async function vistaEstado(c: ControladorPartida, participanteId: string): Promise<{ fase: string; vista: unknown }> {
  const usuarioId = c.participante(participanteId)?.usuarioId ?? undefined;
  const partida = resumenPartida(c, usuarioId);
  if (c.partida.estado === 'buscando') return { fase: 'sala', vista: { partida, sala: resumenSala(c) } };
  if (c.partida.estado === 'en_draft') return { fase: 'draft', vista: { partida, draft: vistaDraft(c, participanteId) } };
  return {
    fase: 'torneo',
    vista: { partida, plantillas: await plantillasVisibles(c), preparacion: await vistaPreparacion(c, participanteId), partido: vistaPartido(c, participanteId) },
  };
}

/**
 * Partido que el participante tiene por jugar en la jornada abierta (con su rival y, si hay varios humanos,
 * el plazo), si aún no ha empezado.
 */
async function vistaPreparacion(c: ControladorPartida, participanteId: string) {
  if (!c.jornada) return null;
  const venceEn = c.jornada.venceEn === null ? null : new Date(c.jornada.venceEn).toISOString();
  const cruce = c.jornada.cruces.find((x) => x.local === participanteId || x.visitante === participanteId);
  if (!cruce) return { jornada: c.jornada.numero, venceEn, partidoId: null, rival: null };
  const fila = await c.servicios.repoPartidos.obtener(cruce.partidoId);
  if (fila?.estado !== 'programado') return null;
  const rivalId = cruce.local === participanteId ? cruce.visitante : cruce.local;
  const rival = c.participante(rivalId);
  return {
    jornada: c.jornada.numero,
    venceEn,
    partidoId: cruce.partidoId,
    rival: { id: rivalId, nombre: rival ? c.nombreDe(rival) : rivalId, bajas: [...(c.bajasActivas?.(rivalId) ?? [])], humano: rival?.tipo === 'humano' && !rival.controladoPorNPC },
    modalidadPreferida: await modalidadPreferida(c, participanteId),
  };
}

/** Envía a cada humano su nueva instantánea tras un cambio de fase. */
export async function emitirEstadoATodos(c: ControladorPartida, ctx: ContextoComando): Promise<void> {
  const serverTime = new Date(c.servicios.reloj.ahora()).toISOString();
  for (const p of c.humanos()) {
    const { fase, vista } = await vistaEstado(c, p.id);
    ctx.emitirA(p.id, { t: 'estado', serverTime, fase, vista });
  }
}
