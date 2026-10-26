/**
 * Búsqueda, filtros, orden y paginación de la colección, en el cliente (spec 006, R15; FR-035 a FR-038). Funciones
 * puras: la pantalla las encadena con `useMemo`.
 */
import { DEMARCACIONES, NIVELES, type Demarcacion, type Nivel } from '@fbd/domain';
import type { CartaPoseida } from '@fbd/protocol';

export type CriterioOrden = 'nombre' | 'nacionalidad' | 'coleccion' | 'nivel' | 'demarcacion' | 'media';
export type Sentido = 'asc' | 'desc';

export interface Filtros {
  estado: 'todas' | 'activas' | 'inactivas';
  nivel: Nivel | 'todos';
  demarcacion: Demarcacion | 'todas';
  coleccion: string;
}

export const FILTROS_INICIALES: Filtros = { estado: 'todas', nivel: 'todos', demarcacion: 'todas', coleccion: 'todas' };

/** Sin mayúsculas ni tildes: «Valotal», «valotal» y «VALÓTAL» coinciden. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function filtrarCartas(cartas: readonly CartaPoseida[], busqueda: string, f: Filtros): CartaPoseida[] {
  const q = normalizar(busqueda.trim());
  return cartas.filter(
    (c) =>
      (f.estado === 'todas' || c.activa === (f.estado === 'activas')) &&
      (f.nivel === 'todos' || c.nivel === f.nivel) &&
      (f.demarcacion === 'todas' || c.demarcacion === f.demarcacion) &&
      (f.coleccion === 'todas' || c.colecciones.includes(f.coleccion)) &&
      (!q || [c.nombreCarta, c.nombre, c.apellidos].some((t) => normalizar(t).includes(q))),
  );
}

const CLAVES: Record<CriterioOrden, (c: CartaPoseida) => string | number> = {
  nombre: (c) => normalizar(c.nombreCarta),
  nacionalidad: (c) => c.nacionalidad,
  coleccion: (c) => [...c.colecciones].sort().join(','),
  nivel: (c) => NIVELES.indexOf(c.nivel),
  demarcacion: (c) => DEMARCACIONES.indexOf(c.demarcacion),
  media: (c) => c.media,
};

/** Ordena la lista entera (no solo la página); a igualdad, por id, para que el orden sea estable. */
export function ordenarCartas(cartas: readonly CartaPoseida[], criterio: CriterioOrden, sentido: Sentido): CartaPoseida[] {
  const clave = CLAVES[criterio];
  const signo = sentido === 'asc' ? 1 : -1;
  return [...cartas].sort((a, b) => {
    const x = clave(a);
    const y = clave(b);
    const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es');
    return r !== 0 ? signo * r : a.id - b.id;
  });
}

/** Página que contiene la carta en la posición `indice` (para conservarla al cambiar el tamaño). */
export function paginaQueContiene(indice: number, porPagina: number): number {
  return Math.floor(Math.max(0, indice) / Math.max(1, porPagina));
}

export function paginar<T>(lista: readonly T[], pagina: number, porPagina: number): { elementos: T[]; pagina: number; paginas: number } {
  const n = Math.max(1, porPagina);
  const paginas = Math.max(1, Math.ceil(lista.length / n));
  const actual = Math.min(Math.max(0, pagina), paginas - 1);
  return { elementos: lista.slice(actual * n, (actual + 1) * n), pagina: actual, paginas };
}
