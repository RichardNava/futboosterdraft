/**
 * Cosméticos (spec 011, contracts/http-api.md «Cosméticos»): catálogo público y compras de registrados. Los pagos en
 * euros son simulados; la compra es idempotente por `idCompra` (FR-015, SC-006).
 */
import { CuerpoCompraCosmetico, CuerpoCompraPack, type RespuestaCosmeticos } from '@fbd/protocol';
import type { FastifyInstance } from 'fastify';
import type { z } from 'zod';
import type { Auth } from '../auth/auth';
import { crearHooksSesion, usuarioDeLaPeticion } from '../auth/rutas';
import type { ServicioEconomia } from '../economia/servicio';
import type { RepoCosmeticos } from '../persistencia/repos/cosmeticos';
import { errores } from './errores';

function cuerpo<T extends z.ZodTypeAny>(esquema: T, valor: unknown): z.infer<T> {
  const r = esquema.safeParse(valor);
  if (!r.success) throw errores.validacion('CUERPO_INVALIDO', 'Falta un idCompra (UUID) válido o la moneda es desconocida');
  return r.data;
}

export function registrarRutasCosmeticos(app: FastifyInstance, auth: Auth, economia: ServicioEconomia, cosmeticos: RepoCosmeticos): void {
  const { soloRegistrados } = crearHooksSesion(auth);

  app.get('/api/cosmeticos', async (req): Promise<RespuestaCosmeticos> => {
    const usuario = await usuarioDeLaPeticion(auth, req);
    const registrado = usuario?.tipo === 'registrado' ? usuario : null;
    const poseidos = registrado ? await cosmeticos.poseidos(registrado.id) : new Set<string>();
    const lista = cosmeticos.todos().filter((c) => c.activo || poseidos.has(c.id));
    return {
      cosmeticos: lista.map((c) => ({
        id: c.id,
        tipo: c.tipo,
        nombre: c.nombre,
        gratuito: c.gratuito,
        precioCentimos: c.precioCentimos,
        precioFragmentos: c.precioFragmentos,
        // Celebraciones (spec 012): con sus datos, para la vista previa y el selector del perfil.
        ...(c.datos ? { datos: c.datos } : {}),
        ...(registrado ? { poseido: c.gratuito || poseidos.has(c.id) } : {}),
      })),
      packs: cosmeticos.packs
        .filter((p) => p.activo)
        .map((p) => ({
          id: p.id,
          tipo: p.tipo,
          nombre: p.nombre,
          cosmeticos: p.cosmeticos,
          precioCentimos: p.precioCentimos,
          ...(registrado ? { disponible: !p.cosmeticos.some((id) => poseidos.has(id)) } : {}),
        })),
      ...(registrado ? { saldo: (await economia.leerSaldo(registrado.id)).saldo } : {}),
    };
  });

  app.post<{ Params: { id: string } }>('/api/tienda/cosmeticos/:id/comprar', { preHandler: soloRegistrados }, async (req) => {
    const { idCompra, moneda } = cuerpo(CuerpoCompraCosmetico, req.body);
    return economia.comprarCosmetico(req.usuario!.id, req.params.id, moneda, idCompra);
  });

  app.post<{ Params: { id: string } }>('/api/tienda/packs/:id/comprar', { preHandler: soloRegistrados }, async (req) =>
    economia.comprarPack(req.usuario!.id, req.params.id, cuerpo(CuerpoCompraPack, req.body).idCompra),
  );
}
