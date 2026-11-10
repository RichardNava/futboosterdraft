/**
 * «Mis partidas» (FR-017; contracts/http-api.md): las partidas del usuario, en curso y terminadas, con la
 * acción que tiene pendiente en cada una.
 */
import type { ConsultaMisPartidas, MisPartidas, PartidaResumen } from '@fbd/protocol';
import type { GestorPartidas } from './gestor';
import type { ControladorPartida } from './partida';
import { vistaTorneo } from './torneo';

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

/**
 * Spec 013 (FR-024, FR-025; research R9): las en curso solo en la primera página (son pocas) y las terminadas con una
 * consulta paginada, sin reconstruir el controlador de cada una.
 */
export async function misPartidas(
  gestor: GestorPartidas,
  usuarioId: string,
  { antes, limite }: ConsultaMisPartidas,
): Promise<MisPartidas> {
  const repo = gestor.servicios.repoPartidas;
  const enCurso: PartidaResumen[] = [];
  if (!antes) {
    for (const { partida, participanteId } of await repo.enCursoDeUsuario(usuarioId)) {
      const c = await gestor.obtener(partida.id);
      const participante = c?.participante(participanteId);
      if (!c || !participante) continue;
      enCurso.push({
        id: partida.id,
        modo: partida.modo,
        fase: partida.estado,
        nombreEquipo: c.nombreDe(participante),
        actualizadaEn: partida.actualizadaEn.toISOString(),
        ...(await c.ejecutar(() => accionYRival(c, participanteId))),
      });
    }
  }
  const [actualizadaEn, id] = antes ? (antes.split('|') as [string, string]) : [];
  const { filas, hayMas } = await repo.terminadasDeUsuario(usuarioId, limite, antes ? { actualizadaEn: actualizadaEn!, id: id! } : undefined);
  const terminadas: PartidaResumen[] = filas.map((f) => ({
    id: f.id,
    modo: f.modo,
    // Quien abandonó la ve como abandonada aunque la sigan jugando otros: no hay «Continuar».
    fase: f.abandonada ? 'abandonada' : f.estado,
    nombreEquipo: f.nombreEquipo,
    actualizadaEn: f.clave,
  }));
  const ultima = filas.at(-1);
  return { enCurso, terminadas, siguiente: hayMas && ultima ? `${ultima.clave}|${ultima.id}` : null };
}
