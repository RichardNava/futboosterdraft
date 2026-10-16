/**
 * Bajas (sanciones y lesiones) y contador de amarillas (T108; FR-043; data-model §5.4).
 *
 * - Roja (directa o doble amarilla): 1 partido.
 * - Lesión: los partidos de su gravedad (1, 2, 3 o 5).
 * - En la fase de liga, 3 amarillas acumuladas = 1 partido y el contador vuelve a 0. Las dos amarillas
 *   de una doble amarilla no cuentan. En la eliminatoria no se acumulan.
 * - Una baja se cumple con los partidos que juega su equipo.
 */
export type MotivoBaja = 'roja' | 'acumulacion_amarillas' | 'lesion';

export interface Baja {
  participanteId: string;
  jugadorId: number;
  motivo: MotivoBaja;
  gravedad: 'leve' | 'media' | 'grave' | 'larga' | null;
  partidoOrigenId: string;
  partidosRestantes: number;
}

export interface EstadoBajas {
  bajas: Baja[];
  /** Amarillas acumuladas en la fase de liga, por "participanteId|jugadorId" (0..2). */
  amarillas: Record<string, number>;
}

export interface EventoConsecuencia {
  tipo: string;
  equipo: 'local' | 'visitante';
  jugadores: { rol: string; jugadorId: number }[];
  datos: Record<string, unknown>;
}

export interface PartidoConsecuencias {
  partidoId: string;
  local: string;
  visitante: string;
  eventos: readonly EventoConsecuencia[];
}

export const estadoBajasVacio = (): EstadoBajas => ({ bajas: [], amarillas: {} });

const autor = (e: EventoConsecuencia) => e.jugadores.find((j) => j.rol === 'autor')?.jugadorId;

export function aplicarConsecuencias(
  estado: EstadoBajas,
  partido: PartidoConsecuencias,
  fase: 'liga' | 'eliminatoria',
): { estado: EstadoBajas; bajasNuevas: Baja[] } {
  const juegan = new Set([partido.local, partido.visitante]);
  // 1. Las bajas de los equipos que han jugado avanzan un partido.
  const bajas = estado.bajas
    .map((b) => (juegan.has(b.participanteId) ? { ...b, partidosRestantes: b.partidosRestantes - 1 } : b))
    .filter((b) => b.partidosRestantes > 0);
  const amarillas = { ...estado.amarillas };
  const nuevas: Baja[] = [];
  const participanteDe = (lado: 'local' | 'visitante') => (lado === 'local' ? partido.local : partido.visitante);
  const baja = (participanteId: string, jugadorId: number, motivo: MotivoBaja, partidos: number, gravedad: Baja['gravedad'] = null) =>
    nuevas.push({ participanteId, jugadorId, motivo, gravedad, partidoOrigenId: partido.partidoId, partidosRestantes: partidos });

  // Jugadores expulsados por doble amarilla en este partido: sus amarillas no cuentan.
  const dobleAmarilla = new Set(
    partido.eventos.filter((e) => e.tipo === 'roja' && e.datos.motivo === 'doble_amarilla').map((e) => `${participanteDe(e.equipo)}|${autor(e)}`),
  );

  for (const e of partido.eventos) {
    const jugadorId = autor(e);
    if (jugadorId === undefined) continue;
    const participanteId = participanteDe(e.equipo);
    if (e.tipo === 'roja') baja(participanteId, jugadorId, 'roja', 1);
    else if (e.tipo === 'lesion') {
      const gravedad = (e.datos.gravedad as Baja['gravedad']) ?? 'leve';
      baja(participanteId, jugadorId, 'lesion', Number(e.datos.partidos ?? 1), gravedad);
    } else if (e.tipo === 'amarilla' && fase === 'liga') {
      const clave = `${participanteId}|${jugadorId}`;
      if (dobleAmarilla.has(clave)) continue;
      const total = (amarillas[clave] ?? 0) + 1;
      if (total >= 3) {
        baja(participanteId, jugadorId, 'acumulacion_amarillas', 1);
        delete amarillas[clave];
      } else amarillas[clave] = total;
    }
  }
  return { estado: { bajas: [...bajas, ...nuevas], amarillas }, bajasNuevas: nuevas };
}

export function bajasActivas(estado: EstadoBajas, participanteId: string): Set<number> {
  return new Set(estado.bajas.filter((b) => b.participanteId === participanteId && b.partidosRestantes > 0).map((b) => b.jugadorId));
}

/** Paso de la liga a la eliminatoria en el mixto: los contadores vuelven a 0; las bajas se mantienen. */
export function transicionAEliminatoria(estado: EstadoBajas): EstadoBajas {
  return { bajas: estado.bajas, amarillas: {} };
}
