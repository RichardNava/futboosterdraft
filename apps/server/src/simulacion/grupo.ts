/**
 * Grupo de hilos de simulación (spec 009; research R2–R7; contracts/calculo.md).
 *
 * - Dos colas FIFO, `humano` antes que `npc` (FR-012); una tarea por hilo; sin expropiación.
 * - Tiempo máximo por intento desde que el hilo empieza la tarea. Si el hilo cae o lo supera, se sustituye y la
 *   tarea vuelve al principio de su cola, hasta `reintentos` veces; después se rechaza con `ErrorCalculo`.
 * - Una excepción de la función no se reintenta (el cálculo es determinista): se rechaza con su error.
 * - Con `hilos = 0` (modo en proceso, FR-013) se llama a la función directamente, sin copias.
 */
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { fase } from '../observabilidad/desglose';
import type { Logger } from '../observabilidad/logger';
import type { Metricas } from '../observabilidad/metricas';
import { FUNCIONES, type Funciones, type NombreCalculo } from './funciones';

export type Prioridad = 'humano' | 'npc';

export interface Calculo {
  /** Número de hilos; 0 = modo en proceso. */
  readonly hilos: number;
  /** Encola un cálculo con su prioridad y devuelve su resultado. */
  ejecutar<N extends NombreCalculo>(nombre: N, args: Parameters<Funciones[N]>, prioridad: Prioridad): Promise<ReturnType<Funciones[N]>>;
  /** Termina los hilos y rechaza lo pendiente (al cerrar el servidor). */
  cerrar(): Promise<void>;
}

/** Fallo de un cálculo en un hilo (o grupo cerrado). */
export class ErrorCalculo extends Error {
  override readonly name = 'ErrorCalculo';
  constructor(
    readonly nombre: string,
    readonly motivo: 'caida' | 'tiempo' | 'cerrado',
    readonly intentos: number,
  ) {
    super(`Cálculo ${nombre} fallido (${motivo}) tras ${intentos} intento(s)`);
  }
}

export interface OpcionesCalculo {
  /** Fichero del hilo (por defecto `hilo.ts`/`hilo.js` junto a este módulo); las pruebas pasan uno propio. */
  fichero?: URL;
  tiempoMaximoMs?: number;
  reintentos?: number;
  metricas?: Metricas;
  logger?: Logger;
}

const TIEMPO_MAXIMO_MS = 20_000;
const REINTENTOS = 2;

/** Tamaño del grupo según `HILOS_SIMULACION` (FR-007). */
export function hilosConfigurados(valor: string | undefined, nucleos = availableParallelism()): { hilos: number; aviso?: string } {
  const porDefecto = Math.max(1, nucleos - 1);
  if (valor === undefined || valor.trim() === '') return { hilos: porDefecto };
  const n = Number(valor);
  if (n === 0) return { hilos: 0, aviso: 'HILOS_SIMULACION=0: los partidos se simulan en el hilo principal (modo en proceso)' };
  if (Number.isInteger(n) && n > 0) return { hilos: n };
  return { hilos: porDefecto, aviso: `HILOS_SIMULACION="${valor}" no es válido: se usan ${porDefecto} hilos` };
}

/** Ejecutor de cálculos pesados: en el propio proceso con 0 hilos o en un grupo de hilos. */
export function crearCalculo(hilos: number, opciones: OpcionesCalculo = {}): Calculo {
  opciones.metricas?.hilosSimulacion.set(hilos);
  if (hilos > 0) return new GrupoHilos(hilos, opciones);
  return {
    hilos: 0,
    ejecutar: (nombre, args) =>
      fase('calculo', () => {
        try {
          return Promise.resolve((FUNCIONES[nombre] as (...a: unknown[]) => never)(...args));
        } catch (e) {
          return Promise.reject(e);
        }
      }),
    cerrar: async () => {},
  };
}

interface Tarea {
  id: number;
  nombre: NombreCalculo;
  args: unknown[];
  prioridad: Prioridad;
  intentos: number;
  resolver(valor: unknown): void;
  rechazar(error: unknown): void;
}

interface Hilo {
  worker: Worker;
  tarea: Tarea | null;
  temporizador: NodeJS.Timeout | undefined;
  empezadaEn: number;
  muerto: boolean;
}

type Respuesta = { id: number; ok: true; valor: unknown } | { id: number; ok: false; error: { name: string; message: string; stack?: string } };

/** Grupo de hilos de simulación con dos colas de prioridad (humanos antes que NPC). */
export class GrupoHilos implements Calculo {
  private readonly colas: Record<Prioridad, Tarea[]> = { humano: [], npc: [] };
  private readonly lista: Hilo[] = [];
  private readonly fichero: URL;
  private readonly tiempoMaximoMs: number;
  private readonly reintentos: number;
  private siguienteId = 0;
  private cerrado = false;

  constructor(
    readonly hilos: number,
    private readonly opciones: OpcionesCalculo,
  ) {
    this.fichero = opciones.fichero ?? new URL(import.meta.url.endsWith('.ts') ? './hilo.ts' : './hilo.js', import.meta.url);
    this.tiempoMaximoMs = opciones.tiempoMaximoMs ?? TIEMPO_MAXIMO_MS;
    this.reintentos = opciones.reintentos ?? REINTENTOS;
    for (let i = 0; i < hilos; i++) this.lista.push(this.crearHilo());
  }

  /** Encola un cálculo con su prioridad y devuelve su resultado. */
  ejecutar<N extends NombreCalculo>(nombre: N, args: Parameters<Funciones[N]>, prioridad: Prioridad): Promise<ReturnType<Funciones[N]>> {
    if (this.cerrado) return Promise.reject(new ErrorCalculo(nombre, 'cerrado', 0));
    // Incluye la espera de un hilo libre (spec 010, research R2).
    return fase('calculo', () => new Promise((resolver, rechazar) => {
      this.colas[prioridad].push({ id: this.siguienteId++, nombre, args, prioridad, intentos: 0, resolver: resolver as (v: unknown) => void, rechazar });
      this.repartir();
    }));
  }

  /** Termina los hilos y rechaza los cálculos pendientes. */
  async cerrar(): Promise<void> {
    this.cerrado = true;
    const pendientes = [...this.colas.humano, ...this.colas.npc, ...this.lista.flatMap((h) => (h.tarea ? [h.tarea] : []))];
    this.colas.humano = [];
    this.colas.npc = [];
    for (const t of pendientes) t.rechazar(new ErrorCalculo(t.nombre, 'cerrado', t.intentos));
    this.medirColas();
    await Promise.all(
      this.lista.map((h) => {
        clearTimeout(h.temporizador);
        h.muerto = true;
        h.tarea = null;
        return h.worker.terminate();
      }),
    );
  }

  /** Solo para pruebas (SC-005): los hilos y la función que calcula cada uno ahora mismo. */
  hilosParaPruebas(): { worker: Worker; tarea: NombreCalculo | null }[] {
    return this.lista.map((h) => ({ worker: h.worker, tarea: h.tarea?.nombre ?? null }));
  }

  private crearHilo(): Hilo {
    const ts = this.fichero.pathname.endsWith('.ts');
    // En desarrollo y en las pruebas el hilo es TypeScript: lo carga tsx (research R3).
    const worker = new Worker(this.fichero, ts ? { execArgv: ['--import', 'tsx'] } : {});
    worker.unref();
    const hilo: Hilo = { worker, tarea: null, temporizador: undefined, empezadaEn: 0, muerto: false };
    worker.on('message', (m: Respuesta) => this.alResponder(hilo, m));
    worker.on('error', () => this.alCaer(hilo, 'caida'));
    worker.on('exit', () => this.alCaer(hilo, 'caida'));
    return hilo;
  }

  private repartir(): void {
    for (const hilo of this.lista) {
      if (hilo.tarea || hilo.muerto) continue;
      const tarea = this.colas.humano.shift() ?? this.colas.npc.shift();
      if (!tarea) break;
      this.empezar(hilo, tarea);
    }
    this.medirColas();
  }

  private empezar(hilo: Hilo, tarea: Tarea): void {
    tarea.intentos++;
    try {
      hilo.worker.postMessage({ id: tarea.id, nombre: tarea.nombre, args: tarea.args });
    } catch (e) {
      // Argumentos que no se pueden copiar: es un error del llamador, no del hilo.
      tarea.rechazar(e);
      return;
    }
    hilo.tarea = tarea;
    hilo.empezadaEn = performance.now();
    hilo.temporizador = setTimeout(() => this.alCaer(hilo, 'tiempo'), this.tiempoMaximoMs);
  }

  private alResponder(hilo: Hilo, m: Respuesta): void {
    const tarea = hilo.tarea;
    if (!tarea || tarea.id !== m.id) return;
    clearTimeout(hilo.temporizador);
    hilo.tarea = null;
    this.opciones.metricas?.calculoDuracionMs.observe({ funcion: tarea.nombre }, performance.now() - hilo.empezadaEn);
    if (m.ok) tarea.resolver(m.valor);
    else {
      this.opciones.metricas?.calculosFallidosTotal.inc({ motivo: 'error' });
      tarea.rechazar(Object.assign(new Error(m.error.message), { name: m.error.name, stack: m.error.stack }));
    }
    this.repartir();
  }

  /** El hilo cae o agota el tiempo: se sustituye y su tarea se reintenta o se rechaza. */
  private alCaer(hilo: Hilo, motivo: 'caida' | 'tiempo'): void {
    if (hilo.muerto) return;
    hilo.muerto = true;
    clearTimeout(hilo.temporizador);
    void hilo.worker.terminate();
    if (this.cerrado) return;
    // shortcut: un hilo que no llega a arrancar (fichero roto) se sustituye una y otra vez; sus tareas sí fallan
    // tras los reintentos. Si pasa en producción, limitar las sustituciones seguidas.
    this.lista[this.lista.indexOf(hilo)] = this.crearHilo();
    const tarea = hilo.tarea;
    hilo.tarea = null;
    if (tarea) {
      const { metricas, logger } = this.opciones;
      if (tarea.intentos <= this.reintentos) {
        metricas?.calculoReintentosTotal.inc();
        logger?.warn({ funcion: tarea.nombre, motivo, intento: tarea.intentos }, 'Cálculo reintentado en un hilo nuevo');
        this.colas[tarea.prioridad].unshift(tarea);
      } else {
        metricas?.calculosFallidosTotal.inc({ motivo });
        logger?.error({ funcion: tarea.nombre, motivo, intentos: tarea.intentos }, 'Cálculo fallido tras agotar los reintentos');
        tarea.rechazar(new ErrorCalculo(tarea.nombre, motivo, tarea.intentos));
      }
    }
    this.repartir();
  }

  private medirColas(): void {
    this.opciones.metricas?.calculosEnEspera.set({ prioridad: 'humano' }, this.colas.humano.length);
    this.opciones.metricas?.calculosEnEspera.set({ prioridad: 'npc' }, this.colas.npc.length);
  }
}
