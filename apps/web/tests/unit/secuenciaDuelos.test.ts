/** Secuencia de la animación de los duelos (spec 005, T077; FR-067, SC-009). */
import { describe, expect, it } from 'vitest';
import {
  DURACION_FASE,
  DURACION_RULETA_MS,
  duracionDuelo,
  FUNDIDO_REDUCIDO_MS,
  instante,
  marcadorEn,
  puntos,
  RANGO_RULETA,
  ruletaEn,
  valorContado,
  valorRuleta,
} from '../../src/componentes/secuenciaDuelos';

describe('secuencia de duelos', () => {
  it('un duelo dura unos 2,5 s a ×1 y la mitad a ×2; el cruce completo, menos de 30 s', () => {
    expect(duracionDuelo(1)).toBe(2500);
    expect(duracionDuelo(2)).toBe(1250);
    expect(11 * duracionDuelo(1)).toBeLessThan(30_000);
  });

  it('las fases van en orden: entrada (300 ms), choque (120 ms), recuento (600 ms) y resultado', () => {
    expect(instante(0, 11, 1)).toMatchObject({ indice: 0, fase: 'entrada' });
    expect(instante(DURACION_FASE.entrada + 10, 11, 1)).toMatchObject({ indice: 0, fase: 'choque' });
    expect(instante(DURACION_FASE.entrada + DURACION_FASE.choque + 10, 11, 1)).toMatchObject({ indice: 0, fase: 'recuento' });
    expect(instante(1100, 11, 1)).toMatchObject({ indice: 0, fase: 'resultado' });
    expect(instante(2600, 11, 1)).toMatchObject({ indice: 1, fase: 'entrada' });
    expect(instante(11 * 2500, 11, 1)).toMatchObject({ indice: 11, terminado: true });
  });

  it('a ×2 cada fase dura la mitad', () => {
    expect(instante(DURACION_FASE.entrada / 2 + 5, 11, 2).fase).toBe('choque');
  });

  it('con movimiento reducido solo hay un fundido de 150 ms y el resultado', () => {
    const fases = new Set<string>();
    for (let ms = 0; ms < duracionDuelo(1, true); ms += 10) fases.add(instante(ms, 11, 1, true).fase);
    expect(fases).toEqual(new Set(['entrada', 'resultado']));
    expect(instante(FUNDIDO_REDUCIDO_MS + 1, 11, 1, true).fase).toBe('resultado');
  });

  it('el marcador cuenta cada duelo al llegar a su resultado, y saltar al final da el total', () => {
    const ganadores = ['local', 'visitante', 'nulo', 'local'] as const;
    expect(marcadorEn(ganadores, instante(500, 4, 1))).toEqual({ local: 0, visitante: 0 });
    expect(marcadorEn(ganadores, instante(1100, 4, 1))).toEqual({ local: 1, visitante: 0 });
    expect(marcadorEn(ganadores, instante(Number.MAX_SAFE_INTEGER, 4, 1))).toEqual({ local: 2, visitante: 1 });
  });

  it('las puntuaciones cuentan hasta su valor durante el recuento', () => {
    expect(valorContado(8000, instante(100, 11, 1))).toBe(0);
    const mitad = instante(DURACION_FASE.entrada + DURACION_FASE.choque + DURACION_FASE.recuento / 2, 11, 1);
    expect(valorContado(8000, mitad)).toBe(4000);
    expect(valorContado(8000, instante(1500, 11, 1))).toBe(8000);
  });

  it('las centésimas se muestran como puntos con coma', () => {
    expect(puntos(8123)).toBe('81,23');
    expect(puntos(-150)).toBe('−1,50');
    expect(puntos(7)).toBe('0,07');
  });
});

/** Ruleta del estado de forma (spec 007, FR-012; research R9). */
describe('ruleta del estado de forma', () => {
  const inicioResultado = DURACION_FASE.entrada + DURACION_FASE.choque + DURACION_FASE.recuento;

  for (const velocidad of [1, 2] as const) {
    it(`a ×${velocidad} gira al empezar el resultado y se detiene a los ${DURACION_RULETA_MS / velocidad} ms`, () => {
      const en = (ms: number) => ruletaEn(instante(inicioResultado / velocidad + ms, 11, velocidad), velocidad);
      expect(en(1).girando).toBe(true);
      expect(en(DURACION_RULETA_MS / velocidad - 5).girando).toBe(true);
      expect(en(DURACION_RULETA_MS / velocidad + 1)).toEqual({ girando: false, progreso: 1 });
      expect(ruletaEn(instante(inicioResultado / velocidad - 10, 11, velocidad), velocidad).girando).toBe(false);
    });
  }

  it('no gira con movimiento reducido ni al terminar', () => {
    expect(ruletaEn(instante(FUNDIDO_REDUCIDO_MS + 1, 11, 1, true), 1).girando).toBe(false);
    expect(ruletaEn(instante(Number.MAX_SAFE_INTEGER, 11, 1), 1).girando).toBe(false);
  });

  it('con el progreso completo muestra exactamente el valor final', () => {
    for (const final of [-200, -37, 0, 1, 150, 200, 450]) for (const semilla of [0, 3, 21]) expect(valorRuleta(final, 1, semilla)).toBe(final);
  });

  it('mientras gira, el valor queda dentro del rango posible de la forma', () => {
    for (let k = 0; k < 100; k++) {
      const v = valorRuleta(150, k / 100, 7);
      expect(Math.abs(v)).toBeLessThanOrEqual(RANGO_RULETA);
      expect(Number.isInteger(v)).toBe(true);
    }
    expect(Math.abs(valorRuleta(450, 0.5, 7))).toBeLessThanOrEqual(450);
  });

  it('es determinista con la misma semilla y cambia cada vez menos a medida que avanza', () => {
    const serie = (semilla: number) => Array.from({ length: 200 }, (_, k) => valorRuleta(80, k / 200, semilla));
    expect(serie(5)).toEqual(serie(5));
    expect(serie(5)).not.toEqual(serie(6));
    const cambios = (a: number[]) => a.slice(1).filter((v, k) => v !== a[k]).length;
    const s = serie(5);
    expect(cambios(s.slice(0, 100))).toBeGreaterThan(cambios(s.slice(100)));
  });
});
