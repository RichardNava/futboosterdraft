import { ALTURAS_BLOQUE, DEMARCACIONES, ESTILOS_CON_BALON, SISTEMAS_DEFENSIVOS, tacticaPorDefecto, validarTactica } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { informe, medirTactica, TACTICAS } from '../src/lineaBase';

const completas = TACTICAS.map((t) => ({ ...tacticaPorDefecto(), ...t.tactica }));

describe('línea base (spec 018, T003)', () => {
  it('es reproducible con las mismas semillas, salvo el coste, y mide energía de cada rol', () => {
    const medir = () => TACTICAS.slice(0, 2).map((t) => ({ ...medirTactica(t, 4), msPorPartido: 0 }));
    const primera = medir();
    expect(medir()).toEqual(primera);
    for (const minuto of [45, 75, 90] as const) {
      for (const d of DEMARCACIONES) expect(primera[0]!.energia[minuto][d]).toBeGreaterThan(0);
    }
  });

  it('cubre todas las opciones tácticas con combinaciones válidas', () => {
    for (const t of completas) expect(validarTactica(t)).toEqual([]);
    for (const v of SISTEMAS_DEFENSIVOS) expect(completas.some((t) => t.sistemaDefensivo === v)).toBe(true);
    for (const v of ALTURAS_BLOQUE) expect(completas.some((t) => t.alturaBloque === v)).toBe(true);
    for (const v of ESTILOS_CON_BALON) expect(completas.some((t) => t.estiloConBalon === v)).toBe(true);
    expect(completas.some((t) => t.lineaAdelantada)).toBe(true);
    expect(completas.some((t) => t.juegoVertical)).toBe(true);
  });

  it('registra commit, Node, semillas y número de partidos', () => {
    const texto = informe([medirTactica(TACTICAS[0]!, 2)], { version: '8.0.0', commit: 'abc1234', motorSinCambios: true, node: 'v22.0.0', n: 2 });
    for (const dato of ['abc1234', 'v22.0.0', 'linea-base:1', 'linea-base:2', '**Partidos por táctica**: 2']) expect(texto).toContain(dato);
  });
});
