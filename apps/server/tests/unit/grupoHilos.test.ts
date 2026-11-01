/**
 * Grupo de hilos de simulación (spec 009, research R10) con el hilo de prueba de `tests/fixtures/hiloPrueba.ts`.
 */
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { crearMetricas } from '../../src/observabilidad/metricas';
import { crearCalculo, ErrorCalculo, GrupoHilos, hilosConfigurados, type Calculo, type OpcionesCalculo, type Prioridad } from '../../src/simulacion/grupo';

const FICHERO = new URL('../fixtures/hiloPrueba.ts', import.meta.url);
const abiertos: Calculo[] = [];

function grupo(hilos: number, opciones: OpcionesCalculo = {}) {
  const g = crearCalculo(hilos, { fichero: FICHERO, ...opciones });
  abiertos.push(g);
  // Las funciones del hilo de prueba no están en la tabla real.
  const ejecutar = (nombre: string, args: unknown[], prioridad: Prioridad = 'npc') =>
    (g.ejecutar as unknown as (n: string, a: unknown[], p: Prioridad) => Promise<unknown>)(nombre, args, prioridad);
  return { g, ejecutar };
}

const valor = async (m: { get(): Promise<{ values: { value: number }[] }> }) => (await m.get()).values.reduce((s, v) => s + v.value, 0);

afterEach(async () => {
  await Promise.all(abiertos.splice(0).map((g) => g.cerrar()));
});

describe('grupo de hilos', () => {
  it('da prioridad a los cálculos de humanos y respeta el orden dentro de cada cola', async () => {
    const { ejecutar } = grupo(1);
    const orden: unknown[] = [];
    const anotar = (p: Promise<unknown>) => p.then((v) => orden.push(v));
    await Promise.all([
      anotar(ejecutar('esperar', [300, 'ocupado'])),
      anotar(ejecutar('eco', ['n1'])),
      anotar(ejecutar('eco', ['n2'])),
      anotar(ejecutar('eco', ['h1'], 'humano')),
      anotar(ejecutar('eco', ['h2'], 'humano')),
    ]);
    expect(orden).toEqual(['ocupado', 'h1', 'h2', 'n1', 'n2']);
  });

  it('reparte una tarea por hilo', async () => {
    const { g, ejecutar } = grupo(2);
    const a = ejecutar('esperar', [400, 1]);
    const b = ejecutar('esperar', [400, 2]);
    expect((g as GrupoHilos).hilosParaPruebas().map((h) => h.tarea)).toEqual(['esperar', 'esperar']);
    const c = ejecutar('eco', [3]);
    // La tercera espera: los dos hilos están ocupados.
    expect((g as GrupoHilos).hilosParaPruebas().filter((h) => h.tarea)).toHaveLength(2);
    expect(await Promise.all([a, b, c])).toEqual([1, 2, 3]);
  });

  it('una excepción de la función se devuelve sin reintentar', async () => {
    const metricas = crearMetricas();
    const { ejecutar } = grupo(1, { metricas });
    await expect(ejecutar('fallar', ['mal'])).rejects.toMatchObject({ name: 'TypeError', message: 'mal' });
    expect(await valor(metricas.calculoReintentosTotal)).toBe(0);
    expect(await valor(metricas.calculosFallidosTotal)).toBe(1);
    expect(await ejecutar('eco', ['sigue'])).toBe('sigue');
  });

  it.each(['morirSiPrimeraVez', 'colgarSiPrimeraVez'])('%s: reintenta en un hilo nuevo y acaba bien', async (nombre) => {
    const metricas = crearMetricas();
    const { g, ejecutar } = grupo(1, { metricas, tiempoMaximoMs: 1000 });
    expect(await ejecutar(nombre, [randomUUID()])).toBe('ok');
    expect(await valor(metricas.calculoReintentosTotal)).toBe(1);
    expect((g as GrupoHilos).hilosParaPruebas()).toHaveLength(1);
    expect(await ejecutar('eco', [7])).toBe(7);
  });

  it.each([
    ['morir', 'caida'],
    ['colgar', 'tiempo'],
  ])('%s siempre: falla con ErrorCalculo tras 3 intentos', async (nombre, motivo) => {
    const metricas = crearMetricas();
    const { ejecutar } = grupo(1, { metricas, tiempoMaximoMs: 1000 });
    const error = await ejecutar(nombre, []).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorCalculo);
    expect(error).toMatchObject({ nombre, motivo, intentos: 3 });
    expect(await valor(metricas.calculoReintentosTotal)).toBe(2);
    expect(await ejecutar('eco', ['vivo'])).toBe('vivo');
  });

  it('cerrar() rechaza lo pendiente y lo que está en curso', async () => {
    const { g, ejecutar } = grupo(1);
    const enCurso = ejecutar('esperar', [500, 1]).catch((e: unknown) => e);
    const pendiente = ejecutar('eco', [2]).catch((e: unknown) => e);
    await g.cerrar();
    expect(await enCurso).toMatchObject({ motivo: 'cerrado' });
    expect(await pendiente).toMatchObject({ motivo: 'cerrado' });
    await expect(ejecutar('eco', [3])).rejects.toMatchObject({ motivo: 'cerrado' });
  });

  it('en proceso (0 hilos) llama a la función real y devuelve su excepción', async () => {
    const g = crearCalculo(0);
    expect(g.hilos).toBe(0);
    await expect(g.ejecutar('rehacer', [{ entrada: null, versionParametros: '5.0.0', decisiones: [] }, false], 'humano')).rejects.toBeInstanceOf(TypeError);
  });
});

describe('hilosConfigurados', () => {
  it.each([
    [undefined, 8, 7, false],
    ['', 8, 7, false],
    ['0', 8, 0, true],
    ['3', 8, 3, false],
    ['-1', 8, 7, true],
    ['1.5', 8, 7, true],
    ['abc', 8, 7, true],
    [undefined, 1, 1, false],
  ] as const)('"%s" con %i núcleos: %i hilos', (valor, nucleos, hilos, aviso) => {
    const r = hilosConfigurados(valor, nucleos);
    expect(r.hilos).toBe(hilos);
    expect(!!r.aviso).toBe(aviso);
  });
});
