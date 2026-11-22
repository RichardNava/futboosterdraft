/**
 * API de administración (spec 017, contracts/http-admin.md). Todo se valida también en el servidor.
 */
import { ENTREGA_MAXIMA_FRAGMENTOS, ROLES_ASIGNABLES, type Rol, type RolAsignable } from '@fbd/domain';
import { z } from 'zod';

/** Motivo de una acción: 3 a 500 caracteres, sin caracteres de control. */
export const MotivoAdmin = z
  .string()
  .trim()
  .min(3)
  .max(500)
  .refine((s) => !/\p{Cc}/u.test(s), 'El motivo no admite caracteres de control');

export const CuerpoCambiarRol = z.object({ rol: z.enum(ROLES_ASIGNABLES), motivo: MotivoAdmin });
export const CuerpoMotivo = z.object({ motivo: MotivoAdmin });
export const CuerpoPremiumAdmin = z.object({ cortesia: z.boolean(), motivo: MotivoAdmin });
export const CuerpoEntregaFragmentos = z.object({
  idEntrega: z.uuid(),
  cantidad: z.number().int().min(1).max(ENTREGA_MAXIMA_FRAGMENTOS),
  motivo: MotivoAdmin,
});
export const CuerpoCambiarAjuste = z.object({ valor: z.string().min(1).max(64), motivo: MotivoAdmin });

const Paginacion = {
  cursor: z.string().max(200).optional(),
  limite: z.coerce.number().int().min(1).max(50).default(20),
};
export const ConsultaCuentas = z.object({ q: z.string().trim().max(100).optional(), ...Paginacion });
export const ConsultaPartidasAdmin = z.object(Paginacion);

export const ACCIONES_REGISTRO = [
  'rol.cambiar',
  'cuenta.suspender',
  'cuenta.reactivar',
  'premium.conceder',
  'premium.retirar',
  'fragmentos.entregar',
  'ajuste.cambiar',
  'partida.cerrar',
  'panel.acceso_denegado',
] as const;
export type AccionRegistro = (typeof ACCIONES_REGISTRO)[number];

export const ConsultaRegistro = z.object({
  accion: z.enum(ACCIONES_REGISTRO).optional(),
  actor: z.string().trim().max(64).optional(),
  objeto: z.string().trim().max(64).optional(),
  ...Paginacion,
});

export interface CuentaAdmin {
  id: string;
  apodo: string;
  email: string;
  rol: RolAsignable;
  suspendida: boolean;
  premiumCortesia: boolean;
  saldo: number;
}
export interface RespuestaCuentasAdmin {
  cuentas: CuentaAdmin[];
  cursor: string | null;
}

/** Sin cartas, elecciones, alineaciones ni tácticas (FR-024). */
export interface PartidaAdmin {
  id: string;
  estado: 'buscando' | 'en_draft' | 'en_torneo';
  modo: string;
  humanos: number;
  participantes: number;
  creadaEn: string;
  participaAdmin: boolean;
}
export interface RespuestaPartidasAdmin {
  partidas: PartidaAdmin[];
  cursor: string | null;
}

export interface AjusteAdmin {
  clave: string;
  valor: string;
  admitidos: string[];
}
export interface RespuestaAjustesAdmin {
  ajustes: AjusteAdmin[];
}

export interface RespuestaEntregaFragmentos {
  idEntrega: string;
  cantidad: number;
  saldo: number;
}

export interface EntradaRegistroAdmin {
  id: string;
  actor: { tipo: 'cuenta' | 'consola'; id: string | null; nombre: string; rol: Rol | 'consola' };
  accion: AccionRegistro;
  objeto: { tipo: 'cuenta' | 'partida' | 'ajuste'; id: string; nombre: string } | null;
  valorAnterior: unknown;
  valorNuevo: unknown;
  motivo: string | null;
  resultado: 'ok' | 'denegado' | 'error';
  intentos: number;
  creadoEn: string;
}
export interface RespuestaRegistroAdmin {
  entradas: EntradaRegistroAdmin[];
  cursor: string | null;
}
