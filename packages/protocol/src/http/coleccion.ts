/**
 * Colección propia y fragmentos (spec 006, contracts/http-api.md «Colección»).
 */
import type { Demarcacion, Nivel } from '@fbd/domain';
import { z } from 'zod';
import type { JugadorResumen } from '../ws/draft';

/** Carta del catálogo tal como la ve el cliente (ya incluye `nombreCarta`, `nacionalidad` e imágenes). */
export type CartaResumen = JugadorResumen;

export type ViaCarta = 'registro' | 'coleccion' | 'sobre';

export type CartaPoseida = CartaResumen & {
  activa: boolean;
  via: ViaCarta;
  obtenidaEn: string;
  /** Ids de colección. */
  colecciones: string[];
  /** No desfragmentable (FR-021). */
  esCore: boolean;
  /** `null` si es de Core. */
  valorFragmentos: number | null;
  historia: string;
};

export interface IncumplimientoMinimoApi {
  demarcacion: Demarcacion;
  nivel: Nivel;
  minimo: number;
  activas: number;
}

export interface EstadoMinimo {
  cumple: boolean;
  incumplidas: IncumplimientoMinimoApi[];
}

export interface RespuestaColeccion {
  cartas: CartaPoseida[];
  colecciones: { id: string; nombre: string; tipo: 'basica' | 'pago' }[];
  minimo: EstadoMinimo;
  saldo: number;
}

export const CuerpoCambiarActiva = z.object({ activa: z.boolean() });
export type CuerpoCambiarActiva = z.infer<typeof CuerpoCambiarActiva>;

export interface RespuestaCambiarActiva {
  carta: CartaPoseida;
  minimo: EstadoMinimo;
}

export interface RespuestaDesfragmentar {
  fragmentos: number;
  saldo: number;
  minimo: EstadoMinimo;
}

export type MotivoMovimiento = 'recompensa_torneo' | 'desfragmentacion' | 'duplicado' | 'compra_fragmentos' | 'compra_sobre';

export interface MovimientoFragmentos {
  id: string;
  importe: number;
  motivo: MotivoMovimiento;
  referencia: string;
  descripcion: string;
  creadoEn: string;
}

export interface RespuestaMovimientos {
  saldo: number;
  movimientos: MovimientoFragmentos[];
}
