import { beforeEach, describe, expect, it } from 'vitest';
import { configurarDesglose, contarConsulta, fase, medir, renombrar } from '../../src/observabilidad/desglose';
import { crearMetricas, type Metricas } from '../../src/observabilidad/metricas';

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Suma observada de `operacion_fase_ms` por `operacion:fase` (con una observación, su valor). */
async function fases(m: Metricas): Promise<Record<string, number>> {
  const { values } = await m.operacionFaseMs.get();
  const r: Record<string, number> = {};
  for (const v of values) {
    if (v.metricName === 'operacion_fase_ms_sum') r[`${v.labels.operacion}:${v.labels.fase}`] = v.value;
  }
  return r;
}

async function consultas(m: Metricas): Promise<Record<string, number>> {
  const { values } = await m.operacionConsultas.get();
  const r: Record<string, number> = {};
  for (const v of values) if (v.metricName === 'operacion_consultas_sum') r[String(v.labels.operacion)] = v.value;
  return r;
}

describe('desglose por fases', () => {
  let m: Metricas;
  beforeEach(() => {
    m = crearMetricas();
    configurarDesglose({ activo: true, metricas: m });
  });

  it('observa las 7 fases y las consultas de una operación', async () => {
    await medir('apertura', async () => {
      contarConsulta();
      contarConsulta();
    });
    const f = await fases(m);
    for (const nombre of ['cola', 'calculo', 'bd', 'serializacion', 'difusion', 'resto', 'total']) {
      expect(f[`apertura:${nombre}`]).toBeDefined();
    }
    expect(await consultas(m)).toEqual({ apertura: 2 });
  });

  it('suma al desglose del contexto también tras un await', async () => {
    await medir('apertura', async () => {
      await pausa(5);
      await fase('bd', () => pausa(20));
    });
    const f = await fases(m);
    expect(f['apertura:bd']).toBeGreaterThanOrEqual(15);
    expect(f['apertura:total']).toBeGreaterThanOrEqual(f['apertura:bd']!);
  });

  it('dos fases en paralelo cuentan el tiempo de reloj del conjunto, no la suma', async () => {
    await medir('apertura', async () => {
      await Promise.all([fase('calculo', () => pausa(40)), fase('calculo', () => pausa(40))]);
    });
    const f = await fases(m);
    expect(f['apertura:calculo']).toBeGreaterThanOrEqual(35);
    expect(f['apertura:calculo']).toBeLessThan(70);
    expect(f['apertura:calculo']).toBeLessThanOrEqual(f['apertura:total']!);
  });

  it('resto es el total menos las fases y nunca es negativo', async () => {
    await medir('apertura', async () => {
      await fase('bd', () => pausa(10));
      await pausa(20);
    });
    const f = await fases(m);
    const suma = ['cola', 'calculo', 'bd', 'serializacion', 'difusion'].reduce((s, n) => s + f[`apertura:${n}`]!, 0);
    expect(f['apertura:resto']).toBeCloseTo(f['apertura:total']! - suma, 6);
    expect(f['apertura:resto']).toBeGreaterThanOrEqual(15);
  });

  it('renombrar cambia la etiqueta observada', async () => {
    await medir('eleccion', async () => {
      renombrar('entrega_sobre');
    });
    const f = await fases(m);
    expect(f['entrega_sobre:total']).toBeDefined();
    expect(f['eleccion:total']).toBeUndefined();
  });

  it('fuera de medir, fase solo devuelve fn() (mismo valor, mismo error, sin observaciones)', async () => {
    expect(fase('bd', () => 7)).toBe(7);
    await expect(fase('bd', () => Promise.resolve('x'))).resolves.toBe('x');
    expect(() => fase('bd', () => { throw new Error('sync'); })).toThrow('sync');
    await expect(fase('bd', () => Promise.reject(new Error('async')))).rejects.toThrow('async');
    contarConsulta();
    renombrar('apertura');
    expect(await fases(m)).toEqual({});
  });

  it('con la medición desactivada, medir y fase no observan nada', async () => {
    configurarDesglose({ activo: false, metricas: m });
    const r = await medir('apertura', async () => {
      contarConsulta();
      return fase('bd', () => 3);
    });
    expect(r).toBe(3);
    expect(await fases(m)).toEqual({});
    expect(await consultas(m)).toEqual({});
  });

  it('una fase que falla dentro de medir propaga el error y sigue contando su tiempo', async () => {
    await expect(
      medir('apertura', () => fase('bd', async () => {
        await pausa(10);
        throw new Error('bd caída');
      })),
    ).rejects.toThrow('bd caída');
    expect((await fases(m))['apertura:bd']).toBeGreaterThanOrEqual(5);
  });
});
