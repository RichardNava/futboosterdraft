import { describe, expect, it } from 'vitest';
import { tacticaPorDefecto, validarTactica } from '../../src/equipo/tactica';

describe('táctica (FR-029, FR-030)', () => {
  it('valores por defecto', () => {
    expect(tacticaPorDefecto()).toEqual({
      sistemaDefensivo: 'zona',
      alturaBloque: 'medio',
      lineaAdelantada: false,
      estiloConBalon: 'equilibrado',
      juegoVertical: false,
    });
    expect(validarTactica(tacticaPorDefecto())).toEqual([]);
  });

  it('Línea adelantada no es compatible con Catenaccio', () => {
    const errores = validarTactica({ ...tacticaPorDefecto(), alturaBloque: 'catenaccio', lineaAdelantada: true });
    expect(errores.map((e) => e.codigo)).toEqual(['TACTICA_INCOMPATIBLE']);
  });

  it('Juego vertical no es compatible con Juego combinativo', () => {
    const errores = validarTactica({ ...tacticaPorDefecto(), estiloConBalon: 'combinativo', juegoVertical: true });
    expect(errores.map((e) => e.codigo)).toEqual(['TACTICA_INCOMPATIBLE']);
  });

  it('el resto de combinaciones son válidas', () => {
    expect(
      validarTactica({
        sistemaDefensivo: 'individual',
        alturaBloque: 'presion_alta',
        lineaAdelantada: true,
        estiloConBalon: 'contraataque',
        juegoVertical: true,
      }),
    ).toEqual([]);
  });

  it('rechaza valores desconocidos', () => {
    expect(validarTactica({ ...tacticaPorDefecto(), alturaBloque: 'muy_alta' as never }).length).toBeGreaterThan(0);
  });
});
