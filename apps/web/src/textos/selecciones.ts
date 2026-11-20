/**
 * Banderas de las selecciones (spec 006, R6; FR-043, FR-044). Las cartas solo guardan el código; las rutas se
 * construyen aquí. No hay escudos oficiales de ningún club, selección o marca (decisión del 2026-11-20).
 */
import { esSeleccion, SELECCIONES } from '@fbd/domain';

/** Bandera de una selección. */
export const rutaBandera = (codigo: string): string => `/banderas/${codigo}.svg`;

/** Nombre de una selección (el código si no se conoce). */
export const nombreSeleccion = (codigo: string): string => (esSeleccion(codigo) ? SELECCIONES[codigo].nombre : codigo);
