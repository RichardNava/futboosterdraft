/**
 * Protecciones del navegador en todas las respuestas (spec 017, R9, FR-029; contracts/seguridad.md).
 */
import type { FastifyInstance } from 'fastify';

/** Cabeceras exactas para la web pública `urlPublica`. */
export function cabecerasSeguridad(urlPublica: string, produccion: boolean): Record<string, string> {
  const url = new URL(urlPublica);
  const ws = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
  return {
    'content-security-policy': `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' ${ws}; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    ...(produccion ? { 'strict-transport-security': 'max-age=31536000; includeSubDomains' } : {}),
  };
}

/** Añade las cabeceras a cada respuesta, también a errores y ficheros estáticos. */
export function registrarCabeceras(app: FastifyInstance, urlPublica: string): void {
  const cabeceras = cabecerasSeguridad(urlPublica, process.env.NODE_ENV === 'production');
  app.addHook('onSend', async (_req, reply, cuerpo) => {
    reply.headers(cabeceras);
    return cuerpo;
  });
}
