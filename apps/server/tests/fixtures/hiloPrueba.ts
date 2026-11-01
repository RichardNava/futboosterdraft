/**
 * Hilo de prueba para el grupo (spec 009, research R10): el mismo protocolo que `src/simulacion/hilo.ts` con
 * funciones que fallan, mueren o se cuelgan. Las `…SiPrimeraVez` dejan una marca en un fichero temporal para
 * comportarse bien en el reintento (que corre en otro hilo).
 */
import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parentPort } from 'node:worker_threads';

const primeraVez = (clave: string) => {
  const marca = join(tmpdir(), `fbd-hilo-prueba-${clave}`);
  if (existsSync(marca)) return false;
  writeFileSync(marca, '');
  return true;
};

const colgar = (): never => {
  for (;;);
};

const FUNCIONES: Record<string, (...a: never[]) => unknown> = {
  eco: (x: unknown) => x,
  esperar: (ms: number, x: unknown) => {
    const fin = Date.now() + ms;
    while (Date.now() < fin);
    return x;
  },
  fallar: (mensaje: string) => {
    throw new TypeError(mensaje);
  },
  morir: () => process.exit(1),
  colgar,
  morirSiPrimeraVez: (clave: string) => (primeraVez(clave) ? process.exit(1) : 'ok'),
  colgarSiPrimeraVez: (clave: string) => (primeraVez(clave) ? colgar() : 'ok'),
};

parentPort!.on('message', ({ id, nombre, args }: { id: number; nombre: string; args: never[] }) => {
  try {
    parentPort!.postMessage({ id, ok: true, valor: FUNCIONES[nombre]!(...args) });
  } catch (e) {
    const error = e as Error;
    parentPort!.postMessage({ id, ok: false, error: { name: error.name, message: error.message, stack: error.stack } });
  }
});
