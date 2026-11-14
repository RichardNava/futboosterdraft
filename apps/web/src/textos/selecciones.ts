/**
 * Banderas y escudos de las selecciones (spec 006, R6; FR-043, FR-044). Las cartas solo guardan el código; las rutas
 * se construyen aquí. Sustituir o quitar los escudos solo cambia su carpeta o `ESCUDOS_ACTIVOS`.
 */
import { esSeleccion, SELECCIONES } from '@fbd/domain';

/**
 * Escudos oficiales: desactivados hasta que estén en `public/escudos/` con la licencia revisada (riesgo abierto que
 * bloquea producción; docs/despliegue.md).
 */
const ESCUDOS_ACTIVOS = false;

/** Bandera de una selección. */
export const rutaBandera = (codigo: string): string => `/banderas/${codigo}.svg`;

/** Escudo de una selección, si están activos. */
export const rutaEscudo = (codigo: string): string | null => (ESCUDOS_ACTIVOS ? `/escudos/${codigo}.svg` : null);

/** Nombre de una selección (el código si no se conoce). */
export const nombreSeleccion = (codigo: string): string => (esSeleccion(codigo) ? SELECCIONES[codigo].nombre : codigo);
