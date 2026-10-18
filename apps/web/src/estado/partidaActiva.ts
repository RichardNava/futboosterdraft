/**
 * Partida que se está mirando (la de la última instantánea `estado` recibida) y su conexión abierta. La usa
 * la barra de navegación (`Marco`) para decidir qué hacer al salir de la partida (research R10 y R11):
 * modal de abandono en un draft con otros humanos activos, o `partida.pausar` en una partida en solitario.
 */
import { create } from 'zustand';
import type { ConexionPartida } from '../conexion/ws';

export interface ParticipanteActivo {
  id: string;
  tipo: 'humano' | 'npc';
  controladoPorNPC?: boolean;
}

interface EstadoPartidaActiva {
  partidaId: string | null;
  /** Fase de la última instantánea: sala, draft, torneo… */
  fase: string | null;
  miParticipanteId: string | null;
  tipoSimulacion: string | null;
  participantes: ParticipanteActivo[];
  conexion: ConexionPartida | null;
  /**
   * Apertura de sobre pedida por el servidor (`draft.turno.animacion`) que aún no se ha mostrado: puede
   * llegar a la sala justo antes de pasar al draft. Solo vive en memoria, así que al recargar no se repite.
   */
  aperturaPendiente: { partidaId: string; ronda: number } | null;
  actualizar(datos: Partial<Omit<EstadoPartidaActiva, 'actualizar' | 'olvidarConexion'>>): void;
  /** La pantalla cierra su conexión: se olvida si era la que estaba guardada. */
  olvidarConexion(conexion: ConexionPartida): void;
}

export const usePartidaActiva = create<EstadoPartidaActiva>((set, get) => ({
  partidaId: null,
  fase: null,
  miParticipanteId: null,
  tipoSimulacion: null,
  participantes: [],
  conexion: null,
  aperturaPendiente: null,
  actualizar: (datos) => set(datos),
  olvidarConexion: (conexion) => {
    if (get().conexion === conexion) set({ conexion: null });
  },
}));

/** Humanos activos de la partida (sin contar a los que abandonaron y ahora juega un NPC). */
export function humanosActivos(participantes: readonly ParticipanteActivo[]): ParticipanteActivo[] {
  return participantes.filter((p) => p.tipo === 'humano' && !p.controladoPorNPC);
}
