import type { Inicio } from '../pantallas/PartidoRapido';

/**
 * Dorsales dados al empezar el partido a convocados que no tenían (FR-038): se avisa al participante de los
 * de su equipo.
 */
export function AvisoDorsales({ inicio, miId }: { inicio: Inicio; miId: string | null }) {
  const lado = miId === inicio.local.id ? 'local' : miId === inicio.visitante.id ? 'visitante' : null;
  if (!lado || !inicio.dorsalesAsignados?.length) return null;
  const a = inicio.alineaciones[lado];
  const mios = new Map([...a.titulares.map((t) => t.jugador), ...a.suplentes].map((j) => [j.id, j]));
  const nuevos = inicio.dorsalesAsignados.filter((d) => mios.has(d.jugadorId));
  if (!nuevos.length) return null;
  return (
    <p className="nota" role="status">
      Dorsales nuevos: {nuevos.map((d) => `${mios.get(d.jugadorId)!.apellidos.split(' ')[0]} lleva el ${d.dorsal}`).join(', ')}.
    </p>
  );
}
