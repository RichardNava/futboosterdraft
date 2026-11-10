/** `api()` reintenta los GET cuando el servidor no responde (spec 013, FR-022; research R8). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ErrorApi } from '../../src/api/cliente';
import { useConexionServidor } from '../../src/estado/conexionServidor';

const ok = (cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: 200 });
let fetchSimulado: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchSimulado = vi.fn();
  vi.stubGlobal('fetch', fetchSimulado);
  useConexionServidor.setState({ conectando: false, desde: null });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('api(): reintento de GET', () => {
  it('reintenta ante red caída, cuerpo no JSON y 5xx sin error, con esperas 0,5 → 1 → 2 → 2 s', async () => {
    fetchSimulado
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('<html>proxy</html>', { status: 502 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(ok({ usuario: 1 }));
    const promesa = api('/api/me');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    expect(useConexionServidor.getState().conectando).toBe(true);
    await vi.advanceTimersByTimeAsync(499);
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchSimulado).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchSimulado).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchSimulado).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promesa).resolves.toEqual({ usuario: 1 });
    expect(fetchSimulado).toHaveBeenCalledTimes(5);
    expect(useConexionServidor.getState()).toEqual({ conectando: false, desde: null });
  });

  it('un POST no se reintenta', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api('/api/x', { cuerpo: {} })).rejects.toBeInstanceOf(TypeError);
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    expect(useConexionServidor.getState().conectando).toBe(false);
  });

  it('un 401 o un 4xx/5xx con el error común no se reintentan', async () => {
    const error = (estado: number) =>
      new Response(JSON.stringify({ error: { codigo: 'X', mensaje: 'm', detalles: {} } }), { status: estado });
    fetchSimulado.mockResolvedValueOnce(error(401)).mockResolvedValueOnce(error(422)).mockResolvedValueOnce(error(500));
    for (const estado of [401, 422, 500]) {
      await expect(api('/api/me')).rejects.toMatchObject({ estado, codigo: 'X' });
    }
    expect(fetchSimulado).toHaveBeenCalledTimes(3);
  });

  it('un 5xx sin error en un POST da ErrorApi', async () => {
    fetchSimulado.mockResolvedValueOnce(new Response('', { status: 502 }));
    await expect(api('/api/x', { cuerpo: {} })).rejects.toBeInstanceOf(ErrorApi);
  });
});
