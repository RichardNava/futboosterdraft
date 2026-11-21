/**
 * Rutas de sesión del contrato HTTP y hooks de autorización (T026).
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { cuerpoError, errores } from '../http/errores';
import { claveCliente, Limitador, LIMITES_CUENTA, normalizarCorreo, SIN_LIMITE, type OpcionesLimitador } from '../http/limitador';
import { apodoValido, aUsuarioSesion, type Auth, type UsuarioSesion } from './auth';

declare module 'fastify' {
  interface FastifyRequest {
    usuario?: UsuarioSesion;
  }
}

const LARGO_MAXIMO_CORREO = 254;
const CorreoValido = z.email().max(LARGO_MAXIMO_CORREO);

/** Cabeceras de la petición de Fastify como `Headers` web (para Better Auth). */
function cabecerasWeb(req: FastifyRequest): Headers {
  const h = new Headers();
  for (const [clave, valor] of Object.entries(req.headers)) {
    if (valor === undefined) continue;
    if (Array.isArray(valor)) for (const v of valor) h.append(clave, v);
    else h.set(clave, String(valor));
  }
  return h;
}

/** Copia a Fastify la respuesta (estado, cookies y cuerpo) que devuelve Better Auth. */
async function reenviar(reply: FastifyReply, respuesta: Response): Promise<FastifyReply> {
  reply.code(respuesta.status);
  const cookies = respuesta.headers.getSetCookie();
  if (cookies.length) reply.header('set-cookie', cookies);
  const tipo = respuesta.headers.get('content-type');
  if (tipo) reply.header('content-type', tipo);
  const texto = await respuesta.text();
  return reply.send(texto === '' ? undefined : texto);
}

/** Responde `{ usuario }` con las cookies de la sesión: el token nunca va en el cuerpo (spec 017, FR-017). */
async function responderSesion(reply: FastifyReply, respuesta: Response, invitado = false): Promise<FastifyReply> {
  if (!respuesta.ok) return reenviar(reply, respuesta);
  const datos = (await respuesta.clone().json()) as { user: Parameters<typeof aUsuarioSesion>[0] };
  const cookies = respuesta.headers.getSetCookie();
  if (cookies.length) reply.header('set-cookie', cookies);
  return reply.code(200).send({ usuario: aUsuarioSesion(invitado ? { ...datos.user, isAnonymous: true } : datos.user) });
}

const demasiados = (reply: FastifyReply) => reply.code(429).send(cuerpoError('DEMASIADAS_PETICIONES', 'Demasiados intentos; espera un momento'));

/** Sesión de la petición, con su id para poder revocar el WebSocket (spec 017, R8). */
export async function sesionDeLaPeticion(auth: Auth, req: FastifyRequest): Promise<{ usuario: UsuarioSesion; sesionId: string } | undefined> {
  const sesion = await auth.api.getSession({ headers: cabecerasWeb(req) });
  return sesion ? { usuario: aUsuarioSesion(sesion.user), sesionId: sesion.session.id } : undefined;
}

/** Usuario de la sesión de la petición, si la hay. */
export async function usuarioDeLaPeticion(auth: Auth, req: FastifyRequest): Promise<UsuarioSesion | undefined> {
  return (await sesionDeLaPeticion(auth, req))?.usuario;
}

/** Ganchos de Fastify que exigen sesión, usuario registrado o solo registrados. */
export function crearHooksSesion(auth: Auth) {
  const requiereSesion = async (req: FastifyRequest) => {
    req.usuario = await usuarioDeLaPeticion(auth, req);
    if (!req.usuario) throw errores.sinSesion();
  };
  const requiereRegistrado = async (req: FastifyRequest) => {
    await requiereSesion(req);
    if (req.usuario?.tipo !== 'registrado') {
      throw errores.prohibido('INVITADO_NO_PERMITIDO', 'Esta acción requiere una cuenta registrada');
    }
  };
  // Colección y tienda (spec 006, contracts/http-api.md): sin sesión 401 SIN_SESION; invitado 403 SOLO_REGISTRADOS.
  const soloRegistrados = async (req: FastifyRequest) => {
    await requiereSesion(req);
    if (req.usuario?.tipo !== 'registrado') throw errores.prohibido('SOLO_REGISTRADOS', 'La colección y la tienda son solo para usuarios registrados');
  };
  return { requiereSesion, requiereRegistrado, soloRegistrados };
}

export interface OpcionesRutasAuth {
  /** Se llama al cerrar sesión, antes de invalidarla (p. ej. para abandonar partidas de invitado). */
  alCerrarSesion?: (usuario: UsuarioSesion) => Promise<void>;
  /** Borra la cuenta y sus datos; sin él, `DELETE /api/cuenta` no se registra. */
  alEliminarCuenta?: (usuario: UsuarioSesion) => Promise<void>;
  /** Fallos de login por correo: se comparte con Better Auth, que los borra al restablecer la contraseña. */
  fallosLogin?: Limitador;
  /** Sin límites de uso: pruebas y prueba de carga. */
  limitesDesactivados?: boolean;
}

/** Rutas de autenticación (`/api/auth/*`) y de la sesión. */
export function registrarRutasAuth(app: FastifyInstance, auth: Auth, opciones: OpcionesRutasAuth = {}): void {
  const { requiereSesion, requiereRegistrado } = crearHooksSesion(auth);
  const limite = (o: OpcionesLimitador) => new Limitador(opciones.limitesDesactivados ? SIN_LIMITE : o);
  const limiteLogin = limite(LIMITES_CUENTA.loginIp);
  const fallosLogin = opciones.fallosLogin ?? limite(LIMITES_CUENTA.loginFallos);
  const limiteRegistro = limite(LIMITES_CUENTA.registro);
  const limiteInvitado = limite(LIMITES_CUENTA.invitado);
  const limiteRecuperacion = limite(LIMITES_CUENTA.recuperacionIp);
  const limiteRecuperacionCorreo = limite(LIMITES_CUENTA.recuperacionCorreo);

  app.post('/api/auth/invitado', async (req, reply) => {
    if (!limiteInvitado.permitir(claveCliente(req.ip))) return demasiados(reply);
    const respuesta = await auth.api.signInAnonymous({ headers: cabecerasWeb(req), asResponse: true });
    return responderSesion(reply, respuesta, true);
  });

  app.post<{ Body: { email?: string; password?: string; apodo?: string } }>('/api/auth/registro', async (req, reply) => {
    if (!limiteRegistro.permitir(claveCliente(req.ip))) return demasiados(reply);
    const { email, password, apodo } = req.body ?? {};
    if (!apodoValido(apodo)) throw errores.validacion('APODO_INVALIDO', 'El apodo debe tener entre 3 y 20 caracteres, sin símbolos < y >');
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw errores.validacion('DATOS_INVALIDOS', 'Faltan el correo o la contraseña');
    }
    // Si hay sesión de invitado, el plugin anónimo la vincula al nuevo usuario (onLinkAccount).
    const respuesta = await auth.api.signUpEmail({
      body: { email, password, name: apodo.trim() },
      headers: cabecerasWeb(req),
      asResponse: true,
    });
    return responderSesion(reply, respuesta);
  });

  app.post<{ Body: { email?: string; password?: string } }>('/api/auth/login', async (req, reply) => {
    if (!limiteLogin.permitir(claveCliente(req.ip))) return demasiados(reply);
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > LARGO_MAXIMO_CORREO) {
      throw errores.validacion('DATOS_INVALIDOS', 'Faltan el correo o la contraseña');
    }
    // Se comprueba igual exista o no la cuenta, y solo gastan ficha los fallos.
    const correo = normalizarCorreo(email);
    if (!fallosLogin.disponible(correo)) return demasiados(reply);
    const respuesta = await auth.api.signInEmail({ body: { email, password }, headers: cabecerasWeb(req), asResponse: true });
    if (respuesta.status === 401) fallosLogin.permitir(correo);
    return responderSesion(reply, respuesta);
  });

  // Recuperar la contraseña (spec 013, FR-027). Se responde sin esperar a la operación: ni la respuesta ni el tiempo
  // dicen si el correo tiene cuenta (spec 017, FR-016), y pasado el cupo del correo solo se deja de enviar.
  app.post<{ Body: { email?: string } }>('/api/auth/recuperar', async (req, reply) => {
    if (!limiteRecuperacion.permitir(claveCliente(req.ip))) return demasiados(reply);
    const email = CorreoValido.safeParse(req.body?.email);
    if (!email.success) throw errores.validacion('DATOS_INVALIDOS', 'Falta el correo');
    if (limiteRecuperacionCorreo.permitir(normalizarCorreo(email.data))) {
      void auth.api
        .requestPasswordReset({ body: { email: email.data }, headers: cabecerasWeb(req) })
        .catch(() => req.log.error('No se pudo generar el enlace de recuperación'));
    }
    return { status: true, message: 'Si el correo tiene cuenta, recibirás un enlace' };
  });

  app.post<{ Body: { token?: string; password?: string } }>('/api/auth/restablecer', async (req, reply) => {
    const { token, password } = req.body ?? {};
    if (typeof token !== 'string' || typeof password !== 'string') {
      throw errores.validacion('DATOS_INVALIDOS', 'Faltan el enlace o la contraseña');
    }
    const respuesta = await auth.api.resetPassword({ body: { token, newPassword: password }, headers: cabecerasWeb(req), asResponse: true });
    return reenviar(reply, respuesta);
  });

  app.post('/api/auth/logout', { preHandler: requiereSesion }, async (req, reply) => {
    if (req.usuario) await opciones.alCerrarSesion?.(req.usuario);
    const respuesta = await auth.api.signOut({ headers: cabecerasWeb(req), asResponse: true });
    return reenviar(reply, respuesta);
  });

  // Primero se borra la cuenta (arrastra sesiones y cuentas): si falla, la sesión sigue abierta (spec 017, R24). Después
  // se piden las cookies que cierran la sesión.
  const alEliminarCuenta = opciones.alEliminarCuenta;
  if (alEliminarCuenta) {
    app.delete('/api/cuenta', { preHandler: requiereRegistrado }, async (req, reply) => {
      await alEliminarCuenta(req.usuario!);
      const respuesta = await auth.api.signOut({ headers: cabecerasWeb(req), asResponse: true });
      return reenviar(reply, respuesta);
    });
  }

  app.get('/api/me', { preHandler: requiereSesion }, async (req) => ({ usuario: req.usuario }));
}
