/** Pulsación larga de los nombres recortados (spec 004, Edge Cases, research R9). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearDetectorPulsacion } from '../../src/componentes/NombreRecortado';

const toque = (x = 100, y = 100) => ({ pointerType: 'touch', clientX: x, clientY: y });

describe('crearDetectorPulsacion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispara a los 500 ms si el dedo no se mueve', () => {
    const alDisparar = vi.fn();
    const d = crearDetectorPulsacion({ retardoMs: 500, toleranciaPx: 10, alDisparar });
    d.bajar(toque());
    vi.advanceTimersByTime(499);
    expect(alDisparar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(alDisparar).toHaveBeenCalledTimes(1);
  });

  it('se cancela si el dedo se mueve más de 10 px', () => {
    const alDisparar = vi.fn();
    const d = crearDetectorPulsacion({ retardoMs: 500, toleranciaPx: 10, alDisparar });
    d.bajar(toque(100, 100));
    d.mover(toque(105, 105));
    vi.advanceTimersByTime(200);
    d.mover(toque(112, 100));
    vi.advanceTimersByTime(500);
    expect(alDisparar).not.toHaveBeenCalled();
  });

  it('se cancela si se levanta el dedo antes de tiempo', () => {
    const alDisparar = vi.fn();
    const d = crearDetectorPulsacion({ retardoMs: 500, toleranciaPx: 10, alDisparar });
    d.bajar(toque());
    vi.advanceTimersByTime(300);
    d.subir();
    vi.advanceTimersByTime(500);
    expect(alDisparar).not.toHaveBeenCalled();
    expect(d.anularClic()).toBe(false);
  });

  it('tras disparar, el clic siguiente se anula una sola vez', () => {
    const d = crearDetectorPulsacion({ retardoMs: 500, toleranciaPx: 10, alDisparar: () => undefined });
    d.bajar(toque());
    vi.advanceTimersByTime(500);
    d.subir();
    expect(d.anularClic()).toBe(true);
    expect(d.anularClic()).toBe(false);
  });

  it('ignora el ratón y el lápiz', () => {
    const alDisparar = vi.fn();
    const d = crearDetectorPulsacion({ retardoMs: 500, toleranciaPx: 10, alDisparar });
    d.bajar({ pointerType: 'mouse', clientX: 0, clientY: 0 });
    d.bajar({ pointerType: 'pen', clientX: 0, clientY: 0 });
    vi.advanceTimersByTime(1000);
    expect(alDisparar).not.toHaveBeenCalled();
    expect(d.anularClic()).toBe(false);
  });
});
