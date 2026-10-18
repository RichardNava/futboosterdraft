/**
 * Construcción de la aplicación Fastify (T027).
 *
 * La app se construye a partir de sus dependencias (base de datos, autenticación, reloj…) para que
 * las pruebas puedan inyectar un `RelojFalso` y una base de datos de pruebas.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fastifyCompress from '@fastify/compress';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { Auth } from '../auth/auth';
import { registrarRutasAuth, type OpcionesRutasAuth } from '../auth/rutas';
import type { Logger } from '../observabilidad/logger';
import type { Metricas } from '../observabilidad/metricas';
import { registrarRutasObservabilidad } from '../observabilidad/rutas';
import type { BaseDatos } from '../persistencia/db';
import type { AlmacenPeticiones } from '../persistencia/peticiones';
import type { Reloj } from '../programador/reloj';
import { cuerpoError, ErrorApi } from './errores';
import { Limitador, LIMITE_HTTP, TAMANO_MAXIMO_MENSAJE } from './limitador';

export interface DependenciasApp {
  db: BaseDatos;
  auth: Auth;
  reloj: Reloj;
  logger: Logger;
  metricas: Metricas;
  peticiones: AlmacenPeticiones;
  opcionesAuth?: OpcionesRutasAuth;
  /** Carpeta con la web compilada (producción). */
  carpetaWeb?: string;
  /** Límite de peticiones por sesión (por defecto, `LIMITE_HTTP`). */
  limiteHttp?: { capacidad: number; porSegundo: number };
}

/** Token de la cookie de sesión de Better Auth (con o sin el prefijo `__Secure-` de producción). */
export function claveSesion(cookie: string | undefined): string | null {
  if (!cookie) return null;
  for (const parte of cookie.split(';')) {
    const [nombre, ...valor] = parte.trim().split('=');
    if (nombre?.endsWith('session_token') && valor.length) return valor.join('=');
  }
  return null;
}

const CABECERA_IDEMPOTENCIA = 'idempotency-key';

export async function construirApp(deps: DependenciasApp): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: deps.logger,
    disableRequestLogging: process.env.NODE_ENV === 'test',
    bodyLimit: TAMANO_MAXIMO_MENSAJE,
  }) as unknown as FastifyInstance;

  await app.register(fastifyCookie);
  // Respuestas grandes (reproducción de partidos, research R5) comprimidas; el WebSocket, con permessage-deflate.
  await app.register(fastifyCompress, { global: true, threshold: 1024, encodings: ['br', 'gzip'] });
  await app.register(fastifyWebsocket, {
    options: { maxPayload: TAMANO_MAXIMO_MENSAJE, perMessageDeflate: { threshold: 1024 } },
  });

  // Límite de peticiones por sesión (T141). Sin sesión (registro, entrada como invitado) no se limita aquí.
  const limitador = new Limitador(deps.limiteHttp ?? LIMITE_HTTP);
  app.addHook('onRequest', async (req, reply) => {
    const sesion = claveSesion(req.headers.cookie);
    if (sesion && !limitador.permitir(sesion)) {
      return reply.code(429).send(cuerpoError('DEMASIADAS_PETICIONES', 'Demasiadas peticiones; espera un momento'));
    }
  });

  app.setErrorHandler((error: Error, req, reply) => {
    if (error instanceof ErrorApi) {
      return reply.code(error.estado).send(cuerpoError(error.codigo, error.message, error.detalles));
    }
    if (error instanceof ZodError) {
      return reply.code(400).send(cuerpoError('VALIDACION', 'Datos de entrada no válidos', { problemas: error.issues }));
    }
    if ((error as { validation?: unknown }).validation) {
      return reply.code(400).send(cuerpoError('VALIDACION', error.message));
    }
    // Errores de Fastify con su propio 4xx (cuerpo vacío o mal formado, demasiado grande…): fallo del cliente.
    const estado = (error as { statusCode?: number }).statusCode;
    if (typeof estado === 'number' && estado >= 400 && estado < 500) {
      return reply.code(estado).send(cuerpoError(estado === 413 ? 'MENSAJE_DEMASIADO_GRANDE' : 'PETICION_INVALIDA', error.message));
    }
    req.log.error({ err: error }, 'Error no controlado');
    return reply.code(500).send(cuerpoError('ERROR_INTERNO', 'Error interno del servidor'));
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) {
      return reply.code(404).send(cuerpoError('RUTA_NO_ENCONTRADA', `No existe ${req.method} ${req.url}`));
    }
    return reply.code(404).send();
  });

  // Idempotency-Key en los POST/PUT que cambian estado (FR-062): una repetición recibe la misma
  // respuesta sin volver a ejecutar la operación.
  app.addHook('preHandler', async (req, reply) => {
    const clave = req.headers[CABECERA_IDEMPOTENCIA];
    if (typeof clave !== 'string' || (req.method !== 'POST' && req.method !== 'PUT')) return;
    const guardada = (await deps.peticiones.obtener(`http:${req.url}`, clave)) as
      | { estado: number; cuerpo: unknown }
      | undefined;
    if (guardada) return reply.code(guardada.estado).header('idempotent-replay', 'true').send(guardada.cuerpo);
  });
  app.addHook('onSend', async (req, reply, cuerpo) => {
    const clave = req.headers[CABECERA_IDEMPOTENCIA];
    if (typeof clave !== 'string' || (req.method !== 'POST' && req.method !== 'PUT')) return cuerpo;
    if (reply.getHeader('idempotent-replay') || reply.statusCode >= 500) return cuerpo;
    const texto = typeof cuerpo === 'string' ? cuerpo : undefined;
    let json: unknown = texto;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      /* respuesta no JSON: se guarda como texto */
    }
    await deps.peticiones.guardar(`http:${req.url}`, clave, { estado: reply.statusCode, cuerpo: json });
    return cuerpo;
  });

  registrarRutasObservabilidad(app, deps.db, deps.metricas);
  registrarRutasAuth(app, deps.auth, deps.opcionesAuth);

  const carpetaWeb = deps.carpetaWeb ?? process.env.CARPETA_WEB ?? fileURLToPath(new URL('../../../web/dist', import.meta.url));
  if (process.env.NODE_ENV === 'production' && existsSync(carpetaWeb)) {
    await app.register(fastifyStatic, { root: carpetaWeb, wildcard: false });
    app.get('/*', (_req, reply) => reply.sendFile('index.html'));
  }

  return app;
}
