import { useEffect } from 'react';
import { mostrarAviso } from '../estado/avisos';
import type { Inicio } from '../pantallas/PartidoRapido';

/** Texto del aviso de dorsales nuevos del equipo propio, o `null` si no hay ninguno. */
export function textoDorsalesNuevos(inicio: Inicio, miId: string | null): string | null {
  const lado = miId === inicio.local.id ? 'local' : miId === inicio.visitante.id ? 'visitante' : null;
  if (!lado || !inicio.dorsalesAsignados?.length) return null;
  const a = inicio.alineaciones[lado];
  const mios = new Map([...a.titulares.map((t) => t.jugador), ...a.suplentes].map((j) => [j.id, j]));
  const nuevos = inicio.dorsalesAsignados.filter((d) => mios.has(d.jugadorId));
  if (!nuevos.length) return null;
  return `Dorsales nuevos: ${nuevos.map((d) => `${mios.get(d.jugadorId)!.apellidos.split(' ')[0]} lleva el ${d.dorsal}`).join(', ')}.`;
}

/**
 * Dorsales dados al empezar el partido a convocados que no tenían (FR-038): se avisa al participante de los de su
 * equipo con un aviso de advertencia en la región de avisos (spec 004, contracts/ui.md §9).
 */
export function AvisoDorsales({ inicio, miId }: { inicio: Inicio; miId: string | null }) {
  const texto = textoDorsalesNuevos(inicio, miId);
  useEffect(() => {
    if (texto) mostrarAviso('advertencia', texto, { id: `dorsales-${inicio.partidoId}` });
  }, [texto, inicio.partidoId]);
  return null;
}
