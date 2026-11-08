/**
 * Relajación del que gana de mucho (parámetros 6.2.0; spec 012, ronda 2): con ventaja amplia, el equipo superior baja
 * la intensidad y le cuesta más marcar. Caso que la motivó: 41-5 en 5 partidos de un once de 85 contra NPC flojos.
 */
import { PARAMETROS_V6_1, PARAMETROS_V6_2, semillaDesdeTexto } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { avanzar, crearPartido } from '../src/index';
import { relajacion } from '../src/modificadores/formacionTactica';
import { equipo } from './ayudas';

const conMarcador = (local: number, visitante: number, p = PARAMETROS_V6_2) => ({ parametros: p, marcador: { local, visitante } });

describe('relajacion()', () => {
  it('sin el bloque (versiones anteriores a la 6.2.0) no hace nada', () => {
    expect(relajacion(conMarcador(6, 0, PARAMETROS_V6_1), 'local')).toBe(0);
  });

  it('crece con la ventaja desde +2 y se queda en el máximo; el que pierde no se relaja', () => {
    expect(relajacion(conMarcador(1, 0), 'local')).toBe(0);
    expect(relajacion(conMarcador(2, 0), 'local')).toBeCloseTo(0.6);
    expect(relajacion(conMarcador(4, 1), 'local')).toBeCloseTo(1.2);
    expect(relajacion(conMarcador(5, 0), 'local')).toBeCloseTo(2.4);
    expect(relajacion(conMarcador(9, 0), 'local')).toBeCloseTo(2.4);
    expect(relajacion(conMarcador(0, 5), 'local')).toBe(0);
    expect(relajacion(conMarcador(0, 3), 'visitante')).toBeCloseTo(1.2);
  });
});

describe('partidos muy desiguales', () => {
  // Un once de 88 contra uno de 70: antes, goleadas de 7 u 8 de media.
  const serie = (p: typeof PARAMETROS_V6_2, n: number) => {
    let favor = 0;
    let goleadas = 0;
    for (let i = 0; i < n; i++) {
      const motor = crearPartido({
        version: p.version,
        parametros: p,
        semilla: semillaDesdeTexto(`relajacion-${i}`),
        eliminatoria: false,
        local: equipo('fuerte', { valor: 88 }),
        visitante: equipo('debil', { valor: 70 }),
      });
      const fin = avanzar(motor, 'final');
      favor += fin.marcador.local;
      if (fin.marcador.local - fin.marcador.visitante >= 6) goleadas++;
    }
    return { media: favor / n, goleadas };
  };

  it('el fuerte marca menos que con la 6.1.0 y apenas hay diferencias de 6 goles o más', { timeout: 120_000 }, () => {
    const antes = serie(PARAMETROS_V6_1, 40);
    const ahora = serie(PARAMETROS_V6_2, 40);
    expect(ahora.media).toBeLessThan(antes.media);
    expect(ahora.media).toBeLessThanOrEqual(4.5);
    expect(ahora.goleadas).toBeLessThanOrEqual(2);
  });
});
