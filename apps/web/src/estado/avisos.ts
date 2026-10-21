/**
 * Avisos emergentes de la aplicación (spec 004, FR-026, FR-027; research R12; contracts/ui.md §8 y §9): los pinta
 * la `RegionAvisos` del `Marco`, sobre la barra principal. Los de éxito desaparecen solos a los 4 s.
 */
import { create } from 'zustand';
import type { TipoAviso } from '../componentes/Aviso';

export interface AccionAviso {
  etiqueta: string;
  onClick: () => void;
}

export interface AvisoEmergente {
  id: string;
  tipo: TipoAviso;
  texto: string;
  persistente: boolean;
  accion?: AccionAviso;
}

export interface OpcionesAviso {
  /** Clave fija: un aviso nuevo con la misma clave sustituye al anterior (p. ej. el de la conexión). */
  id?: string;
  /** Tiempo hasta cerrarse solo; por defecto 4 s para `exito` y sin límite para el resto. */
  duracionMs?: number;
  persistente?: boolean;
  accion?: AccionAviso;
}

interface EstadoAvisos {
  avisos: AvisoEmergente[];
}

export const DURACION_EXITO_MS = 4000;

export const useAvisos = create<EstadoAvisos>(() => ({ avisos: [] }));

let siguiente = 1;
const temporizadores = new Map<string, number>();

/** Muestra un aviso (el más nuevo, arriba) y devuelve su id. */
export function mostrarAviso(tipo: TipoAviso, texto: string, opciones: OpcionesAviso = {}): string {
  const id = opciones.id ?? `aviso-${siguiente++}`;
  const aviso: AvisoEmergente = { id, tipo, texto, persistente: opciones.persistente ?? false, ...(opciones.accion ? { accion: opciones.accion } : {}) };
  useAvisos.setState((s) => ({ avisos: [aviso, ...s.avisos.filter((a) => a.id !== id)] }));
  const previo = temporizadores.get(id);
  if (previo !== undefined) window.clearTimeout(previo);
  temporizadores.delete(id);
  const duracion = opciones.duracionMs ?? (tipo === 'exito' && !opciones.persistente ? DURACION_EXITO_MS : null);
  if (duracion !== null) temporizadores.set(id, window.setTimeout(() => cerrarAviso(id), duracion));
  return id;
}

export function cerrarAviso(id: string): void {
  const t = temporizadores.get(id);
  if (t !== undefined) window.clearTimeout(t);
  temporizadores.delete(id);
  useAvisos.setState((s) => (s.avisos.some((a) => a.id === id) ? { avisos: s.avisos.filter((a) => a.id !== id) } : s));
}
