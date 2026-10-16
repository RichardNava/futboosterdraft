import pino, { type Logger } from 'pino';

export type { Logger };

export function crearLogger(nivel = process.env.LOG_LEVEL ?? 'info'): Logger {
  return pino({
    level: nivel,
    base: { servicio: 'futboosterdraft' },
    ...(process.env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  });
}

/** Logger hijo con el contexto de una partida y, opcionalmente, de una petición. */
export function loggerDePartida(base: Logger, partidaId: string, requestId?: string): Logger {
  return base.child(requestId ? { partidaId, requestId } : { partidaId });
}
