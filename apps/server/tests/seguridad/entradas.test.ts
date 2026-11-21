/**
 * Ataques de entrada (spec 017, T069, FR-031, FR-032, FR-039): código en nombres, inyección y correos.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ServicioAvisos } from '../../src/avisos/servicio';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearRegistrado, iniciarServidorAtaque, peticion, type ServidorAtaque } from './ayudas';

const MALICIOSOS = ['<img src=x onerror=1>', '<script>x</script>', 'ab\u0000cd', 'ab\u0007cd', 'ab‮cd', 'ab⁦cd'];

describe('entradas', () => {
  let bd: BdPruebas;
  let s: ServidorAtaque;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    s = await iniciarServidorAtaque(bd);
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await s.cerrar();
    await bd.detener();
  });

  it.each(MALICIOSOS)('SEG-026: poner %j como nombre de equipo en la partida y en el perfil', async (nombre) => {
    const u = await crearRegistrado(s.url);
    const p = await peticion(s.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    const partida = await peticion(s.url, `/api/partidas/${p.cuerpo.id}/nombre-equipo`, { metodo: 'PUT', cookie: u.cookie, cuerpo: { nombre } });
    expect(partida.estado).toBe(422);
    expect(partida.cuerpo.error.codigo).toBe('NOMBRE_INVALIDO');
    const perfil = await peticion(s.url, '/api/perfil', { metodo: 'PUT', cookie: u.cookie, cuerpo: { nombreEquipo: nombre, equipaciones: null } });
    expect(perfil.estado).toBe(422);
  });

  it.each(MALICIOSOS)('SEG-026: registrarse con el apodo %j', async (apodo) => {
    const r = await peticion(s.url, '/api/auth/registro', { cuerpo: { email: `apodo${Math.random()}@pruebas.test`, password: 'contraseña-segura', apodo } });
    expect(r.estado).toBe(400);
    expect(r.cuerpo.error.codigo).toBe('APODO_INVALIDO');
  });

  it('SEG-026: los nombres con acentos y emojis siguen siendo válidos', async () => {
    const u = await crearRegistrado(s.url, 'Ñandú Fútbol');
    const p = await peticion(s.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    const r = await peticion(s.url, `/api/partidas/${p.cuerpo.id}/nombre-equipo`, { metodo: 'PUT', cookie: u.cookie, cuerpo: { nombre: 'Los Ñandúes ⚽ 👨‍👩‍👧' } });
    expect(r.estado).toBe(200);
  });

  it.each(["'%20OR%201=1--", "1;DROP%20TABLE%20usuarios", '%00', '..%2F..%2Fetc'])('SEG-000: inyectar %s en un identificador', async (id) => {
    const u = await crearRegistrado(s.url);
    for (const ruta of [`/api/partidas/${id}`, `/api/partidos/${id}`, `/api/catalogo/jugadores/${id}`]) {
      const r = await peticion(s.url, ruta, { cookie: u.cookie });
      expect(r.estado, ruta).toBeGreaterThanOrEqual(400);
      expect(r.estado, ruta).toBeLessThan(500);
    }
  });

  it('SEG-000: inyectar cabeceras de correo al registrarse o recuperar', async () => {
    const email = 'a@pruebas.test\r\nBcc: victima@pruebas.test';
    expect((await peticion(s.url, '/api/auth/registro', { cuerpo: { email, password: 'contraseña-segura', apodo: 'Inyector' } })).estado).toBe(400);
    const envio = vi.spyOn(ServicioAvisos.prototype, 'enviarRecuperacion');
    await peticion(s.url, '/api/auth/recuperar', { cuerpo: { email } });
    await new Promise((r) => setTimeout(r, 100));
    expect(envio).not.toHaveBeenCalled();
  });

  it('SEG-000: falsificar Host para que el enlace de recuperación apunte a otra web', async () => {
    const u = await crearRegistrado(s.url);
    const envio = vi.spyOn(ServicioAvisos.prototype, 'enviarRecuperacion').mockResolvedValue();
    await s.app.inject({
      method: 'POST',
      url: '/api/auth/recuperar',
      headers: { host: 'ajeno.test', 'x-forwarded-host': 'ajeno.test', origin: 'http://localhost:5173' },
      payload: { email: u.email },
    });
    await vi.waitFor(() => expect(envio).toHaveBeenCalled());
    expect(envio.mock.calls[0]![1]).toMatch(/^http:\/\/localhost:5173\/\?restablecer=/);
  });
});
