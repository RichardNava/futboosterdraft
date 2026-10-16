/**
 * Tipos públicos del motor (contracts/engine-api.md).
 */
import type { FormacionId, Jugador, Lanzadores, ParametrosEquilibrado, Tactica } from '@fbd/domain';

export type Lado = 'local' | 'visitante';

export interface EquipoPartido {
  participanteId: string;
  formacion: FormacionId;
  titulares: { casillaId: string; jugador: Jugador }[];
  suplentes: Jugador[];
  tactica: Tactica;
  lanzadores: Lanzadores;
}

export interface EntradaPartido {
  version: string;
  parametros: ParametrosEquilibrado;
  /** 128 bits en hexadecimal. */
  semilla: string;
  /** Prórroga y penaltis si hay empate (FR-041). */
  eliminatoria: boolean;
  local: EquipoPartido;
  visitante: EquipoPartido;
}

export type Fase = 'primera_parte' | 'descanso' | 'segunda_parte' | 'pre_prorroga' | 'prorroga' | 'penaltis' | 'finalizado';

export type TipoEvento =
  | 'gol'
  | 'ocasion'
  | 'tiro'
  | 'parada'
  | 'falta'
  | 'amarilla'
  | 'roja'
  | 'lesion'
  | 'sustitucion'
  | 'corner'
  | 'fuera_de_juego'
  | 'penalti'
  | 'interrupcion'
  | 'inicio_tramo'
  | 'fin_tramo'
  | 'tanda_lanzamiento';

export type RolEvento = 'autor' | 'asistente' | 'defensor' | 'portero' | 'entra' | 'sale';

export interface EventoPartido {
  /** Segundos de juego transcurridos desde el saque inicial (incluido el descuento). */
  tick: number;
  /** Minuto para mostrar, p. ej. "23'" o "45+2'". */
  minuto: string;
  tipo: TipoEvento;
  equipo: Lado;
  jugadores: { rol: RolEvento; jugadorId: number }[];
  datos: Record<string, unknown>;
  /** Aparece en el resumen de la simulación rápida (FR-044). */
  relevante: boolean;
}

export interface Marcador {
  local: number;
  visitante: number;
  penaltis?: { local: number; visitante: number };
}

export interface EstadisticasEquipo {
  posesion: number;
  /** Porcentaje del tiempo de juego con el balón en campo rival. */
  posesionCampoRival: number;
  tiros: number;
  tirosPuerta: number;
  corners: number;
  faltas: number;
  amarillas: number;
  rojas: number;
  fuerasDeJuego: number;
  /** Fueras de juego que provocó la defensa de este equipo. */
  fuerasDeJuegoProvocados: number;
  recuperaciones: number;
  recuperacionesCampoRival: number;
  pases: number;
  pasesCompletados: number;
  lesiones: number;
  /** Cansancio medio de los jugadores en el campo al final (0 = frescos). */
  cansancioMedio: number;
}

export interface Estadisticas {
  local: EstadisticasEquipo;
  visitante: EstadisticasEquipo;
}

export type DecisionPartido =
  | { participanteId: string; tipo: 'sustitucion'; datos: { sale: number; entra: number } }
  | { participanteId: string; tipo: 'formacion'; datos: { formacion: FormacionId; asignacion?: { casillaId: string; jugadorId: number }[] } }
  | { participanteId: string; tipo: 'tactica'; datos: { tactica: Tactica } }
  | { participanteId: string; tipo: 'lanzadores'; datos: { lanzadores: Lanzadores } }
  | { participanteId: string; tipo: 'recolocacion'; datos: { asignacion: { casillaId: string; jugadorId: number }[] } };

/** Decisión registrada: la del participante más el tick en que se pidió y en que se aplicó. */
export type DecisionRegistrada = DecisionPartido & { solicitadaEnTick: number; aplicadaEnTick?: number };

export type ModoAvance = 'parte' | 'interrupcion' | 'final';

export interface Fotograma {
  tick: number;
  balon: [number, number];
  j: Record<number, [number, number]>;
}
