/**
 * Ruta de resumen de un partido (T096): marcador, eventos relevantes y estadísticas. Las alineaciones
 * solo se devuelven si el partido ya empezó (FR-054a).
 */
import type { EventoPartido } from '@fbd/engine';
import type { FastifyInstance } from 'fastify';
import type { GestorPartidas } from '../actores/gestor';
import { equipacionesDelPartido, resumenAlineaciones } from '../actores/partidoRapido';
import type { Auth } from '../auth/auth';
import { crearHooksSesion } from '../auth/rutas';
import { errores } from './errores';

export function registrarRutasPartidos(app: FastifyInstance, auth: Auth, gestor: GestorPartidas): void {
  const { requiereSesion } = crearHooksSesion(auth);

  app.get<{ Params: { id: string } }>('/api/partidos/:id', { preHandler: requiereSesion }, async (req) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw errores.noEncontrado('PARTIDO_NO_ENCONTRADO', 'No existe ese partido');
    const fila = await gestor.servicios.repoPartidos.obtener(req.params.id);
    if (!fila) throw errores.noEncontrado('PARTIDO_NO_ENCONTRADO', 'No existe ese partido');
    const c = await gestor.obtenerOError(fila.partidaId);
    if (!c.participanteDeUsuario(req.usuario!.id)) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    const empezado = fila.estado !== 'programado';
    const nombre = (pid: string) => (c.participante(pid) ? c.nombreDe(c.participante(pid)!) : pid);
    const enCurso = c.partidosEnCurso.get(fila.id);
    // Terminado (ya no está en memoria): las alineaciones iniciales salen de la entrada guardada.
    const entrada = fila.entrada as Parameters<typeof resumenAlineaciones>[1] | null;
    const alineaciones = enCurso?.inicio.alineaciones ?? (entrada ? resumenAlineaciones(c, entrada) : null);
    const dorsales =
      enCurso?.inicio.dorsales ??
      (empezado
        ? { ...(await gestor.servicios.repoEquipo.dorsales(fila.localId)), ...(await gestor.servicios.repoEquipo.dorsales(fila.visitanteId)) }
        : null);
    return {
      id: fila.id,
      jornada: fila.jornadaNumero,
      estado: fila.estado,
      eliminatoria: fila.eliminatoria,
      local: { id: fila.localId, nombre: nombre(fila.localId) },
      visitante: { id: fila.visitanteId, nombre: nombre(fila.visitanteId) },
      marcador: fila.marcador,
      eventos: ((fila.eventos as EventoPartido[]) ?? []).filter((e) => e.relevante),
      estadisticas: fila.estadisticas,
      resueltoAutomaticamente: fila.resueltoAutomaticamente,
      ...(empezado ? { alineaciones, dorsales, equipaciones: equipacionesDelPartido(c, fila.localId, fila.visitanteId), modalidad: c.partida.tipoSimulacion } : {}),
    };
  });
}
