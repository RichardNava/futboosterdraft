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
  precioCentimos: number;
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
}

export const CuerpoCompra = z.object({ idCompra: z.string().uuid() });
export type CuerpoCompra = z.infer<typeof CuerpoCompra>;

export const CuerpoCompraSobre = CuerpoCompra.extend({ moneda: z.enum(['eur', 'fragmentos']) });
export type CuerpoCompraSobre = z.infer<typeof CuerpoCompraSobre>;
