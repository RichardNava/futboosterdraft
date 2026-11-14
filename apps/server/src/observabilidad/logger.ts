import pino, { type Logger } from 'pino';

export type { Logger };

/** Logger de pino con el nivel de `LOG_LEVEL`. */
export function crearLogger(nivel = process.env.LOG_LEVEL ?? 'info'): Logger {
  return pino({
    level: nivel,
    base: { servicio: 'futboosterdraft' },
    ...(process.env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  });
}
