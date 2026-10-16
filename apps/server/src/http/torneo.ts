/**
 * Rutas del torneo y de los avisos (T114; contracts/http-api.md).
 */
import type { FastifyInstance } from 'fastify';
import type { GestorPartidas } from '../actores/gestor';
import { abandonar, marcarListo, vistaTorneo, type DependenciasTorneo } from '../actores/torneo';
import { abandonarPartidaInvitado } from '../actores/sala';
import type { Auth } from '../auth/auth';
import { crearHooksSesion } from '../auth/rutas';
import { errores } from './errores';

export function registrarRutasTorneo(app: FastifyInstance, auth: Auth, gestor: GestorPartidas, deps: DependenciasTorneo): void {
  const { requiereSesion } = crearHooksSesion(auth);

  app.get<{ Params: { id: string } }>('/api/partidas/:id/torneo', { preHandler: requiereSesion }, async (req) => {
    const c = await gestor.obtenerOError(req.params.id);
    if (!c.participanteDeUsuario(req.usuario!.id)) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    return c.ejecutar(() => vistaTorneo(c));
  });

  app.post<{ Params: { id: string } }>('/api/partidos/:id/listo', { preHandler: requiereSesion }, async (req) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw errores.noEncontrado('PARTIDO_NO_ENCONTRADO', 'No existe ese partido');
    const fila = await gestor.servicios.repoPartidos.obtener(req.params.id);
    if (!fila) throw errores.noEncontrado('PARTIDO_NO_ENCONTRADO', 'No existe ese partido');
    const c = await gestor.obtenerOError(fila.partidaId);
    const participante = c.participanteDeUsuario(req.usuario!.id);
    if (!participante) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    if (c.partida.ritmo !== 'asincrono') throw errores.conflicto('RITMO_DIRECTO', 'En directo los partidos empiezan al acabar la preparación');
    const r = await c.ejecutar((ctx) => marcarListo(c, ctx, deps, participante.id, fila.id));
    if ('error' in r) {
      if (r.error === 'PARTIDO_INICIADO') throw errores.conflicto(r.error, 'El partido ya ha empezado');
      throw errores.noEncontrado(r.error!, 'Ese partido no es de la jornada actual');
    }
    return r;
  });

  app.post<{ Params: { id: string } }>('/api/partidas/:id/abandonar', { preHandler: requiereSesion }, async (req) => {
    const c = await gestor.obtenerOError(req.params.id);
    const participante = c.participanteDeUsuario(req.usuario!.id);
    if (!participante) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    if (c.anfitrionEsInvitado) {
      await c.ejecutar((ctx) => abandonarPartidaInvitado(c, ctx));
      return { estado: c.partida.estado };
    }
    await c.ejecutar((ctx) => abandonar(c, ctx, participante.id));
    return { estado: c.partida.estado, controladoPorNPC: true };
  });

  app.get<{ Querystring: { noLeidos?: string } }>('/api/avisos', { preHandler: requiereSesion }, async (req) => {
    const filas = await deps.avisos.listar(req.usuario!.id, req.query.noLeidos === 'true');
    return filas.map((a) => ({
      id: a.id,
      tipo: a.tipo,
      partidaId: a.partidaId,
      partidoId: a.partidoId,
      texto: a.texto,
      leido: a.leido,
      creadoEn: a.creadoEn.toISOString(),
    }));
  });

  app.post<{ Params: { id: string } }>('/api/avisos/:id/leido', { preHandler: requiereSesion }, async (req) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id) || !(await deps.avisos.marcarLeido(req.usuario!.id, req.params.id))) {
      throw errores.noEncontrado('AVISO_NO_ENCONTRADO', 'No existe ese aviso');
    }
    return { ok: true };
  });
}
