/**
 * Chapa de cada equipo en un partido (spec 011, US1; research R7; contracts/ui.md §1): escudo y color de respaldo.
 *
 * Sin `escudos` (un mensaje anterior a la 011) o con escudos distintos, cada lado lleva el color principal de su
 * equipación. Si los dos escudos llegan a null porque coincidían (FR-008), se pintan círculos: el local con su
 * principal y el visitante con el secundario, o con su principal si el secundario se confunde con el del local.
 */
import { chocan, parametrosActuales, type Equipacion } from '@fbd/domain';
import { coloresDe } from './colores';

export type Lado = 'local' | 'visitante';

interface LadoChapa {
  color: string;
  escudo: string | null;
}

const lisa = (color: string): Equipacion => ({ diseno: 'lisa', colores: [color] }) as Equipacion;

/** Chapa de cada equipo (escudo y color); sin escudos, círculos de colores que no se confundan entre sí. */
export function chapasDelPartido(
  equipaciones: Record<Lado, Equipacion>,
  escudos?: { local: string | null; visitante: string | null } | null,
): Record<Lado, LadoChapa> {
  const local = coloresDe(equipaciones.local).principal;
  const visitante = coloresDe(equipaciones.visitante);
  if (escudos && escudos.local === null && escudos.visitante === null) {
    // El segundo color de la camiseta; en una lisa, el de su dorsal.
    const secundario = equipaciones.visitante.colores[1] ?? visitante.secundario;
    const parecido = chocan(lisa(secundario), lisa(local), parametrosActuales());
    return {
      local: { color: local, escudo: null },
      visitante: { color: parecido ? visitante.principal : secundario, escudo: null },
    };
  }
  return {
    local: { color: local, escudo: escudos?.local ?? null },
    visitante: { color: visitante.principal, escudo: escudos?.visitante ?? null },
  };
}

/** Equipo para el marcador y las chapas a partir de `partido.inicio`. */
export function equipoMarcador(
  inicio: { local: { nombre: string }; visitante: { nombre: string }; equipaciones: Record<Lado, Equipacion>; escudos?: { local: string | null; visitante: string | null } },
  lado: Lado,
): { nombre: string; color: string; escudo: string | null } {
  return { nombre: inicio[lado].nombre, ...chapasDelPartido(inicio.equipaciones, inicio.escudos)[lado] };
}

/** Imagen del escudo a tamaño de chapa (research R3). */
export const urlEscudo = (id: string, tamano: 64 | 256 | 512 = 64): string => `/cosmeticos/escudos/${id}-${tamano}.webp`;
