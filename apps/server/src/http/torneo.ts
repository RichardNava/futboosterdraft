/**
 * Rutas del torneo y de los avisos (T114; contracts/http-api.md).
 */
import type { FastifyInstance } from 'fastify';
import type { GestorPartidas } from '../actores/gestor';
import { abandonar, marcarPantallaVista, siguienteJornada, simularResto, tablaCompleta, vistaTorneo, type DependenciasTorneo } from '../actores/torneo';
import { abandonarPartidaInvitado } from '../actores/sala';
import type { Auth } from '../auth/auth';
import { crearHooksSesion } from '../auth/rutas';
import { CuerpoPantallaVista } from '@fbd/protocol';
import { errores } from './errores';

export function registrarRutasTorneo(app: FastifyInstance, auth: Auth, gestor: GestorPartidas, deps: DependenciasTorneo): void {
  const { requiereSesion } = crearHooksSesion(auth);

  app.get<{ Params: { id: string } }>('/api/partidas/:id/torneo', { preHandler: requiereSesion }, async (req) => {
    const c = await gestor.obtenerOError(req.params.id);
    const participante = c.participanteDeUsuario(req.usuario!.id);
    if (!participante) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    // Vista filtrada: sin el resultado de los partidos propios que aún no ha visto (research R8).
    return c.ejecutar(() => vistaTorneo(c, participante.id));
  });

  // Máximos goleadores y asistentes completos (FR-041): `?todos=true`; sin el parámetro, las 10 primeras filas.
  for (const cual of ['goleadores', 'asistentes'] as const) {
    app.get<{ Params: { id: string }; Querystring: { todos?: string } }>(`/api/partidas/:id/torneo/${cual}`, { preHandler: requiereSesion }, async (req) => {
      const c = await gestor.obtenerOError(req.params.id);
      const participante = c.participanteDeUsuario(req.usuario!.id);
      if (!participante) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
      const filas = await c.ejecutar(() => tablaCompleta(c, participante.id, cual));
      return { filas: req.query.todos === 'true' ? filas : filas.slice(0, 10) };
    });
  }

  // «Siguiente jornada» con un solo humano (FR-011, FR-030; research R9).
  app.post<{ Params: { id: string } }>('/api/partidas/:id/siguiente-jornada', { preHandler: requiereSesion }, async (req) => {
    const c = await gestor.obtenerOError(req.params.id);
    if (!c.participanteDeUsuario(req.usuario!.id)) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    const r = await c.ejecutar((ctx) => siguienteJornada(c, ctx, deps));
    if ('error' in r) {
      if (r.error === 'HAY_VARIOS_HUMANOS') throw errores.prohibido(r.error, 'Con varias personas, la siguiente jornada se abre al cerrarse la actual');
      if (r.error === 'TORNEO_TERMINADO') throw errores.conflicto(r.error, 'El torneo ya ha terminado');
      throw errores.conflicto(r.error, 'La jornada actual aún no ha terminado');
    }
    return c.ejecutar(async () => ({ ok: true, jornadaActual: (await vistaTorneo(c)).jornadaActual }));
  });

  // «Simular resto del torneo» (spec 003, FR-041a y FR-041b), con `Idempotency-Key` obligatoria.
  app.post<{ Params: { id: string } }>('/api/partidas/:id/simular-resto', { preHandler: requiereSesion }, async (req) => {
    if (!req.headers['idempotency-key']) throw errores.validacion('FALTA_IDEMPOTENCY_KEY', 'Falta la cabecera Idempotency-Key');
    const c = await gestor.obtenerOError(req.params.id);
    const participante = c.participanteDeUsuario(req.usuario!.id);
    if (!participante) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    const r = await c.ejecutar((ctx) => simularResto(c, ctx, deps, participante.id));
    if ('error' in r) {
      const mensajes = {
        NO_ELIMINADO: 'Solo se puede simular el resto del torneo tras quedar eliminado',
        HAY_HUMANOS_EN_COMPETICION: 'Aún queda alguien en competición',
        TORNEO_TERMINADO: 'El torneo ya ha terminado',
      } as const;
      throw errores.conflicto(r.error, mensajes[r.error]);
    }
    return r;
  });

  // Pantalla de derrota o de campeón ya vista (spec 003, FR-041). Idempotente.
  app.post<{ Params: { id: string }; Body: unknown }>('/api/partidas/:id/pantalla-vista', { preHandler: requiereSesion }, async (req) => {
    const cuerpo = CuerpoPantallaVista.safeParse(req.body);
    if (!cuerpo.success) throw errores.validacion('CUERPO_INVALIDO', 'Pantalla desconocida');
    const c = await gestor.obtenerOError(req.params.id);
    const participante = c.participanteDeUsuario(req.usuario!.id);
    if (!participante) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    await c.ejecutar(() => marcarPantallaVista(c, participante.id, cuerpo.data.pantalla));
    return { ok: true };
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
