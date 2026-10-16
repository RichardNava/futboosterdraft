/**
 * Rutas de sesión del contrato HTTP y hooks de autorización (T026).
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { errores } from '../http/errores';
import { apodoValido, aUsuarioSesion, type Auth, type UsuarioSesion } from './auth';

declare module 'fastify' {
  interface FastifyRequest {
    usuario?: UsuarioSesion;
  }
}

export function cabecerasWeb(req: FastifyRequest): Headers {
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

export async function usuarioDeLaPeticion(auth: Auth, req: FastifyRequest): Promise<UsuarioSesion | undefined> {
  const sesion = await auth.api.getSession({ headers: cabecerasWeb(req) });
  return sesion ? aUsuarioSesion(sesion.user) : undefined;
}

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
  return { requiereSesion, requiereRegistrado };
}

export interface OpcionesRutasAuth {
  /** Se llama al cerrar sesión, antes de invalidarla (p. ej. para abandonar partidas de invitado). */
  alCerrarSesion?: (usuario: UsuarioSesion) => Promise<void>;
}

export function registrarRutasAuth(app: FastifyInstance, auth: Auth, opciones: OpcionesRutasAuth = {}): void {
  const { requiereSesion } = crearHooksSesion(auth);

  // API interna de Better Auth.
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/ba/*',
    handler: async (req, reply) => {
      const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
      const cuerpo = req.body === undefined ? undefined : JSON.stringify(req.body);
      const respuesta = await auth.handler(
        new Request(url, { method: req.method, headers: cabecerasWeb(req), body: cuerpo }),
      );
      return reenviar(reply, respuesta);
    },
  });

  app.post('/api/auth/invitado', async (req, reply) => {
    const respuesta = await auth.api.signInAnonymous({ headers: cabecerasWeb(req), asResponse: true });
    if (!respuesta.ok) return reenviar(reply, respuesta);
    const datos = (await respuesta.clone().json()) as { user: Parameters<typeof aUsuarioSesion>[0] };
    const cookies = respuesta.headers.getSetCookie();
    if (cookies.length) reply.header('set-cookie', cookies);
    return reply.code(200).send({ usuario: aUsuarioSesion({ ...datos.user, isAnonymous: true }) });
  });

  app.post<{ Body: { email?: string; password?: string; apodo?: string } }>('/api/auth/registro', async (req, reply) => {
    const { email, password, apodo } = req.body ?? {};
    if (!apodoValido(apodo)) throw errores.validacion('APODO_INVALIDO', 'El apodo debe tener entre 3 y 20 caracteres');
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw errores.validacion('DATOS_INVALIDOS', 'Faltan el correo o la contraseña');
    }
    // Si hay sesión de invitado, el plugin anónimo la vincula al nuevo usuario (onLinkAccount).
    const respuesta = await auth.api.signUpEmail({
      body: { email, password, name: apodo.trim() },
      headers: cabecerasWeb(req),
      asResponse: true,
    });
    return reenviar(reply, respuesta);
  });

  app.post<{ Body: { email?: string; password?: string } }>('/api/auth/login', async (req, reply) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw errores.validacion('DATOS_INVALIDOS', 'Faltan el correo o la contraseña');
    }
    const respuesta = await auth.api.signInEmail({ body: { email, password }, headers: cabecerasWeb(req), asResponse: true });
    return reenviar(reply, respuesta);
  });

  app.post('/api/auth/logout', { preHandler: requiereSesion }, async (req, reply) => {
    if (req.usuario) await opciones.alCerrarSesion?.(req.usuario);
    const respuesta = await auth.api.signOut({ headers: cabecerasWeb(req), asResponse: true });
    return reenviar(reply, respuesta);
  });

  app.get('/api/me', { preHandler: requiereSesion }, async (req) => ({ usuario: req.usuario }));
}
