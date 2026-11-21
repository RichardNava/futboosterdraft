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
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest, type RouteOptions } from 'fastify';
import { ZodError } from 'zod';
import type { Auth } from '../auth/auth';
import { registrarRutasAuth, type OpcionesRutasAuth } from '../auth/rutas';
import type { Logger } from '../observabilidad/logger';
import type { Metricas } from '../observabilidad/metricas';
import { registrarRutasObservabilidad } from '../observabilidad/rutas';
import type { BaseDatos } from '../persistencia/db';
import type { AlmacenPeticiones } from '../persistencia/peticiones';
import type { Reloj } from '../programador/reloj';
import { registrarCabeceras } from './cabeceras';
import { cuerpoError, ErrorApi, errores } from './errores';
import { claveCliente, Limitador, LIMITE_HTTP, LIMITE_IP, SIN_LIMITE, TAMANO_MAXIMO_MENSAJE } from './limitador';

interface DependenciasApp {
  db: BaseDatos;
  auth: Auth;
  reloj: Reloj;
  logger: Logger;
  metricas: Metricas;
  peticiones: AlmacenPeticiones;
  /** Única web desde la que un navegador puede cambiar datos (spec 017, FR-030). */
  urlPublica: string;
  opcionesAuth?: OpcionesRutasAuth;
  /** Carpeta con la web compilada (producción). */
  carpetaWeb?: string;
  /** Sin límites de uso: pruebas y prueba de carga (el arranque lo rechaza en producción). */
  limitesDesactivados?: boolean;
  /** Proxies delante del servidor (`PROXIES_CONFIANZA`): con 0 no se lee `X-Forwarded-For`. */
  proxiesConfianza?: number;
  /** Token de `/metrics` en producción. */
  metricasToken?: string;
  /** Recibe cada ruta registrada: la prueba del inventario de la spec 017 la compara con `inventario.json`. */
  alRegistrarRuta?: (ruta: RouteOptions) => void;
}

const CABECERA_IDEMPOTENCIA = 'idempotency-key';
const LARGO_MAXIMO_CLAVE = 128;
const METODOS_ESCRITURA = new Set(['POST', 'PUT', 'DELETE']);

/** Clave de reintento de un POST o PUT, si la trae. */
function claveIdempotencia(req: FastifyRequest): string | undefined {
  const clave = req.headers[CABECERA_IDEMPOTENCIA];
  return typeof clave === 'string' && (req.method === 'POST' || req.method === 'PUT') ? clave : undefined;
}

const ambitoHttp = (req: FastifyRequest, usuarioId: string) => `http:${usuarioId}:${req.method}:${req.url.split('?')[0]}`;

const demasiadas = (reply: FastifyReply) => reply.code(429).send(cuerpoError('DEMASIADAS_PETICIONES', 'Demasiadas peticiones; espera un momento'));

/** Aplicación Fastify con todas las rutas, los ganchos de sesión y el formato de error común. */
export async function construirApp(deps: DependenciasApp): Promise<FastifyInstance> {
  const proxies = deps.proxiesConfianza ?? 0;
  const app = Fastify({
    loggerInstance: deps.logger,
    disableRequestLogging: process.env.NODE_ENV === 'test',
    bodyLimit: TAMANO_MAXIMO_MENSAJE,
    // Solo se confía en los `proxies` últimos saltos: lo que el cliente añada antes en X-Forwarded-For no cuenta (FR-014).
    trustProxy: proxies > 0 ? (_direccion, salto) => salto < proxies : false,
  }) as unknown as FastifyInstance;
  if (deps.alRegistrarRuta) app.addHook('onRoute', deps.alRegistrarRuta);

  await app.register(fastifyCookie);
  registrarCabeceras(app, deps.urlPublica);

  // Antes que la compresión: aquí la respuesta aún es texto y se puede guardar para los reintentos (FR-025).
  app.addHook('onSend', async (req, reply, cuerpo) => {
    const clave = claveIdempotencia(req);
    if (!clave || clave.length > LARGO_MAXIMO_CLAVE || !req.usuario || reply.getHeader('idempotent-replay')) return cuerpo;
    if (reply.statusCode < 200 || reply.statusCode >= 300) return cuerpo;
    const texto = typeof cuerpo === 'string' ? cuerpo : undefined;
    let json: unknown = texto;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      /* respuesta no JSON: se guarda como texto */
    }
    await deps.peticiones.guardar(ambitoHttp(req, req.usuario.id), clave, { estado: reply.statusCode, cuerpo: json });
    return cuerpo;
  });

  // Respuestas grandes (reproducción de partidos, research R5) comprimidas; el WebSocket, con permessage-deflate.
  await app.register(fastifyCompress, { global: true, threshold: 1024, encodings: ['br', 'gzip'] });
  await app.register(fastifyWebsocket, {
    options: { maxPayload: TAMANO_MAXIMO_MENSAJE, perMessageDeflate: { threshold: 1024 } },
  });

  // Antes de leer nada: límite por cliente, también sin sesión (FR-013), y peticiones de otros sitios (FR-030).
  const limiteIp = new Limitador(deps.limitesDesactivados ? SIN_LIMITE : LIMITE_IP);
  const origenPublico = new URL(deps.urlPublica).origin;
  app.addHook('onRequest', async (req, reply) => {
    if (req.url.startsWith('/api/') && !limiteIp.permitir(claveCliente(req.ip))) return demasiadas(reply);
    const origen = req.headers.origin;
    if (origen && METODOS_ESCRITURA.has(req.method) && origen !== origenPublico) {
      return reply.code(403).send(cuerpoError('ORIGEN_NO_PERMITIDO', 'Esta petición no procede de la web del juego'));
    }
  });

  // Después de la sesión de cada ruta: límite por usuario real y respuesta guardada solo para esa cuenta (FR-025).
  const limiteUsuario = new Limitador(deps.limitesDesactivados ? SIN_LIMITE : LIMITE_HTTP);
  const trasSesion = async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.usuario && !limiteUsuario.permitir(req.usuario.id)) return demasiadas(reply);
    const clave = claveIdempotencia(req);
    if (!clave) return;
    if (clave.length > LARGO_MAXIMO_CLAVE) throw errores.validacion('CLAVE_INVALIDA', `La clave de reintento admite ${LARGO_MAXIMO_CLAVE} caracteres como máximo`);
    if (!req.usuario) return;
    const guardada = (await deps.peticiones.obtener(ambitoHttp(req, req.usuario.id), clave)) as { estado: number; cuerpo: unknown } | undefined;
    if (guardada) return reply.code(guardada.estado).header('idempotent-replay', 'true').send(guardada.cuerpo);
  };
  app.addHook('onRoute', (ruta) => {
    if (!ruta.url.startsWith('/api/')) return;
    // Fastify copia las opciones del GET en su HEAD: sin esta comprobación, el gancho se añadiría dos veces.
    const previos = [ruta.preHandler ?? []].flat();
    if (!previos.includes(trasSesion)) ruta.preHandler = [...previos, trasSesion];
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
      return reply.code(404).send(cuerpoError('RUTA_NO_ENCONTRADA', 'Esa ruta no existe'));
    }
    return reply.code(404).send();
  });

  registrarRutasObservabilidad(app, deps.db, deps.metricas, deps.metricasToken);
  registrarRutasAuth(app, deps.auth, deps.opcionesAuth);

  const carpetaWeb = deps.carpetaWeb ?? process.env.CARPETA_WEB ?? fileURLToPath(new URL('../../../web/dist', import.meta.url));
  if (process.env.NODE_ENV === 'production' && existsSync(carpetaWeb)) {
    await app.register(fastifyStatic, { root: carpetaWeb, wildcard: false });
    app.get('/*', (req, reply) => {
      const ruta = req.url.split('?')[0]!;
      // Las pantallas no tienen extensión: una API o un fichero que no existen son un 404, no la web (SEG-023).
      if (ruta.startsWith('/api/') || /\.[^/]+$/.test(ruta)) return reply.callNotFound();
      return reply.sendFile('index.html');
    });
  }

  return app;
}
