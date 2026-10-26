/**
 * Tienda (spec 006, contracts/http-api.md «Tienda»). Solo usuarios registrados; los pagos en euros son simulados.
 */
import { CuerpoCompra, CuerpoCompraSobre } from '@fbd/protocol';
import type { FastifyInstance } from 'fastify';
import type { z } from 'zod';
import type { Auth } from '../auth/auth';
import { crearHooksSesion } from '../auth/rutas';
import type { ServicioEconomia } from '../economia/servicio';
import { errores } from './errores';

function cuerpo<T extends z.ZodTypeAny>(esquema: T, valor: unknown): z.infer<T> {
  const r = esquema.safeParse(valor);
  if (!r.success) throw errores.validacion('CUERPO_INVALIDO', 'Falta un idCompra (UUID) válido o la moneda es desconocida');
  return r.data;
}

export function registrarRutasTienda(app: FastifyInstance, auth: Auth, economia: ServicioEconomia): void {
  const { soloRegistrados } = crearHooksSesion(auth);

  app.get('/api/tienda', { preHandler: soloRegistrados }, async (req) => economia.tienda(req.usuario!.id));

  app.post('/api/tienda/sobre/comprar', { preHandler: soloRegistrados }, async (req) => {
    const { idCompra, moneda } = cuerpo(CuerpoCompraSobre, req.body);
    return economia.comprarSobre(req.usuario!.id, moneda, idCompra);
  });

  app.post<{ Params: { id: string } }>('/api/tienda/colecciones/:id/comprar', { preHandler: soloRegistrados }, async (req) =>
    economia.comprarColeccion(req.usuario!.id, req.params.id, cuerpo(CuerpoCompra, req.body).idCompra),
  );

  app.post<{ Params: { paquete: string } }>('/api/tienda/fragmentos/:paquete/comprar', { preHandler: soloRegistrados }, async (req) =>
    economia.comprarFragmentos(req.usuario!.id, req.params.paquete, cuerpo(CuerpoCompra, req.body).idCompra),
  );
}
