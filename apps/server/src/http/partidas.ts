/**
 * Rutas de partidas (T051; contracts/http-api.md).
 */
import { AnadirNPC, CrearPartida, CuerpoNombreEquipo } from '@fbd/protocol';
import type { FastifyInstance } from 'fastify';
import type { GestorPartidas } from '../actores/gestor';
import { cambiarNombreEquipo } from '../actores/identidad';
import { misPartidas } from '../actores/misPartidas';
import { anadirNPC, iniciar, unirse } from '../actores/sala';
import type { Auth } from '../auth/auth';
import { crearHooksSesion } from '../auth/rutas';
import { errores } from './errores';

export function registrarRutasPartidas(app: FastifyInstance, auth: Auth, gestor: GestorPartidas): void {
  const { requiereSesion, requiereRegistrado } = crearHooksSesion(auth);

  app.post('/api/partidas', { preHandler: requiereSesion }, async (req, reply) => {
    const entrada = CrearPartida.parse(req.body);
    const c = await gestor.crearPartida(req.usuario!, entrada);
    return reply.code(201).send(gestor.resumen(c, req.usuario!.id));
  });

  app.get<{ Querystring: { estado?: string } }>('/api/partidas', { preHandler: requiereRegistrado }, async (req) => {
    if (req.query.estado && req.query.estado !== 'buscando') {
      throw errores.validacion('FILTRO_INVALIDO', 'Solo se pueden listar partidas abiertas (estado=buscando)');
    }
    const filas = await gestor.servicios.repoPartidas.listarPorEstado(['buscando']);
    const resultado = [];
    for (const fila of filas) {
      const c = await gestor.obtener(fila.id);
      // Las partidas de invitado no admiten más humanos.
      if (c && !c.anfitrionEsInvitado && c.humanos().length < c.partida.plazasHumanas) {
        resultado.push(gestor.resumen(c, req.usuario!.id));
      }
    }
    return resultado;
  });

  // «Mis partidas» (FR-017): en curso y terminadas, con la acción pendiente de cada una.
  app.get('/api/mis-partidas', { preHandler: requiereSesion }, async (req) => misPartidas(gestor, req.usuario!.id));

  app.get<{ Params: { id: string } }>('/api/partidas/:id', { preHandler: requiereSesion }, async (req) => {
    const c = await gestor.obtenerOError(req.params.id);
    return gestor.resumen(c, req.usuario!.id);
  });

  app.post<{ Params: { id: string } }>('/api/partidas/:id/unirse', { preHandler: requiereRegistrado }, async (req) => {
    const c = await gestor.obtenerOError(req.params.id);
    if (c.anfitrionEsInvitado) throw errores.conflicto('PARTIDA_COMPLETA', 'Esta partida no admite más jugadores');
    await c.ejecutar((ctx) => unirse(c, ctx, req.usuario!.id));
    return gestor.resumen(c, req.usuario!.id);
  });

  app.post<{ Params: { id: string } }>('/api/partidas/:id/npc', { preHandler: requiereSesion }, async (req) => {
    const { nivel } = AnadirNPC.parse(req.body);
    const c = await gestor.obtenerOError(req.params.id);
    await c.ejecutar((ctx) => anadirNPC(c, ctx, req.usuario!.id, nivel));
    return gestor.resumen(c, req.usuario!.id);
  });

  app.post<{ Params: { id: string } }>('/api/partidas/:id/iniciar', { preHandler: requiereSesion }, async (req) => {
    const c = await gestor.obtenerOError(req.params.id);
    await c.ejecutar((ctx) => iniciar(c, ctx, req.usuario!.id));
    return gestor.resumen(c, req.usuario!.id);
  });

  // Nombre del equipo en la partida (spec 003, FR-042, FR-043): editable hasta que se abre el primer partido.
  app.put<{ Params: { id: string } }>('/api/partidas/:id/nombre-equipo', { preHandler: requiereSesion }, async (req) => {
    const cuerpo = CuerpoNombreEquipo.safeParse(req.body);
    if (!cuerpo.success) throw errores.validacion('CUERPO_INVALIDO', 'Falta el nombre');
    const c = await gestor.obtenerOError(req.params.id);
    const participante = c.participanteDeUsuario(req.usuario!.id);
    if (!participante) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    return c.ejecutar((ctx) => cambiarNombreEquipo(c, ctx, participante.id, cuerpo.data.nombre));
  });

  app.get<{ Params: { id: string } }>('/api/partidas/:id/plantillas', { preHandler: requiereSesion }, async (req) => {
    const c = await gestor.obtenerOError(req.params.id);
    if (!c.participanteDeUsuario(req.usuario!.id)) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    if (c.partida.estado === 'buscando' || c.partida.estado === 'en_draft') {
      throw errores.conflicto('DRAFT_EN_CURSO', 'Las plantillas se ven al terminar el draft');
    }
    return gestor.plantillasVisibles(c);
  });
}
