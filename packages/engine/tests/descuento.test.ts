/**
 * Descuento acotado (research R2; FR-025; T068): entre 1 y 3 minutos en cada parte reglamentaria, para que
 * un partido dure 4, 2 y 1 minuto reales a x2, x4 y x8 con un margen de ±5 %.
 */
import { describe, expect, it } from 'vitest';
import { avanzar, crearPartido } from '../src/index';
import { entrada } from './ayudas';

describe('descuento acotado (T068)', () => {
  it('en 500 partidos, el descuento de cada parte reglamentaria está entre 60 y 180 s', () => {
    for (let i = 0; i < 500; i++) {
      let estado = crearPartido(entrada(`descuento-${i}`));
      const descuentos: number[] = [];
      for (let k = 0; k < 6 && estado.fase !== 'finalizado'; k++) {
        const r = avanzar(estado, 'parte');
        if (r.estado.reloj.parte <= 2 && r.estado.reloj.descuento !== null && (r.fase === 'descanso' || r.fase === 'finalizado')) {
          descuentos.push(r.estado.reloj.descuento);
        }
        estado = r.estado;
        if (estado.derrotaPorInferioridad) break;
      }
      for (const d of descuentos) {
        expect(d).toBeGreaterThanOrEqual(estado.parametros.reproduccion.descuentoMinS);
        expect(d).toBeLessThanOrEqual(estado.parametros.reproduccion.descuentoMaxS);
      }
    }
  });
});
