/**
 * Rutas de los partidos (T096; spec 002, contracts/http-api.md):
 * - resumen de un partido: marcador, eventos relevantes y estadísticas; las alineaciones solo si ya empezó
 *   (FR-054a), y nada del resultado si es un partido entre humanos que el usuario aún no ha visto (FR-030);
 * - «Comenzar partido» / «Ver partido» (`abrir`), la reproducción de un partido resuelto, y los visionados
 *   (`visto`, `revelar`).
 */
import type { EventoPartido } from '@fbd/engine';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { GestorPartidas } from '../actores/gestor';
import type { ControladorPartida } from '../actores/partida';
import { reproduccion } from '../actores/partidoEntreHumanos';
import { equipacionesDelPartido, resumenAlineaciones } from '../actores/partidoRapido';
import { vistaCruce } from '../actores/duelos';
import { abrirPartido, emitirTorneo } from '../actores/torneo';
import type { Auth } from '../auth/auth';
import { crearHooksSesion } from '../auth/rutas';
import { resueltoAutomaticamente, type FilaPartido } from '../persistencia/repos/partidos';
import { ConsultaReproduccion, CuerpoAbrir } from '@fbd/protocol';
import { errores } from './errores';

export function registrarRutasPartidos(app: FastifyInstance, auth: Auth, gestor: GestorPartidas): void {
  const { requiereSesion } = crearHooksSesion(auth);

  /** Partido de la petición y participante del usuario en él (404 si no lo juega). */
  async function partidoDelUsuario(req: FastifyRequest<{ Params: { id: string } }>, soloSusPartidos: boolean) {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw errores.noEncontrado('PARTIDO_NO_ENCONTRADO', 'No existe ese partido');
    const fila = await gestor.servicios.repoPartidos.obtener(req.params.id);
    if (!fila) throw errores.noEncontrado('PARTIDO_NO_ENCONTRADO', 'No existe ese partido');
    const c = await gestor.obtenerOError(fila.partidaId);
    const participante = c.participanteDeUsuario(req.usuario!.id);
    if (!participante) {
      if (soloSusPartidos) throw errores.noEncontrado('PARTIDO_NO_ENCONTRADO', 'No juegas ese partido');
      throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    }
    if (soloSusPartidos && fila.localId !== participante.id && fila.visitanteId !== participante.id) {
      throw errores.noEncontrado('PARTIDO_NO_ENCONTRADO', 'No juegas ese partido');
    }
    return { fila, c, participanteId: participante.id };
  }

  app.get<{ Params: { id: string } }>('/api/partidos/:id', { preHandler: requiereSesion }, async (req) => {
    const { fila, c, participanteId } = await partidoDelUsuario(req, false);
    const nombre = (pid: string) => (c.participante(pid) ? c.nombreDe(c.participante(pid)!) : pid);
    if ((await gestor.servicios.repoVisionados.estado(fila.id, participanteId)) === 'pendiente') {
      return {
        id: fila.id,
        estado: 'pendiente_de_ver',
        jornada: fila.jornadaNumero,
        local: { id: fila.localId, nombre: nombre(fila.localId) },
        visitante: { id: fila.visitanteId, nombre: nombre(fila.visitanteId) },
        tipo: fila.tipo,
        // El detalle de los duelos y el marcador no se revelan hasta verlos (spec 005, contracts/http-api.md).
        ...(fila.tipo === 'duelos' ? { duelos: null, marcador: null } : {}),
      };
    }
    return resumen(c, fila, participanteId);
  });

  app.post<{ Params: { id: string }; Body: unknown }>('/api/partidos/:id/abrir', { preHandler: requiereSesion }, async (req) => {
    // Sin cuerpo (clientes antiguos), la rápida; con cuerpo, una modalidad válida (spec 003, FR-032).
    const cuerpo = req.body === undefined || req.body === null ? { modalidad: 'rapida' as const } : CuerpoAbrir.safeParse(req.body).data;
    if (!cuerpo) throw errores.regla('MODALIDAD_INVALIDA', 'La modalidad debe ser «rapida» o «2d»');
    const { fila, c, participanteId } = await partidoDelUsuario(req, true);
    const r = await c.ejecutar((ctx) => abrirPartido(c, ctx, participanteId, fila.id, cuerpo.modalidad));
    if ('error' in r) {
      if (r.error === 'JORNADA_NO_ABIERTA') throw errores.conflicto(r.error, 'Ese partido no es de la jornada abierta');
      throw errores.noEncontrado(r.error, 'No juegas ese partido');
    }
    return r;
  });

  app.get<{ Params: { id: string }; Querystring: { modalidad?: string } }>('/api/partidos/:id/reproduccion', { preHandler: requiereSesion }, async (req) => {
    const consulta = ConsultaReproduccion.safeParse(req.query ?? {});
    if (!consulta.success) throw errores.regla('MODALIDAD_INVALIDA', 'La modalidad debe ser «rapida» o «2d»');
    const { fila, c, participanteId } = await partidoDelUsuario(req, true);
    // Los cruces de duelos no tienen reproducción: la animación sale de `abrir` (spec 005).
    if (fila.tipo === 'duelos') throw errores.conflicto('NO_APLICA', 'Un cruce de duelos no tiene reproducción');
    const modalidad = consulta.data.modalidad ?? ((fila.modalidades as Record<string, 'rapida' | '2d'> | null) ?? {})[participanteId] ?? 'rapida';
    return reproduccion(c, fila, modalidad, participanteId);
  });

  for (const [ruta, estado] of [
    ['visto', 'visto'],
    ['revelar', 'revelado'],
  ] as const) {
    app.post<{ Params: { id: string } }>(`/api/partidos/:id/${ruta}`, { preHandler: requiereSesion }, async (req) => {
      const { fila, c, participanteId } = await partidoDelUsuario(req, true);
      const cambiado = await gestor.servicios.repoVisionados.marcar(fila.id, participanteId, estado, gestor.servicios.reloj.ahora());
      // Ya puede ver el resultado: su vista del torneo cambia (solo la suya).
      if (cambiado) await c.ejecutar((ctx) => emitirTorneo(c, ctx, participanteId));
      return { ok: true };
    });
  }
}

async function resumen(c: ControladorPartida, fila: FilaPartido, participanteId: string) {
  if (fila.tipo === 'duelos') {
    const nombreDe = (pid: string) => (c.participante(pid) ? c.nombreDe(c.participante(pid)!) : pid);
    return {
      id: fila.id,
      tipo: 'duelos' as const,
      jornada: fila.jornadaNumero,
      estado: fila.estado,
      eliminatoria: fila.eliminatoria,
      local: { id: fila.localId, nombre: nombreDe(fila.localId) },
      visitante: { id: fila.visitanteId, nombre: nombreDe(fila.visitanteId) },
      marcador: fila.marcador,
      resolucion: fila.resolucion,
      ...vistaCruce(c, fila),
    };
  }
  const empezado = fila.estado !== 'programado';
  const nombre = (pid: string) => (c.participante(pid) ? c.nombreDe(c.participante(pid)!) : pid);
  const enCurso = c.partidosEnCurso.get(fila.id);
  // Terminado (ya no está en memoria): las alineaciones iniciales salen de la entrada guardada.
  const entrada = fila.entrada as Parameters<typeof resumenAlineaciones>[1] | null;
  const alineaciones = enCurso?.inicio.alineaciones ?? (entrada ? resumenAlineaciones(c, entrada) : null);
  const { repoEquipo } = c.servicios;
  const dorsales = enCurso?.inicio.dorsales ?? (empezado ? { ...(await repoEquipo.dorsales(fila.localId)), ...(await repoEquipo.dorsales(fila.visitanteId)) } : null);
  return {
    id: fila.id,
    tipo: 'futbol' as const,
    jornada: fila.jornadaNumero,
    estado: fila.estado,
    eliminatoria: fila.eliminatoria,
    local: { id: fila.localId, nombre: nombre(fila.localId) },
    visitante: { id: fila.visitanteId, nombre: nombre(fila.visitanteId) },
    marcador: fila.marcador,
    eventos: ((fila.eventos as EventoPartido[]) ?? []).filter((e) => e.relevante),
    estadisticas: fila.estadisticas,
    resueltoAutomaticamente: resueltoAutomaticamente(fila),
    resolucion: fila.resolucion,
    ...(empezado ? { alineaciones, dorsales, equipaciones: equipacionesDelPartido(c, fila.localId, fila.visitanteId) } : {}),
    // La modalidad de quien pregunta (spec 003, FR-033); `null` si aún no lo ha abierto.
    modalidad: ((fila.modalidades as Record<string, 'rapida' | '2d'> | null) ?? {})[participanteId] ?? null,
  };
}
