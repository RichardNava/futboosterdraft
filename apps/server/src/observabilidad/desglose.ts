/**
 * Desglose por fases de una operación (spec 010, research R2; contracts/desglose.md).
 *
 * `medir` abre un desglose en el contexto asíncrono (`AsyncLocalStorage`) y lo observa al terminar en
 * `operacion_fase_ms` y `operacion_consultas`. Las fases se suman desde donde ocurren (cola del actor,
 * cálculo, consultas, pasarela) sin pasar nada por las firmas. Solo lee el reloj: no cambia valores ni
 * el orden de ejecución (FR-003). Con la medición desactivada todas las funciones son llamadas vacías.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Metricas } from './metricas';

export type Operacion = 'apertura' | 'entrega_sobre' | 'eleccion';
type Fase = 'cola' | 'calculo' | 'bd' | 'serializacion' | 'difusion';

const FASES: readonly Fase[] = ['cola', 'calculo', 'bd', 'serializacion', 'difusion'];

/** Tiempo de una fase: los tramos en paralelo cuentan el tiempo de reloj del conjunto, no la suma. */
interface Tramo {
  abiertos: number;
  desde: number;
  ms: number;
}

interface Desglose {
  operacion: Operacion;
  inicio: number;
  fases: Record<Fase, Tramo>;
  consultas: number;
}

let almacen: AsyncLocalStorage<Desglose> | undefined;
let metricas: Metricas | undefined;

/** Lo llama `crearServidor`; el último servidor creado en el proceso es el que observa. */
export function configurarDesglose(opciones: { activo: boolean; metricas: Metricas }): void {
  almacen = opciones.activo ? new AsyncLocalStorage() : undefined;
  metricas = opciones.metricas;
}

/** Ejecuta `fn` con un desglose nuevo y lo observa al terminar (bien o con error). */
export async function medir<T>(operacion: Operacion, fn: () => Promise<T>): Promise<T> {
  if (!almacen) return fn();
  const fases = Object.fromEntries(FASES.map((f) => [f, { abiertos: 0, desde: 0, ms: 0 }])) as Record<Fase, Tramo>;
  const d: Desglose = { operacion, inicio: performance.now(), fases, consultas: 0 };
  try {
    return await almacen.run(d, fn);
  } finally {
    observar(d);
  }
}

/** Suma a la fase el tiempo de `fn` (síncrona o promesa) en el desglose del contexto actual. */
export function fase<T>(nombre: Fase, fn: () => T): T {
  const tramo = almacen?.getStore()?.fases[nombre];
  if (!tramo) return fn();
  if (tramo.abiertos++ === 0) tramo.desde = performance.now();
  const cerrar = () => {
    if (--tramo.abiertos === 0) tramo.ms += performance.now() - tramo.desde;
  };
  let r: T;
  try {
    r = fn();
  } catch (e) {
    cerrar();
    throw e;
  }
  if (r instanceof Promise) return r.finally(cerrar) as T;
  cerrar();
  return r;
}

/** Cambia la operación del desglose actual (p. ej. una elección que cierra el turno es una entrega de sobre). */
export function renombrar(operacion: Operacion): void {
  const d = almacen?.getStore();
  if (d) d.operacion = operacion;
}

/** Desglose del contexto actual, para atribuirle trabajo que se hace en otro contexto (grupo de aperturas). */
export type DesgloseActual = Desglose | undefined;
/** Desglose de la petición en curso, si se está midiendo. */
export function actual(): DesgloseActual {
  return almacen?.getStore();
}

/** Suma `ms` a una fase de un desglose capturado con `actual()` (p. ej. la cola de quien se unió a un grupo). */
export function sumar(d: DesgloseActual, nombre: Fase, ms: number): void {
  if (d) d.fases[nombre].ms += ms;
}

/**
 * Ejecuta `fn` y suma también a cada desglose de `otros` lo que `fn` añade al desglose actual (fases y
 * consultas): el trabajo de un grupo de aperturas cuenta para todas las que lo esperan (spec 010, US2).
 */
export async function compartido<T>(otros: readonly DesgloseActual[], fn: () => Promise<T>): Promise<T> {
  const d = almacen?.getStore();
  const destinos = otros.filter((o): o is Desglose => !!o && o !== d);
  if (!d || !destinos.length) return fn();
  const antes = FASES.map((f) => d.fases[f].ms);
  const consultas = d.consultas;
  try {
    return await fn();
  } finally {
    FASES.forEach((f, i) => {
      for (const o of destinos) o.fases[f].ms += d.fases[f].ms - antes[i]!;
    });
    for (const o of destinos) o.consultas += d.consultas - consultas;
  }
}

/** Suma una consulta a la base de datos al desglose de la petición en curso. */
export function contarConsulta(): void {
  const d = almacen?.getStore();
  if (d) d.consultas++;
}

function observar(d: Desglose): void {
  if (!metricas) return;
  const total = performance.now() - d.inicio;
  let suma = 0;
  for (const f of FASES) {
    suma += d.fases[f].ms;
    metricas.operacionFaseMs.observe({ operacion: d.operacion, fase: f }, d.fases[f].ms);
  }
  metricas.operacionFaseMs.observe({ operacion: d.operacion, fase: 'resto' }, Math.max(0, total - suma));
  metricas.operacionFaseMs.observe({ operacion: d.operacion, fase: 'total' }, total);
  metricas.operacionConsultas.observe({ operacion: d.operacion }, d.consultas);
}
