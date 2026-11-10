/**
 * Tienda (spec 006, contracts/http-api.md «Tienda»). Los pagos en euros son simulados (FR-031).
 */
import type { Nivel } from '@fbd/domain';
import { z } from 'zod';
import type { CartaResumen } from './coleccion';

export interface ResumenCompra {
  idCompra: string;
  cartas: CartaResumen[];
  fragmentos: number;
  duplicados: { id: number; nivel: Nivel; nombreCarta: string; fragmentos: number }[];
  saldo: number;
}

export interface ProductoColeccion {
  id: string;
  nombre: string;
  descripcion: string;
  /** Precio en euros para cuando haya licencia de imagen; no se ofrece (spec 011, FR-002). */
  precioCentimos: number;
  /** Único precio de venta mientras no haya licencia de imagen (spec 011, FR-002). */
  precioFragmentos: number;
  numCartas: number;
  porNivel: Record<Nivel, number>;
  muestra: CartaResumen[];
  poseidas: number;
  adquirida: boolean;
  /** Fragmentos que se recibirían si ya se tienen todas sus cartas (US5, escenario 4). */
  soloFragmentos: number | null;
}

export interface ProductoSobre {
  precioFragmentos: number;
  precioCentimos: number;
  disponible: boolean;
  motivoNoDisponible?: string;
  /** Fragmentos que faltan para pagarlo con el saldo actual. */
  faltan?: number;
}

export interface ProductoFragmentos {
  id: string;
  fragmentos: number;
  precioCentimos: number;
}

export interface RespuestaTienda {
  saldo: number;
  colecciones: ProductoColeccion[];
  sobre: ProductoSobre;
  paquetes: ProductoFragmentos[];
  /** Spec 013 (FR-034): pase premium de `dias` días; `estado` null si nunca se compró ni hay cortesía. */
  pasePremium: {
    precioFragmentos: number;
    precioCentimos: number;
    dias: number;
    estado: { activo: boolean; cortesia: boolean; fin: string | null } | null;
  };
}

export interface RespuestaCompraPase {
  idCompra: string;
  saldo: number;
  premium: { activo: boolean; cortesia: boolean; fin: string | null };
}

export const CuerpoCompra = z.object({ idCompra: z.string().uuid() });
export type CuerpoCompra = z.infer<typeof CuerpoCompra>;

/** `'eur'` se sigue aceptando al leer el cuerpo para responder 422 `MONEDA_NO_ADMITIDA` (spec 011, FR-002). */
export const CuerpoCompraSobre = CuerpoCompra.extend({ moneda: z.enum(['eur', 'fragmentos']) });
export type CuerpoCompraSobre = z.infer<typeof CuerpoCompraSobre>;

/** `POST /api/tienda/pase-premium` (spec 013). */
export const CuerpoCompraPase = CuerpoCompra.extend({ moneda: z.enum(['eur', 'fragmentos']) });
export type CuerpoCompraPase = z.infer<typeof CuerpoCompraPase>;
