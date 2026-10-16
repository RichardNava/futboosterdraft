/**
 * Rutas de alineación, dorsales y equipaciones (T072; contracts/http-api.md).
 *
 * La alineación del rival no se expone por ninguna ruta (FR-054a): todas operan sobre el
 * participante del usuario de la sesión.
 */
import { parametrosActuales, previsualizar, validarAlineacion, type Equipaciones } from '@fbd/domain';
import { AlineacionEntrada, DorsalesEntrada, EquipacionesEntrada } from '@fbd/protocol';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  alineacionVigente,
  cambiarDorsales,
  cambiarEquipaciones,
  confirmarAlineacion,
  exigirEquipoEditable,
  plantillaDe,
  vistaEquipo,
} from '../actores/equipo';
import type { GestorPartidas } from '../actores/gestor';
import type { Auth } from '../auth/auth';
import { crearHooksSesion } from '../auth/rutas';
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
    const equipaciones = (c.participante(participanteId)?.equipaciones as Equipaciones | null) ?? null;
    return vistaEquipo(c, datos, dorsales, equipaciones);
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
        previsualizacion: previsualizar(titularesDePlantilla, (id) => c.servicios.catalogo.jugador(id), parametrosActuales()),
        errores: problemas.map((p) => ({ codigo: p.codigo, mensaje: p.mensaje, motivos: p.motivos })),
      };
    });
  });

  app.put<{ Params: { id: string } }>('/api/partidas/:id/alineacion', { preHandler: requiereSesion }, async (req) => {
    const a = AlineacionEntrada.parse(req.body);
    const { c, participanteId } = await contexto(req);
    return c.ejecutar(async () => {
      await confirmarAlineacion(c, participanteId, a);
      return vista(c, participanteId);
    });
  });

  app.put<{ Params: { id: string } }>('/api/partidas/:id/dorsales', { preHandler: requiereSesion }, async (req) => {
    const { dorsales } = DorsalesEntrada.parse(req.body);
    const { c, participanteId } = await contexto(req);
    const cambios = Object.fromEntries(Object.entries(dorsales).map(([id, n]) => [Number(id), n]));
    return c.ejecutar(async () => ({ dorsales: await cambiarDorsales(c, participanteId, cambios) }));
  });

  app.put<{ Params: { id: string } }>('/api/partidas/:id/equipaciones', { preHandler: requiereSesion }, async (req) => {
    const e = EquipacionesEntrada.parse(req.body);
    const { c, participanteId } = await contexto(req);
    return c.ejecutar(async () => ({ equipaciones: await cambiarEquipaciones(c, participanteId, e) }));
  });
}
