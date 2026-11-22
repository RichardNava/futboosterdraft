/**
 * API del panel de administración (spec 017, contracts/http-admin.md). Todas las rutas pasan por `soloAdministrador`.
 */
import {
  ConsultaCuentas,
  ConsultaPartidasAdmin,
  ConsultaRegistro,
  CuerpoCambiarAjuste,
  CuerpoCambiarRol,
  CuerpoEntregaFragmentos,
  CuerpoMotivo,
  CuerpoPremiumAdmin,
} from '@fbd/protocol';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { GestorPartidas } from '../actores/gestor';
import type { Auth } from '../auth/auth';
import { crearHooksSesion } from '../auth/rutas';
import type { ServicioEconomia } from '../economia/servicio';
import { errores } from '../http/errores';
import type { BaseDatos } from '../persistencia/db';
import { actorDe, type RegistroAdmin } from './registro';
import { cambiarAjuste, cambiarPremium, cambiarRol, cerrarPartida, leerAjustes, listarCuentas, listarPartidas, reactivar, suspender } from './servicio';

interface DependenciasAdmin {
  db: BaseDatos;
  gestor: GestorPartidas;
  economia: ServicioEconomia;
  registro: RegistroAdmin;
}

type ConId = { Params: { id: string } };

function validar<T>(esquema: z.ZodType<T>, valor: unknown): T {
  const r = esquema.safeParse(valor);
  if (!r.success) throw errores.validacion('VALIDACION', 'Datos no válidos');
  return r.data;
}

/** Los cursores son siempre ids; uno mal formado no debe llegar a la consulta. */
function consulta<T extends { cursor?: string | undefined }>(esquema: z.ZodType<T>, valor: unknown): T {
  const q = validar(esquema, valor);
  if (q.cursor !== undefined && !z.uuid().safeParse(q.cursor).success) throw errores.validacion('VALIDACION', 'Cursor no válido');
  return q;
}

const idCuenta = (req: FastifyRequest<ConId>): string => {
  if (!z.uuid().safeParse(req.params.id).success) throw errores.noEncontrado('CUENTA_NO_ENCONTRADA', 'No existe esa cuenta');
  return req.params.id;
};

/** Rutas `/api/admin/*`. */
export function registrarRutasAdmin(app: FastifyInstance, auth: Auth, { db, gestor, economia, registro }: DependenciasAdmin): void {
  const { soloAdministrador } = crearHooksSesion(auth, (u, ruta) => registro.denegado(u, ruta));
  // Correos y saldos no deben quedar en la caché de un equipo compartido (SEG-039).
  const sinCache = async (_req: unknown, reply: { header(clave: string, valor: string): unknown }) => {
    reply.header('cache-control', 'no-store');
  };
  const opciones = { onRequest: sinCache, preHandler: soloAdministrador };
  const actor = (req: FastifyRequest) => actorDe(req.usuario!);

  app.get('/api/admin/cuentas', opciones, async (req) => listarCuentas(db, consulta(ConsultaCuentas, req.query)));

  app.put<ConId>('/api/admin/cuentas/:id/rol', opciones, async (req) => {
    const { rol, motivo } = validar(CuerpoCambiarRol, req.body);
    return cambiarRol(db, actor(req), idCuenta(req), rol, motivo);
  });

  app.post<ConId>('/api/admin/cuentas/:id/suspender', opciones, async (req) => suspender(db, actor(req), idCuenta(req), validar(CuerpoMotivo, req.body).motivo));

  app.post<ConId>('/api/admin/cuentas/:id/reactivar', opciones, async (req) => reactivar(db, actor(req), idCuenta(req), validar(CuerpoMotivo, req.body).motivo));

  app.put<ConId>('/api/admin/cuentas/:id/premium', opciones, async (req) => {
    const { cortesia, motivo } = validar(CuerpoPremiumAdmin, req.body);
    return cambiarPremium(db, actor(req), idCuenta(req), cortesia, motivo);
  });

  app.post<ConId>('/api/admin/cuentas/:id/fragmentos', opciones, async (req) => {
    const r = CuerpoEntregaFragmentos.safeParse(req.body);
    if (!r.success) {
      if (r.error.issues.every((i) => i.path[0] === 'cantidad')) throw errores.regla('CANTIDAD_INVALIDA', 'La cantidad debe ser un entero entre 1 y 10.000');
      throw errores.validacion('VALIDACION', 'Datos no válidos');
    }
    return economia.entregarBetatester(actor(req), idCuenta(req), r.data.idEntrega, r.data.cantidad, r.data.motivo);
  });

  app.get('/api/admin/partidas', opciones, async (req) => listarPartidas(db, req.usuario!.id, consulta(ConsultaPartidasAdmin, req.query)));

  app.post<ConId>('/api/admin/partidas/:id/cerrar', opciones, async (req) => {
    const { motivo } = validar(CuerpoMotivo, req.body);
    if (!z.uuid().safeParse(req.params.id).success) throw errores.noEncontrado('PARTIDA_NO_ENCONTRADA', 'No existe esa partida');
    return cerrarPartida(db, gestor, actor(req), req.params.id, motivo);
  });

  app.get('/api/admin/ajustes', opciones, async () => ({ ajustes: await leerAjustes(db) }));

  app.put<{ Params: { clave: string } }>('/api/admin/ajustes/:clave', opciones, async (req) => {
    const { valor, motivo } = validar(CuerpoCambiarAjuste, req.body);
    const r = await cambiarAjuste(db, actor(req), req.params.clave, valor, motivo);
    return { clave: r.clave, valor: r.valor };
  });

  app.get('/api/admin/registro', opciones, async (req) => registro.listar(consulta(ConsultaRegistro, req.query)));
}
