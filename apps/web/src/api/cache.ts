/**
 * Caché de navegación en memoria (spec 014, research R9; FR-024 a FR-026): una pantalla ya visitada se pinta al
 * instante con su último valor y se revalida en segundo plano. Los datos de decisión (`fresco`) nunca se sirven desde
 * la caché. Se pierde al recargar la página.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { api } from './cliente';

/**
 * Un dato de decisión (`fresco`) recién pedido por el loader de la navegación en curso se sigue considerando fresco
 * este tiempo: la pantalla que se monta justo después no lo vuelve a pedir.
 */
const VENTANA_FRESCO_MS = 5000;

interface Entrada {
  valor?: unknown;
  /** Momento (ms) de la última respuesta correcta. */
  cargadoEn?: number;
  error: Error | null;
  enVuelo: Promise<unknown> | null;
}

const entradas = new Map<string, Entrada>();
const oyentes = new Set<() => void>();
let version = 0;

function avisar(): void {
  version++;
  for (const o of oyentes) o();
}

function entrada(clave: string): Entrada {
  let e = entradas.get(clave);
  if (!e) entradas.set(clave, (e = { error: null, enVuelo: null }));
  return e;
}

/** Lanza `cargar` si no hay ya una petición en vuelo para la clave (una sola a la vez). */
function pedir<T>(clave: string, cargar: () => Promise<T>): Promise<T> {
  const e = entrada(clave);
  if (e.enVuelo) return e.enVuelo as Promise<T>;
  const promesa = cargar().then(
    (valor) => {
      if (entradas.get(clave) === e) Object.assign(e, { valor, cargadoEn: Date.now(), error: null, enVuelo: null });
      avisar();
      return valor;
    },
    (error: unknown) => {
      if (entradas.get(clave) === e) Object.assign(e, { error: error instanceof Error ? error : new Error(String(error)), enVuelo: null });
      avisar();
      throw error;
    },
  );
  e.enVuelo = promesa;
  return promesa;
}

/**
 * Valor de la clave: el guardado al instante (y revalidación en segundo plano) si lo hay y no es `fresco`; si no, espera
 * a `cargar()`.
 */
export async function leer<T>(clave: string, cargar: () => Promise<T>, opciones: { fresco?: boolean } = {}): Promise<T> {
  const e = entradas.get(clave);
  if (e && e.valor !== undefined) {
    if (!opciones.fresco) {
      // Revalidación en segundo plano, salvo si se acaba de cargar.
      if (!recien(e)) pedir(clave, cargar).catch(() => undefined);
      return e.valor as T;
    }
    if (recien(e)) return e.valor as T;
  }
  return pedir(clave, cargar);
}

const recien = (e: Entrada) => e.cargadoEn !== undefined && Date.now() - e.cargadoEn <= VENTANA_FRESCO_MS;

/**
 * Valor guardado de una clave para pintar la pantalla sin esperar (estado inicial): con `fresco`, solo si lo acaba de
 * pedir el loader de esta navegación.
 */
export function enCache<T>(clave: string, opciones: { fresco?: boolean } = {}): T | undefined {
  const e = entradas.get(clave);
  if (!e || e.valor === undefined || (opciones.fresco && !recien(e))) return undefined;
  return e.valor as T;
}

/** `leer` de una ruta GET de la API (la clave es la propia ruta). */
export function cargarApi<T>(ruta: string, opciones: { fresco?: boolean } = {}): Promise<T> {
  return leer(ruta, () => pedirRed<T>(ruta), opciones);
}

/** Petición a la red sin pasar por la caché (la caché decide antes si hace falta). */
const pedirRed = <T,>(ruta: string) => api<T>(ruta, { metodo: 'GET', sinCache: true });

/**
 * Loader de una ruta (research R8): espera a sus datos principales para que la pantalla anterior se mantenga hasta tenerlos.
 * No lanza: ante un fallo devuelve `{ error }` y la pantalla muestra su aviso de error habitual.
 */
export async function cargarRutas(rutas: readonly { ruta: string; fresco?: boolean }[]): Promise<{ error: Error | null }> {
  try {
    await Promise.all(rutas.map((r) => cargarApi(r.ruta, r)));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/** Precarga una clave no fresca al señalar o enfocar un enlace (FR-026); los errores se ignoran. */
export function precargar<T>(clave: string, cargar: () => Promise<T>): void {
  leer(clave, cargar).catch(() => undefined);
}

/** Borra las entradas cuya clave empieza por `prefijo` (tras una mutación). */
export function invalidar(prefijo: string): void {
  for (const clave of [...entradas.keys()]) if (clave.startsWith(prefijo)) entradas.delete(clave);
  avisar();
}

/** Último valor de una clave, o `undefined`; se re-pinta cuando llega una revalidación. */
function useDato<T>(clave: string): T | undefined {
  useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => version,
  );
  return entradas.get(clave)?.valor as T | undefined;
}

/** Último error de una clave sin valor previo, o `null`. */
export function errorDe(clave: string): Error | null {
  const e = entradas.get(clave);
  return e && e.valor === undefined ? e.error : null;
}

/**
 * Tras una mutación (spec 014, T065): todo lo guardado pasa a viejo. Se sigue pintando al volver a una pantalla, pero se
 * revalida siempre y nunca cuenta como dato fresco.
 */
export function caducar(): void {
  for (const e of entradas.values()) delete e.cargadoEn;
}

/** Solo para pruebas: vacía la caché. */
export function vaciarCache(): void {
  entradas.clear();
  avisar();
}

/** Escribe el valor de una clave (p. ej. tras una mutación que devuelve el dato nuevo) y avisa a las pantallas. */
export function poner<T>(clave: string, valor: T): void {
  const e = entrada(clave);
  Object.assign(e, { valor, cargadoEn: Date.now(), error: null });
  avisar();
}

/**
 * Datos de una ruta GET para una pantalla (spec 014, US6): el valor de la caché al instante (el loader ya lo ha cargado)
 * y revalidación en segundo plano; con `fresco`, solo el recién pedido. `recargar` vuelve a pedirlo sin servir el viejo.
 */
export function useApi<T>(ruta: string | null, opciones: { fresco?: boolean } = {}) {
  const valor = useDato<T>(ruta ?? '');
  const [error, setError] = useState<Error | null>(() => (ruta ? errorDe(ruta) : null));
  const fresco = opciones.fresco === true;
  useEffect(() => {
    if (!ruta) return;
    let vigente = true;
    setError(null);
    cargarApi<T>(ruta, { fresco }).catch((e: unknown) => vigente && setError(e instanceof Error ? e : new Error(String(e))));
    return () => {
      vigente = false;
    };
  }, [ruta, fresco]);
  const e = ruta ? entradas.get(ruta) : undefined;
  const datos = ruta && e && (!fresco || recien(e)) ? valor : undefined;
  const recargar = async () => {
    if (!ruta) return;
    setError(null);
    // Sin borrar el valor: la pantalla sigue pintada hasta que llega el nuevo.
    await pedir(ruta, () => pedirRed<T>(ruta)).catch((x: unknown) => setError(x instanceof Error ? x : new Error(String(x))));
  };
  return { datos, error, recargar };
}

/** Datos de las pantallas que se pueden precargar (no son de decisión; research R10). */
const PRECARGABLES: Record<string, string> = {
  '/mis-partidas': '/api/mis-partidas',
  '/perfil': '/api/perfil',
  '/coleccion': '/api/coleccion',
};

/** Al señalar o enfocar un enlace (FR-026): adelanta los datos de su pantalla si se pueden servir desde la caché. */
export function precargarPantalla(ruta: string): void {
  const clave = PRECARGABLES[ruta];
  if (clave) precargar(clave, () => pedirRed(clave));
}
