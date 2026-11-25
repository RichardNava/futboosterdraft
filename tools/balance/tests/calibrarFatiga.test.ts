import { parametrosActuales } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { informe, jugar, medir, ROLES } from '../src/calibrarFatiga';

describe('calibrar-fatiga (spec 018, T056)', () => {
  it('los contadores no cambian el partido', () => {
    const { estado: con, ...salidaCon } = jugar(parametrosActuales(), 0);
    const { estado: sin, ...salidaSin } = jugar(parametrosActuales(), 0, false);
    expect(salidaCon).toEqual(salidaSin);
    expect({ ...con, intensidad: undefined }).toEqual({ ...sin, intensidad: undefined });
  });

  it('es reproducible y mide minutos de tramo y acciones de cada rol', () => {
    const primera = medir(parametrosActuales(), 2);
    expect(medir(parametrosActuales(), 2)).toEqual(primera);
    for (const r of ROLES.filter((r) => r !== 'porteria')) expect(primera[r].puntos).toBeGreaterThan(0);
  });

  it('el informe da la propuesta de la última vuelta', () => {
    const medida = medir(parametrosActuales(), 1);
    const texto = informe(1, { vueltas: [{ referencia: parametrosActuales().fatiga.referenciaAcciones, medida, variacion: 0 }], convergida: true });
    expect(texto).toContain(`medio: ${Number(medida.medio.puntos.toFixed(3))}`);
    expect(texto).toContain('converge en 1 vueltas');
  });
});
