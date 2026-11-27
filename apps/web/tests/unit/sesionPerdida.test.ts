/** Sesión retirada por el servidor (spec 017, contracts/ui.md): vuelve a la portada con el aviso, desde cualquier pantalla. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../src/api/cliente';
import { useAvisos } from '../../src/estado/avisos';
import { usePartidaActiva } from '../../src/estado/partidaActiva';
import { useSesion } from '../../src/estado/sesion';

const error = (estado: number, codigo: string) => new Response(JSON.stringify({ error: { codigo, mensaje: 'x', detalles: {} } }), { status: estado });
const usuario = { id: 'u', tipo: 'registrado' as const, apodo: 'Ana', email: 'a@pruebas.test', rol: 'jugador' as const };

beforeEach(() => {
  useAvisos.setState({ avisos: [] });
  useSesion.setState({ usuario });
  usePartidaActiva.setState({ partidaId: 'p' });
});
afterEach(() => vi.unstubAllGlobals());

describe('sesión perdida', () => {
  it('un 401 SIN_SESION cierra la sesión, olvida la partida y avisa una vez', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => error(401, 'SIN_SESION')));
    await expect(api('/api/coleccion')).rejects.toThrow();
    await expect(api('/api/tienda')).rejects.toThrow();
    expect(useSesion.getState().usuario).toBeNull();
    expect(usePartidaActiva.getState().partidaId).toBeNull();
    expect(useAvisos.getState().avisos.map((a) => a.texto)).toEqual(['Tu sesión ha terminado']);
  });

  it('una contraseña incorrecta o un 403 no cierran la sesión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(error(401, 'INVALID_EMAIL_OR_PASSWORD')).mockResolvedValueOnce(error(403, 'SOLO_ADMINISTRADORES')));
    await expect(api('/api/auth/login', { cuerpo: {} })).rejects.toThrow();
    await expect(api('/api/admin/cuentas')).rejects.toThrow();
    expect(useSesion.getState().usuario).toEqual(usuario);
    expect(useAvisos.getState().avisos).toEqual([]);
  });

  it('sin sesión previa, un 401 no muestra ningún aviso', async () => {
    useSesion.setState({ usuario: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(error(401, 'SIN_SESION')));
    await expect(api('/api/me')).rejects.toThrow();
    expect(useAvisos.getState().avisos).toEqual([]);
  });
});
