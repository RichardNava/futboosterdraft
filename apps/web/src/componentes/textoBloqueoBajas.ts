/**
 * Textos de las bajas de la alineación confirmada (spec 012, FR-027 y FR-029; contracts/ui.md «Torneo»): el motivo
 * del botón de avanzar bloqueado, la nota cuando no hay con quién sustituir y cada aviso del equipo. Quien manda es
 * el servidor (409 BAJA_PENDIENTE); esto solo lo explica antes de pulsar.
 */
import type { AvisoEquipo, BajaPendiente } from '@fbd/protocol';

const estado = (motivo: string) => (motivo === 'lesion' ? 'lesionado' : 'sancionado');

/**
 * `jugaras`: titulares con los que se jugaría si no hay con quién sustituir. Devuelve el motivo del botón desactivado
 * (o null) y la nota que lo acompaña (o null).
 */
export function textoBloqueoBajas(
  bajas: readonly Pick<BajaPendiente, 'jugadorId' | 'motivo'>[],
  nombre: (id: number) => string,
  { sinSuplentes, jugaras }: { sinSuplentes: boolean; jugaras?: number },
): { motivoDesactivado: string | null; nota: string | null } {
  if (bajas.length === 0) return { motivoDesactivado: null, nota: null };
  if (sinSuplentes) return { motivoDesactivado: null, nota: jugaras !== undefined ? `No tienes con quién sustituir a los jugadores de baja: jugarás con ${jugaras}.` : null };
  const [primera] = bajas;
  const mas = bajas.length > 1 ? ` y ${bajas.length - 1} más` : '';
  return { motivoDesactivado: `Sustituye a ${nombre(primera!.jugadorId)} (${estado(primera!.motivo)})${mas} para continuar`, nota: null };
}

/** Texto de un aviso del equipo (bandeja de avisos). */
export function textoAvisoEquipo(a: AvisoEquipo, nombre: (id: number) => string): string {
  const quien = nombre(a.jugadorId);
  const partidos = a.partidosRestantes !== undefined ? ` (${a.partidosRestantes} ${a.partidosRestantes === 1 ? 'partido' : 'partidos'})` : '';
  switch (a.tipo) {
    case 'baja_pendiente':
      return `${quien} está ${estado(a.motivo ?? 'lesion')}${partidos} y sigue en tu alineación: sustitúyelo en Formación.`;
    case 'lesionado':
      return `${quien} está lesionado${partidos}.`;
    case 'sancionado':
      return `${quien} está sancionado${partidos}.`;
    case 'disponible':
      return `${quien} vuelve a estar disponible.`;
    case 'baja_sustituida':
      return `${quien} no jugaba: se sustituyó al vencer el plazo.`;
  }
}
