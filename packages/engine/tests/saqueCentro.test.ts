/**
 * Saque de centro tras un gol (hallazgo H8 de la validación de la spec 003): el equipo que recibe el gol saca desde el
 * centro del campo, nunca desde su portería.
 */
import { describe, expect, it } from 'vitest';
import { avanzar } from '../src/index';
import { partido } from './ayudas';

/** Centro del campo en las unidades de los fotogramas (décimas de metro / 10). */
const CENTRO = { x: 500, y: 320 };

describe('saque de centro tras un gol (H8)', () => {
  it('el saque que sigue a cada gol empieza y termina con el balón en el centro del campo', () => {
    let comprobados = 0;
    for (let i = 0; i < 12 && comprobados < 6; i++) {
      const r = avanzar(partido(`saque-centro-${i}`), 'final', { fotogramas: true });
      const porTick = new Map((r.fotogramas ?? []).map((f) => [f[0]!, f]));
      for (const gol of r.estado.eventos.filter((e) => e.tipo === 'gol' && e.tick < 5300)) {
        // La primera acción tras el gol (que no sea el propio tiro) es el saque del equipo que lo recibió.
        const saque = r.estado.acciones.find((a) => a.inicioTick >= gol.tick && a.tipo !== 'tiro');
        if (!saque) continue;
        expect(saque.tipo, `tick ${gol.tick}`).toBe('saque');
        // Ni al empezar ni al terminar el saque el balón está lejos del centro (antes salía desde la portería).
        for (const tick of [saque.inicioTick, saque.finTick]) {
          const f = porTick.get(tick);
          expect(f, `fotograma ${tick}`).toBeDefined();
          const [, bx, by] = f!;
          expect(Math.abs(bx! - CENTRO.x), `balón en el tick ${tick} del saque: ${bx}, ${by}`).toBeLessThanOrEqual(15);
          expect(Math.abs(by! - CENTRO.y)).toBeLessThanOrEqual(15);
        }
        comprobados++;
      }
    }
    expect(comprobados).toBeGreaterThan(0);
  });
});
