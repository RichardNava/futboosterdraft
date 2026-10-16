/**
 * Autenticación (T026; research R12; FR-000).
 *
 * Better Auth con correo y contraseña y con sesiones anónimas para los invitados. Las rutas
 * públicas del contrato (/api/auth/invitado, /registro, /login, /logout, /api/me) envuelven la API
 * de Better Auth, que queda montada internamente en /api/auth/ba/*.
 */
import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { anonymous } from 'better-auth/plugins/anonymous';
import type { BaseDatos } from '../persistencia/db';
import { cuentas, sesiones, usuarios, verificaciones } from '../persistencia/esquema/index';

export interface OpcionesAuth {
  secreto: string;
  urlPublica: string;
  /** Al registrarse un invitado: pasa sus partidas al nuevo usuario antes de borrar el anónimo. */
  alVincularInvitado?: (invitadoId: string, nuevoUsuarioId: string) => Promise<void>;
}

export function crearAuth(db: BaseDatos, opciones: OpcionesAuth) {
  return betterAuth({
    secret: opciones.secreto,
    baseURL: opciones.urlPublica,
    basePath: '/api/auth/ba',
    trustedOrigins: [opciones.urlPublica],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user: usuarios, session: sesiones, account: cuentas, verification: verificaciones },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
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

export function aUsuarioSesion(user: { id: string; name: string; email: string; isAnonymous?: boolean | null }): UsuarioSesion {
  const invitado = user.isAnonymous === true;
  return { id: user.id, tipo: invitado ? 'invitado' : 'registrado', apodo: user.name, email: invitado ? null : user.email };
}

/** Apodo válido: 3–20 caracteres (data-model §2.1). */
export function apodoValido(apodo: unknown): apodo is string {
  return typeof apodo === 'string' && apodo.trim().length >= 3 && apodo.trim().length <= 20;
}
