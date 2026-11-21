import pino, { type DestinationStream, type Logger } from 'pino';

export type { Logger };

/** Spec 017 (FR-035): ni query strings, ni IP, ni cabeceras en el registro de peticiones. */
const serializers = {
  req: (r: { id?: unknown; method?: string; url?: string }) => ({ id: r.id, method: r.method, url: r.url?.split('?')[0] }),
  res: (r: { statusCode?: number }) => ({ statusCode: r.statusCode }),
};

const redact = {
  paths: ['headers.cookie', 'headers.authorization', 'req.headers.cookie', 'req.headers.authorization', 'password', 'token', '*.password', '*.token', '*.email'],
  censor: '[retirado]',
};

/** Logger de pino con el nivel de `LOG_LEVEL`; `destino` permite a las pruebas leer lo que se registra. */
export function crearLogger(nivel = process.env.LOG_LEVEL ?? 'info', destino?: DestinationStream): Logger {
  const opciones = { level: nivel, base: { servicio: 'futboosterdraft' }, serializers, redact };
  if (destino) return pino(opciones, destino);
  return pino({
    ...opciones,
    ...(process.env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  });
}
