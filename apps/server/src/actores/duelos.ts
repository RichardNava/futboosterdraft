/**
 * Cruces del modo Duelo de jugadores en el servidor (spec 005, T070; research R10; FR-064 a FR-069).
 *
 * - Cada cruce es un `partido` con `tipo = 'duelos'`. Se resuelve con `resolverCruce` (función pura del dominio) en
 *   cuanto los dos onces están fijados: un NPC siempre lo tiene; un humano, al confirmar su once (que queda bloqueado
 *   para todo el torneo), al abrir el cruce o al vencer el plazo de la ronda (con su alineación automática, que también
 *   se bloquea).
 * - Se guardan el detalle de los duelos, el marcador (duelos ganados) y la resolución. Los humanos del cruce no ven el
 *   resultado hasta que lo ven («Ver duelos»), con los visionados de la spec 002.
 * - No hay bajas ni amarillas: el resultado se registra en el torneo sin eventos de partido.
 */
import { decidirAlineacionDuelos } from '@fbd/ai';
import { parametrosActuales, parametrosPorVersion, registrarResultado, resolverCruce, type Jugador, type OnceDuelos, type ResultadoCruce } from '@fbd/domain';
import type { FilaPartido } from '../persistencia/repos/partidos';
import { alineacionVigente, bloquearOnceDuelos, configDuelos, plantillaDe } from './equipo';
import type { ControladorPartida } from './partida';

const humanoActivo = (c: ControladorPartida, pid: string) => {
  const p = c.participante(pid);
  return p?.tipo === 'humano' && !p.controladoPorNPC;
};

/** Once del participante para los duelos, o null si es un humano que aún no lo ha fijado (y no se fuerza). */
async function onceDe(c: ControladorPartida, participanteId: string, forzar: boolean): Promise<OnceDuelos | null> {
  const plantilla = await plantillaDe(c, participanteId);
  const porId = new Map<number, Jugador>(plantilla.map((j) => [j.id, j]));
  let alineacion;
  if (!humanoActivo(c, participanteId)) {
    alineacion = decidirAlineacionDuelos(plantilla, configDuelos(c).formacion, parametrosActuales());
  } else {
    const vigente = await alineacionVigente(c, participanteId);
    if (!vigente.bloqueada) {
      if (!forzar) return null;
      await bloquearOnceDuelos(c, participanteId, vigente.alineacion);
    }
    alineacion = vigente.alineacion;
  }
  return { participanteId, titulares: Object.fromEntries(alineacion.titulares.map((t) => [t.casillaId, porId.get(t.jugadorId)!])) };
}

/**
 * Resuelve los cruces de duelos de la ronda abierta que ya se pueden resolver. Con `forzar`, fija el once de los
 * humanos que aún no lo han confirmado; con `soloPartido`, solo ese cruce. Devuelve cuántos ha resuelto.
 */
export async function resolverCrucesDuelos(c: ControladorPartida, opciones: { forzar?: boolean; soloPartido?: string } = {}): Promise<number> {
  if (!c.jornada || !c.torneo) return 0;
  const { repoPartidos, repoVisionados, repoTorneo, reloj } = c.servicios;
  let resueltos = 0;
  for (const [indice, cruce] of c.jornada.cruces.entries()) {
    if (opciones.soloPartido && cruce.partidoId !== opciones.soloPartido) continue;
    const fila = await repoPartidos.obtener(cruce.partidoId);
    if (fila?.estado !== 'programado' || fila.tipo !== 'duelos') continue;
    const local = await onceDe(c, fila.localId, opciones.forzar ?? false);
    const visitante = await onceDe(c, fila.visitanteId, opciones.forzar ?? false);
    if (!local || !visitante) continue;
    const r = resolverCruce(local, visitante, configDuelos(c), fila.semilla, parametrosPorVersion(fila.versionParametros));
    const humanos = [fila.localId, fila.visitanteId].filter((pid) => humanoActivo(c, pid));
    const ahora = new Date(reloj.ahora());
    await repoPartidos.actualizar(fila.id, {
      duelos: r,
      marcador: { local: r.ganados.local, visitante: r.ganados.visitante },
      estado: 'finalizado',
      resolucion: humanos.length > 0 ? 'apertura' : 'npc',
      iniciadoEn: ahora,
      finalizadoEn: ahora,
    });
    await repoVisionados.crearPendientes(fila.id, humanos, reloj.ahora());
    // Con los mismos duelos ganados, el desempate (suma o sorteo) decide quién pasa: se registra como unos penaltis.
    const empate = r.ganados.local === r.ganados.visitante;
    const { torneo } = registrarResultado(c.torneo, {
      jornada: c.jornada.numero,
      indice,
      local: fila.localId,
      visitante: fila.visitanteId,
      golesLocal: r.ganados.local,
      golesVisitante: r.ganados.visitante,
      ...(empate ? { penaltis: { local: r.ganador === 'local' ? 1 : 0, visitante: r.ganador === 'visitante' ? 1 : 0 } } : {}),
      partidoId: fila.id,
      eventos: [],
    });
    c.torneo = torneo;
    await repoTorneo.guardar(c.id, torneo);
    resueltos++;
  }
  return resueltos;
}

/** Cartas de los 22 jugadores de un cruce (en la versión de catálogo de la partida), por id. */
export function cartasDelCruce(c: ControladorPartida, r: ResultadoCruce): Record<number, ReturnType<ControladorPartida['catalogo']['resumen']>> {
  const ids = r.duelos.flatMap((d) => [d.local.jugadorId, d.visitante.jugadorId]);
  return Object.fromEntries(ids.map((id) => [id, c.catalogo.resumen(id)]));
}

/** Vista de un cruce de duelos ya resuelto (`GET /api/partidos/:id` y `abrir`). */
export function vistaCruce(c: ControladorPartida, fila: FilaPartido) {
  const duelos = fila.duelos as ResultadoCruce | null;
  return { duelos, cartas: duelos ? cartasDelCruce(c, duelos) : {} };
}
