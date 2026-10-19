/** Sistema de partículas con presupuesto por fotograma (spec 003, research R21; T080). */
import { describe, expect, it } from 'vitest';
import { iniciarParticulas } from '../../src/componentes/particulas';

/** Canvas falso con un contexto 2D que no pinta nada. */
function canvasFalso() {
  const ctx = { clearRect: () => undefined, fillRect: () => undefined, globalAlpha: 1, fillStyle: '' };
  return { width: 300, height: 200, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

/** Reloj y requestAnimationFrame manuales: `fotograma(costeMs, intervaloMs)`. */
function entorno() {
  let t = 0;
  let pendiente: ((t: number) => void) | null = null;
  let costeSiguiente = 0;
  const ahora = () => {
    const v = t;
    t += costeSiguiente;
    costeSiguiente = 0;
    return v;
  };
  return {
    opciones: {
      ahora,
      pedirFotograma: (cb: (t: number) => void) => {
        pendiente = cb;
        return 1;
      },
      cancelarFotograma: () => {
        pendiente = null;
      },
    },
    fotograma(costeMs: number, intervaloMs = 16) {
      t += intervaloMs;
      const cb = pendiente;
      pendiente = null;
      // El coste se aplica entre la medida inicial y la final del fotograma.
      const inicio = t;
      cb?.(inicio);
      void costeMs;
    },
    conCoste(ms: number) {
      // El próximo `ahora()` (el inicio del fotograma) adelanta el reloj `ms`: la medida final verá ese coste.
      costeSiguiente = ms;
    },
    get hayFotograma() {
      return pendiente !== null;
    },
  };
}

describe('partículas (T080)', () => {
  it('si un fotograma supera los 6 ms de presupuesto, el máximo de partículas se reduce a la mitad', () => {
    const e = entorno();
    const s = iniciarParticulas(canvasFalso(), { ...e.opciones, maximo: 100 });
    s.emitir(10, 10, '#fff', 100);
    expect(s.estado.particulas).toBe(100);
    e.conCoste(10);
    e.fotograma(10);
    expect(s.estado.maximo).toBe(50);
    expect(s.estado.particulas).toBeLessThanOrEqual(50);
    // Un fotograma barato no cambia nada.
    e.fotograma(0);
    expect(s.estado.maximo).toBe(50);
  });

  it('por debajo de 30 fps durante 500 ms se desactiva', () => {
    const e = entorno();
    const s = iniciarParticulas(canvasFalso(), { ...e.opciones, maximo: 50 });
    s.emitir(10, 10, '#fff', 50);
    // Fotogramas cada 50 ms (20 fps) durante más de 500 ms: las partículas viven hasta 900 ms.
    for (let i = 0; i < 12 && e.hayFotograma; i++) e.fotograma(0, 50);
    expect(s.estado.activo).toBe(false);
    s.emitir(10, 10, '#fff', 10);
    expect(s.estado.particulas).toBe(0);
  });

  it('a 60 fps sigue activo', () => {
    const e = entorno();
    const s = iniciarParticulas(canvasFalso(), { ...e.opciones, maximo: 50 });
    s.emitir(10, 10, '#fff', 50);
    for (let i = 0; i < 40 && e.hayFotograma; i++) e.fotograma(0, 16);
    expect(s.estado.activo).toBe(true);
  });

  it('detener() libera el canvas y cancela la animación', () => {
    const e = entorno();
    const canvas = canvasFalso();
    const s = iniciarParticulas(canvas, e.opciones);
    s.emitir(10, 10, '#fff', 20);
    s.detener();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
    expect(e.hayFotograma).toBe(false);
    expect(s.estado.detenido).toBe(true);
    s.emitir(10, 10, '#fff', 20);
    expect(s.estado.particulas).toBe(0);
  });
});
