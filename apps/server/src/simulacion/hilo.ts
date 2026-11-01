/**
 * Entrada de un hilo de simulación (spec 009; contracts/calculo.md §3). Recibe `{ id, nombre, args }`, ejecuta
 * la función de la tabla y responde con su resultado o su error. Sin base de datos ni conexiones (FR-003).
 */
import { parentPort } from 'node:worker_threads';
import { FUNCIONES, type NombreCalculo } from './funciones';

parentPort!.on('message', ({ id, nombre, args }: { id: number; nombre: NombreCalculo; args: unknown[] }) => {
  try {
    const valor = (FUNCIONES[nombre] as (...a: unknown[]) => unknown)(...args);
    parentPort!.postMessage({ id, ok: true, valor });
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    parentPort!.postMessage({ id, ok: false, error: { name: error.name, message: error.message, stack: error.stack } });
  }
});
