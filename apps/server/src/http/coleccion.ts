/**
 * Colección propia y fragmentos (spec 006, contracts/http-api.md «Colección»). Solo usuarios registrados.
 */
import { CuerpoCambiarActiva } from '@fbd/protocol';
import type { FastifyInstance } from 'fastify';
import type { Auth } from '../auth/auth';
import { crearHooksSesion } from '../auth/rutas';
import type { ServicioEconomia } from '../economia/servicio';
import { errores } from './errores';

const LIMITE_MOVIMIENTOS = 50;

function idCarta(texto: string): number {
  const id = Number(texto);
  if (!Number.isInteger(id) || id < 1) throw errores.validacion('ID_INVALIDO', 'El id de la carta debe ser un entero');
  return id;
}

export function registrarRutasColeccion(app: FastifyInstance, auth: Auth, economia: ServicioEconomia): void {
  const { soloRegistrados } = crearHooksSesion(auth);

  app.get('/api/coleccion', { preHandler: soloRegistrados }, async (req) => economia.leerColeccion(req.usuario!.id));

  app.put<{ Params: { id: string } }>('/api/coleccion/cartas/:id', { preHandler: soloRegistrados }, async (req) => {
    const cuerpo = CuerpoCambiarActiva.safeParse(req.body);
    if (!cuerpo.success) throw errores.validacion('CUERPO_INVALIDO', 'Indica { activa: boolean }');
    return economia.cambiarActiva(req.usuario!.id, idCarta(req.params.id), cuerpo.data.activa);
  });

  app.post<{ Params: { id: string } }>('/api/coleccion/cartas/:id/desfragmentar', { preHandler: soloRegistrados }, async (req) =>
    economia.desfragmentar(req.usuario!.id, idCarta(req.params.id)),
  );

  app.get('/api/fragmentos/saldo', { preHandler: soloRegistrados }, async (req) => economia.leerSaldo(req.usuario!.id));

  app.get<{ Querystring: { antes?: string; limite?: string } }>('/api/fragmentos/movimientos', { preHandler: soloRegistrados }, async (req) => {
    const antes = req.query.antes === undefined ? undefined : new Date(req.query.antes);
    if (antes && Number.isNaN(antes.getTime())) throw errores.validacion('FECHA_INVALIDA', '"antes" debe ser una fecha ISO');
    const limite = Math.min(Math.max(Number(req.query.limite ?? LIMITE_MOVIMIENTOS) || LIMITE_MOVIMIENTOS, 1), 200);
    return economia.movimientos(req.usuario!.id, antes, limite);
  });
}
