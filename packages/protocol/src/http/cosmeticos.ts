/**
 * Cosméticos, aspecto del perfil y escudo por partida (spec 011, contracts/http-api.md). Pagos en euros simulados.
 */
import type { TipoCosmetico } from '@fbd/domain';
import { z } from 'zod';
import { CuerpoCompra } from './tienda';

export interface Cosmetico {
  id: string;
  tipo: TipoCosmetico;
  nombre: string;
  gratuito: boolean;
  precioCentimos: number | null;
  precioFragmentos: number | null;
  /** Solo con sesión registrada; los gratuitos siempre `true`. */
  poseido?: boolean;
}

export interface PackCosmeticos {
  id: string;
  tipo: TipoCosmetico;
  nombre: string;
  cosmeticos: string[];
  precioCentimos: number;
  /** Solo con sesión registrada: false si ya tiene alguno (research R10). */
  disponible?: boolean;
}

export interface RespuestaCosmeticos {
  cosmeticos: Cosmetico[];
  packs: PackCosmeticos[];
  saldo?: number;
}

export interface RespuestaCompraCosmetico {
  idCompra: string;
  cosmeticos: string[];
  saldo: number;
}

export const CuerpoCompraCosmetico = CuerpoCompra.extend({ moneda: z.enum(['eur', 'fragmentos']) });
export type CuerpoCompraCosmetico = z.infer<typeof CuerpoCompraCosmetico>;

export const CuerpoCompraPack = CuerpoCompra;
export type CuerpoCompraPack = z.infer<typeof CuerpoCompraPack>;

export interface Aspecto {
  /** Elegido o asignado; null solo para invitados. */
  escudo: string | null;
  /** true si `escudo` es el asignado por defecto (la cuenta no ha elegido). */
  escudoAsignado: boolean;
  sobreFavorito: string;
  sobreCarrusel: boolean;
  sobresMarcados: string[];
  /** Diseño para los sobres decorativos (no avanza la baraja). */
  sobreActual: string;
}

const idCosmetico = z.string().min(1).max(80);

export const CuerpoAspecto = z
  .object({
    escudo: idCosmetico.nullable(),
    sobreFavorito: idCosmetico,
    sobreCarrusel: z.boolean(),
    sobresMarcados: z.array(idCosmetico).max(100),
  })
  .partial()
  .strict();
export type CuerpoAspecto = z.infer<typeof CuerpoAspecto>;

export interface RespuestaSobreSiguiente {
  diseno: string;
}

export const CuerpoEscudoPartida = z.object({ escudo: idCosmetico.nullable() }).strict();
export type CuerpoEscudoPartida = z.infer<typeof CuerpoEscudoPartida>;
