/** Calendario de la apertura del sobre (spec 003, FR-011, research R21). */
import { describe, expect, it } from 'vitest';
import { calendarioApertura, DURACION_MAXIMA_MS, DURACION_SOBRE_MS, ESCALONADO_MS } from '../../src/componentes/AperturaSobre';
import type { CartaResumen } from '../../src/componentes/CartaJugador';

const carta = (i: number, nivel: string) => ({ id: `c${i}`, nivel }) as unknown as CartaResumen;
const sobre = (especiales: number) => Array.from({ length: 8 }, (_, i) => carta(i, i < especiales ? 'GOAT' : 'Comun'));

describe('calendario de la apertura', () => {
  it('sin especiales, las cartas salen escalonadas cada 250 ms tras el sobre', () => {
    const { pasos, total } = calendarioApertura(sobre(0));
    expect(pasos.map((p) => p.salida)).toEqual(Array.from({ length: 8 }, (_, i) => DURACION_SOBRE_MS + i * ESCALONADO_MS));
    expect(total).toBeLessThan(5000);
  });

  it('con dos especiales (el caso de R21), unos 7,1 s o menos', () => {
    expect(calendarioApertura(sobre(2)).total).toBeLessThanOrEqual(7200);
  });

  it('en cualquier caso, ≤ 8 s', () => {
    for (let n = 0; n <= 8; n++) expect(calendarioApertura(sobre(n)).total).toBeLessThanOrEqual(DURACION_MAXIMA_MS);
  });
});
