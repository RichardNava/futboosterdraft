/**
 * Arranque del servidor para los ataques de la spec 017: con los límites reales o simulando producción.
 */
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import type { RouteOptions } from 'fastify';
import pino, { type Logger } from 'pino';
import { RelojReal } from '../../src/programador/reloj';
import { crearServidor, type Servidor } from '../../src/servidor';
import { iniciarServidorPruebas } from '../helpers/app';
import type { BdPruebas } from '../helpers/bd';
import { peticion, type UsuarioPrueba } from '../helpers/usuarios';

export { ClienteWs } from '../helpers/clienteWs';
export { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

export const URL_PUBLICA_PRODUCCION = 'https://juego.pruebas.test';

export interface ServidorAtaque extends Servidor {
  url: string;
  urlWs: string;
  cerrar(): Promise<void>;
}

interface OpcionesAtaque {
  /** Los límites de `http/limitador.ts`, no los ampliados del resto de pruebas. */
  limitesReales?: boolean;
  /** `NODE_ENV=production` hasta `cerrar()`, con reloj real (sin `/api/dev/*`) y una web mínima. */
  produccion?: boolean;
  /** Para comprobar qué llega a los registros. */
  logger?: Logger;
  /** Recibe cada ruta registrada (inventario). */
  alRegistrarRuta?: (ruta: RouteOptions) => void;
  /** Proxies de confianza delante del servidor (`PROXIES_CONFIANZA`). */
  proxiesConfianza?: number;
  /** Token de `/metrics` en producción. */
  metricasToken?: string;
  /** Servidor SMTP para comprobar los correos que se envían (fuera de producción). */
  smtpUrl?: string;
}

type OpcionesPeticion = NonNullable<Parameters<typeof peticion>[2]>;

/** Petición con el `Origin` de la web pública de producción. */
export const peticionProduccion = (url: string, ruta: string, opciones: OpcionesPeticion = {}) =>
  peticion(url, ruta, { ...opciones, cabeceras: { origin: URL_PUBLICA_PRODUCCION, ...opciones.cabeceras } });

/** Cuenta nueva en un servidor de producción (su cookie lleva el prefijo `__Secure-`). */
export async function registrarProduccion(url: string): Promise<UsuarioPrueba> {
  const id = randomUUID();
  const r = await peticionProduccion(url, '/api/auth/registro', {
    cuerpo: { email: `${id}@pruebas.test`, password: 'contraseña-segura', apodo: `Jugador${id.slice(0, 6)}` },
  });
  if (r.estado !== 200) throw new Error(`No se pudo registrar: ${r.estado} ${JSON.stringify(r.cuerpo)}`);
  const cookie = r.respuesta.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const me = await peticionProduccion(url, '/api/me', { cookie });
  return { ...me.cuerpo.usuario, cookie };
}

/** Servidor SMTP mínimo que acepta todo y guarda cada correo tal como llega. */
export async function smtpDePruebas() {
  const correos: string[] = [];
  const srv = createServer((c) => {
    let datos: string | null = null;
    c.on('error', () => undefined);
    c.write('220 prueba\r\n');
    c.on('data', (d) => {
      if (datos !== null) {
        datos += d.toString();
        if (datos.endsWith('\r\n.\r\n')) {
          correos.push(datos);
          datos = null;
          c.write('250 ok\r\n');
        }
        return;
      }
      for (const linea of d.toString().split('\r\n').filter(Boolean)) {
        if (/^DATA/i.test(linea)) {
          datos = '';
          c.write('354 adelante\r\n');
        } else if (/^QUIT/i.test(linea)) c.end('221 fin\r\n');
        else c.write('250 ok\r\n');
      }
    });
  });
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  return {
    url: `smtp://127.0.0.1:${(srv.address() as AddressInfo).port}`,
    correos,
    cerrar: () => new Promise((r) => srv.close(r)),
  };
}

/** Token del último enlace de recuperación (espera hasta 3 s: el envío no bloquea la respuesta). */
export async function tokenRecuperacion(bd: BdPruebas): Promise<string> {
  for (let i = 0; i < 60; i++) {
    const filas = await bd.db.execute<{ identificador: string }>(
      sql`select identificador from verificaciones where identificador like 'reset-password:%' order by expira_en desc limit 1`,
    );
    const fila = filas.rows[0];
    if (fila) return fila.identificador.slice('reset-password:'.length);
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('No se generó el enlace de recuperación');
}

/** Servidor de pruebas para lanzar ataques. En producción no admite dos a la vez: cambia `process.env`. */
export async function iniciarServidorAtaque(bd: BdPruebas, opciones: OpcionesAtaque = {}): Promise<ServidorAtaque> {
  if (!opciones.produccion) {
    return iniciarServidorPruebas(bd, undefined, {
      ...(opciones.limitesReales ? { limitesReales: true } : {}),
      ...(opciones.alRegistrarRuta ? { alRegistrarRuta: opciones.alRegistrarRuta } : {}),
      ...(opciones.proxiesConfianza === undefined ? {} : { proxiesConfianza: opciones.proxiesConfianza }),
      ...(opciones.smtpUrl ? { smtpUrl: opciones.smtpUrl } : {}),
    });
  }

  const entorno = { nodeEnv: process.env.NODE_ENV, carpetaWeb: process.env.CARPETA_WEB };
  const carpetaWeb = mkdtempSync(join(tmpdir(), 'fbd-web-'));
  writeFileSync(join(carpetaWeb, 'index.html'), '<!doctype html><title>web</title>');
  const restaurar = () => {
    for (const [clave, valor] of [['NODE_ENV', entorno.nodeEnv], ['CARPETA_WEB', entorno.carpetaWeb]] as const) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
    rmSync(carpetaWeb, { recursive: true, force: true });
  };
  process.env.NODE_ENV = 'production';
  process.env.CARPETA_WEB = carpetaWeb;

  try {
    const servidor = await crearServidor({
      db: bd.db,
      reloj: new RelojReal(),
      secreto: 'secreto-de-pruebas-suficientemente-largo-123',
      urlPublica: URL_PUBLICA_PRODUCCION,
      logger: opciones.logger ?? pino({ level: 'silent' }),
      hilosSimulacion: 0,
      ...(opciones.alRegistrarRuta ? { alRegistrarRuta: opciones.alRegistrarRuta } : {}),
      limitesDesactivados: !opciones.limitesReales,
      ...(opciones.proxiesConfianza === undefined ? {} : { proxiesConfianza: opciones.proxiesConfianza }),
      ...(opciones.metricasToken ? { metricasToken: opciones.metricasToken } : {}),
    });
    await servidor.app.listen({ port: 0, host: '127.0.0.1' });
    const { port } = servidor.app.server.address() as AddressInfo;
    return {
      ...servidor,
      url: `http://127.0.0.1:${port}`,
      urlWs: `ws://127.0.0.1:${port}`,
      async cerrar() {
        await servidor.app.close();
        restaurar();
      },
    };
  } catch (e) {
    restaurar();
    throw e;
  }
}
