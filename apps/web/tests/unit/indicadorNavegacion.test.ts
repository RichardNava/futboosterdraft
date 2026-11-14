import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearRetardoIndicador } from '../../src/componentes/IndicadorNavegacion';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('indicador global de navegación (FR-027, FR-028)', () => {
  const montar = () => {
    let visible = false;
    const r = crearRetardoIndicador((v) => (visible = v));
    return { r, visible: () => visible };
  };

  it('no aparece a 1.900 ms y aparece a 2.000 ms', () => {
    const { r, visible } = montar();
    r.seguir('/perfil');
    vi.advanceTimersByTime(1900);
    expect(visible()).toBe(false);
    vi.advanceTimersByTime(100);
    expect(visible()).toBe(true);
  });

  it('desaparece al volver a idle', () => {
    const { r, visible } = montar();
    r.seguir('/perfil');
    vi.advanceTimersByTime(2500);
    r.seguir(null);
    expect(visible()).toBe(false);
  });

  it('no aparece tras abandonar una navegación por otra', () => {
    const { r, visible } = montar();
    r.seguir('/perfil');
    vi.advanceTimersByTime(1500);
    r.seguir('/tienda');
    vi.advanceTimersByTime(1500);
    expect(visible()).toBe(false);
    r.seguir(null);
    vi.advanceTimersByTime(5000);
    expect(visible()).toBe(false);
  });
});
