/**
 * Autenticación (T026; research R12; FR-000).
 *
 * Better Auth con correo y contraseña y con sesiones anónimas para los invitados. Las rutas
 * públicas del contrato (/api/auth/invitado, /registro, /login, /logout, /api/me) llaman a `auth.api.*`.
 * Su `basePath` es solo interno: el manejador de Better Auth no se expone (spec 017, R6).
 */
import { randomUUID } from 'node:crypto';
import { tieneCaracteresNoPermitidos } from '@fbd/domain';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { anonymous } from 'better-auth/plugins/anonymous';
import type { Logger } from '../observabilidad/logger';
import type { BaseDatos } from '../persistencia/db';
import { cuentas, sesiones, usuarios, verificaciones } from '../persistencia/esquema/index';

interface OpcionesAuth {
  secreto: string;
  urlPublica: string;
  /** Al registrarse un invitado: pasa sus partidas al nuevo usuario antes de borrar el anónimo. */
  alVincularInvitado?: (invitadoId: string, nuevoUsuarioId: string) => Promise<void>;
  /** Envía el enlace para restablecer la contraseña (spec 013, FR-027). */
  enviarRecuperacion?: (email: string, enlace: string) => Promise<void>;
  /** Tras restablecer la contraseña: borra los fallos de login de la cuenta (spec 017, R5). */
  alRestablecerContrasena?: (email: string) => void;
  logger?: Logger;
}

/** Better Auth con correo y contraseña, invitados anónimos y sesiones en la base de datos. */
export function crearAuth(db: BaseDatos, opciones: OpcionesAuth) {
  return betterAuth({
    secret: opciones.secreto,
    baseURL: opciones.urlPublica,
    basePath: '/api/auth/ba',
    trustedOrigins: [opciones.urlPublica],
    // Solo errores y sin sus datos: los avisos de Better Auth incluyen correos (spec 017, FR-035).
    logger: { level: 'error', log: (_nivel, mensaje) => opciones.logger?.error(mensaje) },
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user: usuarios, session: sesiones, account: cuentas, verification: verificaciones },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      revokeSessionsOnPasswordReset: true,
      // Sin esperar al correo: si no, el tiempo de respuesta revelaría si el email tiene cuenta.
      sendResetPassword: async ({ user, token }) => {
        void opciones.enviarRecuperacion?.(user.email, `${opciones.urlPublica}/?restablecer=${encodeURIComponent(token)}`);
      },
      onPasswordReset: async ({ user }) => opciones.alRestablecerContrasena?.(user.email),
    },
    plugins: [
      anonymous({
        generateName: () => `Invitado-${Math.floor(1000 + Math.random() * 9000)}`,
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await opciones.alVincularInvitado?.(anonymousUser.user.id, newUser.user.id);
        },
      }),
    ],
    advanced: {
      // Los ids los genera el servidor: las columnas id son texto sin valor por defecto.
      database: { generateId: () => randomUUID() },
      // El juego no usa la IP de la sesión y es un dato personal (spec 017, R4).
      ipAddress: { disableIpTracking: true },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  });
}

export type Auth = ReturnType<typeof crearAuth>;

/** Usuario de la sesión según el modelo de datos (data-model §2.1). */
export interface UsuarioSesion {
  id: string;
  tipo: 'registrado' | 'invitado';
  apodo: string;
  email: string | null;
}

/** Usuario de la sesión a partir del de Better Auth (registrado o invitado). */
export function aUsuarioSesion(user: { id: string; name: string; email: string; isAnonymous?: boolean | null }): UsuarioSesion {
  const invitado = user.isAnonymous === true;
  return { id: user.id, tipo: invitado ? 'invitado' : 'registrado', apodo: user.name, email: invitado ? null : user.email };
}

/** Apodo válido: 3–20 caracteres (data-model §2.1), sin HTML ni caracteres de control (spec 017, FR-031). */
export function apodoValido(apodo: unknown): apodo is string {
  if (typeof apodo !== 'string') return false;
  const limpio = apodo.trim();
  return limpio.length >= 3 && limpio.length <= 20 && !tieneCaracteresNoPermitidos(limpio);
}
