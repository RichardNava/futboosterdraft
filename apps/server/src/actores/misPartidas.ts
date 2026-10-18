/**
 * «Mis partidas» (FR-017; contracts/http-api.md): las partidas del usuario, en curso y terminadas, con la
 * acción que tiene pendiente en cada una.
 */
import type { PartidaResumen } from '@fbd/protocol';
import type { GestorPartidas } from './gestor';
import type { ControladorPartida } from './partida';
import { vistaTorneo } from './torneo';

const EN_CURSO = new Set(['buscando', 'en_draft', 'en_torneo']);

async function accionYRival(c: ControladorPartida, participanteId: string): Promise<Pick<PartidaResumen, 'accionPendiente' | 'rival' | 'jornadaActual'>> {
  if (c.partida.estado === 'en_draft') {
    const m = c.mesaDe(participanteId);
    const eligio = m?.mesa.elecciones.some((e) => e.participanteId === participanteId && e.ronda === m.mesa.ronda && e.turno === m.mesa.turno);
    return m && m.mesa.estado === 'en_turno' && !eligio ? { accionPendiente: 'elegir' } : {};
  }
  if (c.partida.estado !== 'en_torneo') return {};
  const t = await vistaTorneo(c, participanteId);
  const jornada = t.jornadas.find((j) => j.numero === t.jornadaActual);
  const mio = jornada?.partidos.find((p) => p.local?.id === participanteId || p.visitante?.id === participanteId);
  const rivalRef = mio ? (mio.local?.id === participanteId ? mio.visitante : mio.local) : null;
  const base = { ...(t.jornadaActual !== null ? { jornadaActual: t.jornadaActual } : {}), ...(rivalRef ? { rival: rivalRef.nombre } : {}) };
  if (t.pendientesDeVer.length > 0) return { ...base, accionPendiente: 'ver' };
  if (jornada?.estado === 'abierta' && mio && mio.estado !== 'finalizado' && mio.estado !== 'pendiente_de_ver') return { ...base, accionPendiente: 'jugar' };
  if (t.siguienteJornada === 'manual' && jornada?.estado === 'cerrada' && !t.campeon) return { ...base, accionPendiente: 'siguiente_jornada' };
  return base;
}

export async function misPartidas(gestor: GestorPartidas, usuarioId: string): Promise<{ enCurso: PartidaResumen[]; terminadas: PartidaResumen[] }> {
  const filas = await gestor.servicios.repoPartidas.partidasDeUsuario(usuarioId);
  const enCurso: PartidaResumen[] = [];
  const terminadas: PartidaResumen[] = [];
  for (const { partida, participanteId } of filas) {
    const c = await gestor.obtener(partida.id);
    const participante = c?.participante(participanteId);
    const resumen: PartidaResumen = {
      id: partida.id,
      modo: partida.modo,
      fase: partida.estado,
      nombreEquipo: c && participante ? c.nombreDe(participante) : '',
      actualizadaEn: partida.actualizadaEn.toISOString(),
    };
    if (c && EN_CURSO.has(partida.estado)) {
      Object.assign(resumen, await c.ejecutar(() => accionYRival(c, participanteId)));
      enCurso.push(resumen);
    } else terminadas.push(resumen);
  }
  return { enCurso, terminadas };
}
