/**
 * Superficie expuesta en producción (spec 017, T054): cabeceras, origen, rutas técnicas y registros.
 */
import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ServicioAvisos } from '../../src/avisos/servicio';
import { crearLogger } from '../../src/observabilidad/logger';
import { RelojReal } from '../../src/programador/reloj';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { iniciarServidorAtaque, peticionProduccion as p, registrarProduccion, URL_PUBLICA_PRODUCCION, type ServidorAtaque } from './ayudas';

const TOKEN = 'token-de-metricas-de-pruebas-0123456789';

/** Servidor SMTP mínimo que rechaza al destinatario repitiendo su dirección, como hacen los reales. */
async function smtpQueRechaza() {
  const srv = createServer((c) => {
    c.on('error', () => undefined);
    c.write('220 prueba\r\n');
    c.on('data', (d) => {
      for (const linea of d.toString().split('\r\n').filter(Boolean)) {
        if (/^RCPT/i.test(linea)) c.write(`550 5.1.1 ${linea.slice(8)} rechazado\r\n`);
        else if (/^QUIT/i.test(linea)) c.end('221 fin\r\n');
        else c.write('250 ok\r\n');
      }
    });
  });
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  return { puerto: (srv.address() as AddressInfo).port, cerrar: () => new Promise((r) => srv.close(r)) };
}

describe('superficie expuesta', () => {
  let bd: BdPruebas;
  let s: ServidorAtaque;
  const registros: string[] = [];
  const logger = crearLogger('info', { write: (linea: string) => void registros.push(linea) });

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    s = await iniciarServidorAtaque(bd, { produccion: true, metricasToken: TOKEN, logger });
  });
  afterAll(async () => {
    await s.cerrar();
    await bd.detener();
  });

  it.each(['/', '/api/catalogo/formaciones', '/api/no-existe', '/healthz'])('SEG-011: pedir %s sin las protecciones del navegador', async (ruta) => {
    const h = (await p(s.url, ruta)).respuesta.headers;
    const csp = h.get('content-security-policy')!;
    for (const d of ["default-src 'self'", "script-src 'self'", "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'"]) expect(csp).toContain(d);
    expect(csp).toContain('wss://juego.pruebas.test');
    expect(h.get('x-content-type-options')).toBe('nosniff');
    expect(h.get('referrer-policy')).toBe('no-referrer');
    expect(h.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=()');
    expect(h.get('cross-origin-opener-policy')).toBe('same-origin');
    expect(h.get('cross-origin-resource-policy')).toBe('same-origin');
    expect(h.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains');
    expect(h.get('cross-origin-embedder-policy')).toBeNull();
    expect(h.get('access-control-allow-origin')).toBeNull();
  });

  it('SEG-019: cambiar datos desde otro sitio con la sesión de la víctima', async () => {
    const u = await registrarProduccion(s.url);
    for (const origin of ['https://ajeno.test', 'null', `${URL_PUBLICA_PRODUCCION}.ajeno.test`]) {
      for (const [metodo, ruta] of [['PUT', '/api/perfil'], ['POST', '/api/auth/logout'], ['DELETE', '/api/cuenta']] as const) {
        const r = await p(s.url, ruta, { metodo, cookie: u.cookie, cabeceras: { origin }, ...(metodo === 'PUT' ? { cuerpo: { nombreEquipo: 'Robado', equipaciones: null } } : {}) });
        expect(r.estado, `${metodo} ${ruta} ${origin}`).toBe(403);
        expect(r.cuerpo.error.codigo).toBe('ORIGEN_NO_PERMITIDO');
      }
    }
    expect((await p(s.url, '/api/me', { cookie: u.cookie })).estado).toBe(200);
    expect((await p(s.url, '/api/perfil', { cookie: u.cookie })).cuerpo.nombreEquipo).toBeNull();
  });

  it('SEG-010: leer las métricas sin token o con uno incorrecto', async () => {
    expect((await p(s.url, '/metrics')).estado).toBe(404);
    expect((await p(s.url, '/metrics', { cabeceras: { authorization: 'Bearer incorrecto' } })).estado).toBe(404);
    expect((await p(s.url, '/metrics', { cabeceras: { authorization: `Basic ${TOKEN}` } })).estado).toBe(404);
    const ok = await p(s.url, '/metrics', { cabeceras: { authorization: `Bearer ${TOKEN}` } });
    expect(ok.estado).toBe(200);
    expect(String(ok.cuerpo)).toContain('partidas_activas');
  });

  it('SEG-024: deducir el estado de la base de datos por /healthz', async () => {
    const r = await p(s.url, '/healthz');
    expect(r.estado).toBe(200);
    expect(r.cuerpo).toEqual({ estado: 'ok' });
  });

  it('SEG-023: pedir rutas inexistentes y reflejar datos de la petición', async () => {
    const get = await p(s.url, '/api/no-existe');
    expect(get.estado).toBe(404);
    expect(get.cuerpo.error.codigo).toBe('RUTA_NO_ENCONTRADA');
    const post = await p(s.url, '/api/no-existe?token=reflejado', { metodo: 'POST' });
    expect(post.estado).toBe(404);
    expect(JSON.stringify(post.cuerpo)).not.toContain('reflejado');
    expect((await p(s.url, '/sitemap.xml')).estado).toBe(404);
    expect((await p(s.url, '/assets/no-existe.js')).estado).toBe(404);
    // Las pantallas de la web siguen funcionando.
    expect(String((await p(s.url, '/partidas/nueva')).cuerpo)).toContain('<!doctype html>');
  });

  it('SEG-023: usar las rutas de desarrollo en producción', async () => {
    expect((await p(s.url, '/api/dev/reloj/avanzar', { cuerpo: { ms: 1 } })).estado).toBe(404);
    expect((await p(s.url, '/api/dev/fragmentos', { cuerpo: { fragmentos: 1 } })).estado).toBe(404);
  });

  it('SEG-012: dejar tokens, contraseñas, cookies o query strings en los registros', async () => {
    const email = 'registro-secreto@pruebas.test';
    await p(s.url, '/?restablecer=VALOR-SECRETO-1');
    await p(s.url, '/api/catalogo/formaciones?secreto=VALOR-SECRETO-2');
    await p(s.url, '/api/auth/registro', { cuerpo: { email, password: 'VALOR-SECRETO-3', apodo: 'Registro' } });
    await p(s.url, '/api/auth/login', { cuerpo: { email, password: 'VALOR-SECRETO-3' }, cabeceras: { cookie: 'x=VALOR-SECRETO-4', authorization: 'Bearer VALOR-SECRETO-5' } });
    await new Promise((r) => setTimeout(r, 50));
    const texto = registros.join('');
    expect(texto).toContain('/api/catalogo/formaciones');
    expect(texto).not.toContain('VALOR-SECRETO');
    expect(texto).not.toContain(email);
  });

  it('SEG-027: guardar la dirección IP en el registro de peticiones', async () => {
    await p(s.url, '/healthz');
    await new Promise((r) => setTimeout(r, 50));
    const peticiones = registros.filter((l) => l.includes('"req"'));
    expect(peticiones.length).toBeGreaterThan(0);
    expect(peticiones.join('')).not.toMatch(/remoteAddress|127\.0\.0\.1/);
  });

  it('SEG-018: dejar el correo del destinatario en el registro de un error SMTP', async () => {
    const smtp = await smtpQueRechaza();
    const lineas: string[] = [];
    const avisos = new ServicioAvisos(
      bd.db,
      new RelojReal(),
      crearLogger('info', { write: (l: string) => void lineas.push(l) }),
      { url: `smtp://127.0.0.1:${smtp.puerto}` },
      URL_PUBLICA_PRODUCCION,
      () => undefined,
    );
    await avisos.enviarRecuperacion('destinatario-secreto@pruebas.test', `${URL_PUBLICA_PRODUCCION}/?restablecer=x`);
    await smtp.cerrar();
    expect(lineas.join('')).toContain('No se pudo enviar');
    expect(lineas.join('')).not.toContain('destinatario-secreto');
  });
});
