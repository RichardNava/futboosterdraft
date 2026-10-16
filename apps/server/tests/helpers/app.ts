/**
 * Servidor de pruebas escuchando en un puerto libre, con `RelojFalso`.
 */
import type { AddressInfo } from 'node:net';
import pino from 'pino';
import { RelojFalso } from '../../src/programador/reloj';
import { crearServidor, type Servidor } from '../../src/servidor';
import type { BdPruebas } from './bd';

export interface ServidorPruebas extends Servidor {
  reloj: RelojFalso;
  url: string;
  urlWs: string;
  cerrar(): Promise<void>;
}

export async function iniciarServidorPruebas(
  bd: BdPruebas,
  inicio = Date.UTC(2026, 9, 15, 10),
  opciones: { smtpUrl?: string } = {},
): Promise<ServidorPruebas> {
  const reloj = new RelojFalso(inicio);
  const servidor = await crearServidor({
    db: bd.db,
    reloj,
    secreto: 'secreto-de-pruebas-suficientemente-largo-123',
    urlPublica: 'http://localhost:5173',
    logger: pino({ level: process.env.LOG_PRUEBAS ?? 'silent' }),
    ...(opciones.smtpUrl ? { smtpUrl: opciones.smtpUrl } : {}),
    // Las pruebas consultan el estado en bucle: los límites por sesión se prueban aparte (tests/unit).
    limites: { http: { capacidad: 10_000, porSegundo: 10_000 }, ws: { capacidad: 10_000, porSegundo: 10_000 } },
  });
  await servidor.app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = servidor.app.server.address() as AddressInfo;
  return {
    ...servidor,
    reloj,
    url: `http://127.0.0.1:${port}`,
    urlWs: `ws://127.0.0.1:${port}`,
    async cerrar() {
      await servidor.app.close();
    },
  };
}
