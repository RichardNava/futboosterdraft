/**
 * Arranque del servidor para los ataques de la spec 017: con los límites reales o simulando producción.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RouteOptions } from 'fastify';
import pino, { type Logger } from 'pino';
import { RelojReal } from '../../src/programador/reloj';
import { crearServidor, type Servidor } from '../../src/servidor';
import { iniciarServidorPruebas } from '../helpers/app';
import type { BdPruebas } from '../helpers/bd';

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
}

/** Servidor de pruebas para lanzar ataques. En producción no admite dos a la vez: cambia `process.env`. */
export async function iniciarServidorAtaque(bd: BdPruebas, opciones: OpcionesAtaque = {}): Promise<ServidorAtaque> {
  if (!opciones.produccion) {
    return iniciarServidorPruebas(bd, undefined, {
      ...(opciones.limitesReales ? { limitesReales: true } : {}),
      ...(opciones.alRegistrarRuta ? { alRegistrarRuta: opciones.alRegistrarRuta } : {}),
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
      ...(opciones.limitesReales ? {} : { limites: { http: { capacidad: 10_000, porSegundo: 10_000 }, ws: { capacidad: 10_000, porSegundo: 10_000 } } }),
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
