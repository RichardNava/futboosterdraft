import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorDe, invalidar, leer, precargar, vaciarCache } from '../../src/api/cache';

const diferido = <T,>() => {
  let resolver!: (v: T) => void;
  const promesa = new Promise<T>((r) => (resolver = r));
  return { promesa, resolver };
};

afterEach(() => vaciarCache());

describe('caché de navegación (spec 014, data-model §5)', () => {
  it('con valor no fresco lo devuelve al instante y revalida en segundo plano (salvo si se acaba de cargar)', async () => {
    await leer('/api/perfil', async () => 1);
    const noUsada = vi.fn(async () => 9);
    await expect(leer('/api/perfil', noUsada)).resolves.toBe(1);
    expect(noUsada).not.toHaveBeenCalled();
    const { caducar } = await import('../../src/api/cache');
    caducar();
    const d = diferido<number>();
    const cargar = vi.fn(() => d.promesa);
    await expect(leer('/api/perfil', cargar)).resolves.toBe(1);
    expect(cargar).toHaveBeenCalledTimes(1);
    d.resolver(2);
    await d.promesa;
    await expect(leer('/api/perfil', async () => 3)).resolves.toBe(2);
  });

  it('una sola petición en vuelo por clave', async () => {
    const d = diferido<string>();
    const cargar = vi.fn(() => d.promesa);
    const a = leer('/api/x', cargar);
    const b = leer('/api/x', cargar);
    precargar('/api/x', cargar);
    d.resolver('ok');
    await expect(Promise.all([a, b])).resolves.toEqual(['ok', 'ok']);
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('una clave fresca nunca se sirve desde un valor guardado antes (fuera de la navegación en curso)', async () => {
    vi.useFakeTimers();
    try {
      await leer('/api/saldo', async () => 10);
      vi.advanceTimersByTime(6000);
      await expect(leer('/api/saldo', async () => 20, { fresco: true })).resolves.toBe(20);
    } finally {
      vi.useRealTimers();
    }
  });

  it('invalidar(prefijo) borra las entradas', async () => {
    await leer('/api/partidas/1', async () => 'a');
    await leer('/api/partidas/2', async () => 'b');
    invalidar('/api/partidas');
    const cargar = vi.fn(async () => 'nuevo');
    await expect(leer('/api/partidas/1', cargar)).resolves.toBe('nuevo');
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('un error sin valor previo queda en error', async () => {
    await expect(leer('/api/roto', async () => Promise.reject(new Error('caída')))).rejects.toThrow('caída');
    expect(errorDe('/api/roto')?.message).toBe('caída');
  });
});

describe('dato fresco recién cargado por el loader', () => {
  it('se reutiliza durante la navegación y después se vuelve a pedir', async () => {
    vi.useFakeTimers();
    try {
      await leer('/api/sala', async () => 'v1', { fresco: true });
      const { enCache } = await import('../../src/api/cache');
      expect(enCache('/api/sala', { fresco: true })).toBe('v1');
      await expect(leer('/api/sala', async () => 'v2', { fresco: true })).resolves.toBe('v1');
      vi.advanceTimersByTime(6000);
      expect(enCache('/api/sala', { fresco: true })).toBeUndefined();
      await expect(leer('/api/sala', async () => 'v3', { fresco: true })).resolves.toBe('v3');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('tras una mutación', () => {
  it('caducar mantiene el valor para pintar pero lo revalida y no lo da por fresco', async () => {
    const { caducar } = await import('../../src/api/cache');
    await leer('/api/coleccion', async () => 'vieja');
    caducar();
    const cargar = vi.fn(async () => 'nueva');
    await expect(leer('/api/coleccion', cargar)).resolves.toBe('vieja');
    expect(cargar).toHaveBeenCalledTimes(1);
    await leer('/api/tienda', async () => 1, { fresco: true });
    caducar();
    await expect(leer('/api/tienda', async () => 2, { fresco: true })).resolves.toBe(2);
  });
});
