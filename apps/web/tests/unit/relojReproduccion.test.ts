/**
 * Reloj de reproducción del partido 2D (SC-005, SC-006; T070).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CLAVE_VELOCIDAD, RelojReproduccion, velocidadGuardada, type Velocidad } from '../../src/campo2d/relojReproduccion';

const FPS = 60;
const CUADRO = 1000 / FPS;

/** Avanza el reloj a 60 fps durante `ms` reales desde `desde`; devuelve el instante final. */
function correr(r: RelojReproduccion, desde: number, ms: number): number {
  let t = desde;
  const fin = desde + ms;
  while (t < fin) {
    t = Math.min(fin, t + CUADRO);
    r.paso(t);
  }
  return t;
}

/** Tiempo real (ms) que tarda el reloj en pasar por cada uno de los ticks de `marcas`. */
function tiemposDePaso(r: RelojReproduccion, marcas: number[], maxMs = 10 * 60_000): number[] {
  const tiempos: number[] = [];
  let t = 0;
  r.paso(t);
  let i = 0;
  while (i < marcas.length && t < maxMs) {
    t += CUADRO;
    r.paso(t);
    while (i < marcas.length && r.tick >= marcas[i]!) {
      tiempos.push(t);
      i++;
    }
    if (r.estado === 'descanso' || r.estado === 'pre_prorroga') r.continuar();
  }
  return tiempos;
}

class AlmacenFalso {
  datos = new Map<string, string>();
  getItem(k: string) {
    return this.datos.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.datos.set(k, v);
  }
}

describe('reloj de reproducción (T070)', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new AlmacenFalso();
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('avanza 23,5, 47 y 94 ticks por segundo real a x2, x4 y x8', () => {
    for (const [v, esperado] of [
      [2, 23.5],
      [4, 47],
      [8, 94],
    ] as const) {
      const r = new RelojReproduccion({ velocidad: v });
      r.ampliar(100_000);
      r.paso(0);
      correr(r, 0, 10_000);
      expect(r.tick / 10).toBeCloseTo(esperado, 1);
    }
  });

  it('todos los minutos de juego duran lo mismo a velocidad fija (±10 %)', () => {
    for (const v of [2, 4, 8] as const) {
      const r = new RelojReproduccion({ velocidad: v });
      r.ampliar(5400);
      const marcas = Array.from({ length: 91 }, (_, i) => i * 60);
      const tiempos = tiemposDePaso(r, marcas);
      const minutos = tiempos.slice(1).map((t, i) => t - tiempos[i]!);
      const media = minutos.reduce((a, b) => a + b, 0) / minutos.length;
      for (const m of minutos) expect(Math.abs(m - media) / media).toBeLessThanOrEqual(0.1);
    }
  });

  it('con descuentos de 1 a 3 minutos, cada parte dura 2 min, 1 min y 30 s y el partido 4, 2 y 1 min (±5 %)', () => {
    for (const descuento of [1, 2, 3]) {
      const parte = (45 + descuento) * 60;
      for (const [v, parteS] of [
        [2, 120],
        [4, 60],
        [8, 30],
      ] as const) {
        const r = new RelojReproduccion({ velocidad: v });
        r.anunciarPausa(parte, 'descanso');
        r.marcarFinal(2 * parte);
        const [primera, total] = tiemposDePaso(r, [parte, 2 * parte]);
        expect(Math.abs(primera! / 1000 - parteS) / parteS).toBeLessThanOrEqual(0.05);
        expect(Math.abs(total! / 1000 - 2 * parteS) / (2 * parteS)).toBeLessThanOrEqual(0.05);
      }
    }
  });

  it('el gol detiene el reloj 2.000 ms reales a cualquier velocidad', () => {
    for (const v of [2, 4, 8] as const) {
      const r = new RelojReproduccion({ velocidad: v });
      r.ampliar(10_000);
      r.anunciarPausa(100, 'gol');
      let t = 0;
      r.paso(t);
      while (r.estado !== 'gol') r.paso((t += CUADRO));
      expect(r.tick).toBe(100);
      const inicio = t;
      while (r.estado === 'gol') {
        r.paso((t += CUADRO));
        if (r.estado === 'gol') expect(r.tick).toBe(100);
      }
      expect(t - inicio).toBeGreaterThanOrEqual(2000);
      expect(t - inicio).toBeLessThanOrEqual(2000 + 2 * CUADRO);
    }
  });

  it('el descanso y antes de la prórroga esperan a «Seguir» sin avanzar el reloj de juego', () => {
    const r = new RelojReproduccion({ velocidad: 8 });
    r.ampliar(10_000);
    r.anunciarPausa(2760, 'descanso');
    r.anunciarPausa(5520, 'pre_prorroga');
    let t = correr(r, 0, 60_000);
    expect(r.estado).toBe('descanso');
    expect(r.tick).toBe(2760);
    t = correr(r, t, 5_000);
    expect(r.tick).toBe(2760);
    r.continuar();
    t = correr(r, t, 60_000);
    expect(r.estado).toBe('pre_prorroga');
    expect(r.tick).toBe(5520);
    r.continuar();
    correr(r, t, 1_000);
    expect(r.tick).toBeGreaterThan(5520);
  });

  it('con el búfer vacío muestra «Cargando…» y, al llegar los datos, sigue a la misma velocidad sin acelerar', () => {
    const r = new RelojReproduccion({ velocidad: 4 });
    r.ampliar(100);
    let t = correr(r, 0, 5_000);
    expect(r.estado).toBe('cargando');
    expect(r.tick).toBe(100);
    t = correr(r, t, 3_000);
    expect(r.tick).toBe(100);
    r.ampliar(10_000);
    correr(r, t, 1_000);
    // Un segundo a x4: 47 ticks, nada de recuperar los 3 s de espera.
    expect(r.tick - 100).toBeCloseTo(47, 0);
  });

  it('cada lanzamiento de la tanda dura 3.000, 1.500 y 750 ms a x2, x4 y x8', () => {
    for (const [v, ms] of [
      [2, 3000],
      [4, 1500],
      [8, 750],
    ] as const) {
      const r = new RelojReproduccion({ velocidad: v });
      expect(r.duracionLanzamientoMs).toBe(ms);
      r.marcarTanda(8000);
      r.situar(0);
      r.ampliar(8000 + 60 * 10);
      r.situar(8000);
      const [a, b] = tiemposDePaso(r, [8060, 8120]);
      expect(Math.abs(b! - a! - ms)).toBeLessThanOrEqual(2 * CUADRO);
    }
  });

  it('cambiar de velocidad se aplica al instante sin cambiar el tick; durante una pausa no cambia su duración', () => {
    const r = new RelojReproduccion({ velocidad: 2 });
    r.ampliar(100_000);
    let t = correr(r, 0, 1000);
    const antes = r.tick;
    r.velocidad = 8;
    expect(r.tick).toBe(antes);
    t = correr(r, t, 1000);
    expect(r.tick - antes).toBeCloseTo(94, 0);

    r.anunciarPausa(Math.ceil(r.tick) + 10, 'gol');
    while (r.estado !== 'gol') r.paso((t += CUADRO));
    const inicio = t;
    r.velocidad = 2;
    while (r.estado === 'gol') r.paso((t += CUADRO));
    expect(t - inicio).toBeGreaterThanOrEqual(2000);
    expect(t - inicio).toBeLessThanOrEqual(2000 + 2 * CUADRO);
  });

  it('la velocidad por defecto es x2 y se recuerda la última elegida', () => {
    expect(velocidadGuardada()).toBe(2);
    expect(new RelojReproduccion().velocidad).toBe(2);
    const r = new RelojReproduccion();
    r.velocidad = 8;
    expect(globalThis.localStorage.getItem(CLAVE_VELOCIDAD)).toBe('8');
    expect(new RelojReproduccion().velocidad).toBe(8);
    // Un valor desconocido o un almacenamiento que falla: x2.
    globalThis.localStorage.setItem(CLAVE_VELOCIDAD, '32');
    expect(velocidadGuardada()).toBe(2);
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(velocidadGuardada()).toBe(2);
    const otro = new RelojReproduccion();
    otro.velocidad = 4 as Velocidad;
    expect(otro.velocidad).toBe(4);
  });

  it('informa al servidor del tick y la velocidad cada ~250 ms', () => {
    const informes: [number, number][] = [];
    const r = new RelojReproduccion({ velocidad: 4, informar: (tick, v) => informes.push([tick, v]) });
    r.ampliar(100_000);
    correr(r, 0, 2000);
    expect(informes.length).toBeGreaterThanOrEqual(7);
    expect(informes.length).toBeLessThanOrEqual(10);
    expect(informes.every(([tick, v]) => Number.isInteger(tick) && v === 4)).toBe(true);
  });
});
