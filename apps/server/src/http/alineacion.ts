/**
 * Rutas de alineación, dorsales y equipaciones (T072; contracts/http-api.md).
 *
 * La alineación del rival no se expone por ninguna ruta (FR-054a): todas operan sobre el
 * participante del usuario de la sesión.
 */
import { desdeV1, parametrosActuales, previsualizar, validarAlineacion } from '@fbd/domain';
import { AlineacionEntrada, DorsalesEntrada, EquipacionesEntrada } from '@fbd/protocol';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  alineacionVigente,
  cambiarDorsal,
  cambiarEquipaciones,
  confirmarAlineacion,
  exigirEquipoEditable,
  plantillaDe,
  vistaEquipo,
} from '../actores/equipo';
import type { GestorPartidas } from '../actores/gestor';
import type { Auth } from '../auth/auth';
import { crearHooksSesion } from '../auth/rutas';
import { torneoIniciado } from '../actores/identidad';
import { errores } from './errores';

export function registrarRutasAlineacion(app: FastifyInstance, auth: Auth, gestor: GestorPartidas): void {
  const { requiereSesion } = crearHooksSesion(auth);

  async function contexto(req: FastifyRequest<{ Params: { id: string } }>) {
    const c = await gestor.obtenerOError(req.params.id);
    const participante = c.participanteDeUsuario(req.usuario!.id);
    if (!participante) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    return { c, participanteId: participante.id };
  }

  async function vista(c: Awaited<ReturnType<typeof contexto>>['c'], participanteId: string) {
    const datos = await alineacionVigente(c, participanteId);
    const dorsales = await c.servicios.repoEquipo.dorsales(participanteId);
    const equipaciones = desdeV1(c.participante(participanteId)?.equipaciones ?? null);
    // Nombre del equipo, editable hasta que se abre el primer partido (spec 003, FR-042).
    const p = c.participante(participanteId);
    return { ...vistaEquipo(c, datos, dorsales, equipaciones), nombreEquipo: p ? c.nombreDe(p) : '', nombreEditable: !(await torneoIniciado(c)) };
  }

  app.get<{ Params: { id: string } }>('/api/partidas/:id/alineacion', { preHandler: requiereSesion }, async (req) => {
    const { c, participanteId } = await contexto(req);
    return c.ejecutar(async () => {
      exigirEquipoEditable(c);
      return vista(c, participanteId);
    });
  });

  app.post<{ Params: { id: string } }>('/api/partidas/:id/alineacion/previsualizar', { preHandler: requiereSesion }, async (req) => {
    const a = AlineacionEntrada.parse(req.body);
    const { c, participanteId } = await contexto(req);
    return c.ejecutar(async () => {
      exigirEquipoEditable(c);
      const plantilla = await plantillaDe(c, participanteId);
      const ids = new Set(plantilla.map((j) => j.id));
      const problemas = validarAlineacion(a, [...ids], c.bajasActivas?.(participanteId) ?? new Set());
      const titularesDePlantilla = { ...a, titulares: a.titulares.filter((t) => ids.has(t.jugadorId)) };
      return {
        previsualizacion: previsualizar(titularesDePlantilla, (id) => c.catalogo.jugador(id), parametrosActuales()),
        errores: problemas.map((p) => ({ codigo: p.codigo, mensaje: p.mensaje, motivos: p.motivos })),
      };
    });
  });

  app.put<{ Params: { id: string } }>('/api/partidas/:id/alineacion', { preHandler: requiereSesion }, async (req) => {
    const a = AlineacionEntrada.parse(req.body);
    const { c, participanteId } = await contexto(req);
    return c.ejecutar(async (ctx) => {
      await confirmarAlineacion(c, participanteId, a);
      // Duelos (spec 005): con el once ya bloqueado, sus cruces de la ronda abierta se pueden resolver.
      if (c.partida.modo === 'duelos') await c.resolverDuelos?.(ctx);
      return vista(c, participanteId);
    });
  });

  app.put<{ Params: { id: string } }>('/api/partidas/:id/dorsales', { preHandler: requiereSesion }, async (req) => {
    const { jugadorId, dorsal } = DorsalesEntrada.parse(req.body);
    const { c, participanteId } = await contexto(req);
    return c.ejecutar(() => cambiarDorsal(c, participanteId, jugadorId, dorsal));
  });

  app.put<{ Params: { id: string } }>('/api/partidas/:id/equipaciones', { preHandler: requiereSesion }, async (req) => {
    // v2, o v1 convertida con `desdeV1` durante el periodo de compatibilidad (spec 003, FR-045).
    const e = desdeV1(EquipacionesEntrada.parse(req.body))!;
    const { c, participanteId } = await contexto(req);
    return c.ejecutar(async () => ({ equipaciones: await cambiarEquipaciones(c, participanteId, e) }));
  });
}
