/**
 * Tipos públicos del motor (contracts/engine-api.md).
 */
import type { FormacionId, Jugador, Lanzadores, ParametrosEquilibrado, Tactica } from '@fbd/domain';

export type Lado = 'local' | 'visitante';

export interface EquipoPartido {
  participanteId: string;
  formacion: FormacionId;
  /** `ancla`: punto de la colocación libre en unidades y coordenadas del equipo (FR-034); si falta, el de la casilla. */
  titulares: { casillaId: string; jugador: Jugador; ancla?: { x: number; y: number } }[];
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
  /** Pases intentados (corto, largo y al espacio); los centros no cuentan (FR-024). */
  pases: number;
  pasesCompletados: number;
  /** Centros intentados (FR-024). */
  centros: number;
  /** pasesCompletados / pases, en porcentaje entero (se calcula en la salida). */
  precisionPase: number;
  /** Histograma interno de pases seguidos por posesión: { [n]: posesiones } (SC-007). */
  secuencias: Record<number, number>;
  /** Conducciones y regates intentados (SC-007). */
  conducciones: number;
  /** Dos pases completados seguidos A → B → A (research R4). */
  paredes: number;
  /** Pases completados con un desplazamiento lateral de más de 35 m (research R4). */
  cambiosOrientacion: number;
  /** Posesiones que empiezan en campo propio y acaban en tiro con 4 pases o menos y en menos de 150 ticks. */
  contraataques: number;
  lesiones: number;
  /** Cansancio medio de los jugadores en el campo al final (0 = frescos). */
  cansancioMedio: number;
  /** Pases intentados de menos de 20 m y de más de 35 m (spec 003, data-model §7.2). */
  pasesCortos: number;
  pasesLargos: number;
  /** Pases de más de 35 m desde el último tercio rival (x ≥ 6.667) hacia el campo propio (x < 5.000). */
  pasesLargosAtras: number;
  /** Tiros por zona del remate (research R6). */
  tirosArea: number;
  tirosFrontal: number;
  tirosLejos: number;
  /** Goles por tipo (sin la tanda): jugada = normal + lejano + mano a mano; propia = autogoles del rival. */
  golesPorTipo: Record<GrupoGol, number>;
  golesPorZona: Record<ZonaRemate, number>;
}

/** Tipo de un tiro o de un gol (`datos.tipo`). `propia` solo aparece en los goles en propia puerta (FR-020). */
export type TipoTiro = 'normal' | 'cabeza' | 'lejano' | 'manoAMano' | 'falta' | 'penalti' | 'propia';

/** Agrupación de los goles para las estadísticas y la interfaz (research R11). */
export type GrupoGol = 'jugada' | 'cabeza' | 'falta' | 'penalti' | 'propia';

/** Zona del remate: en el área, en la frontal (≤ 25 m) o más lejos (research R6). */
export type ZonaRemate = 'area' | 'frontal' | 'lejos';

/** Contadores por jugador para la herramienta de equilibrado (data-model §7.4): no se guardan. */
export interface MetricasJugador {
  regates: number;
  /** Regates ganados (SC-007, Filigranas). */
  regatesGanados: number;
  conducciones: number;
  tirosArea: number;
  tirosFrontal: number;
  tirosLejos: number;
  pases: number;
  pasesRompeLineas: number;
  intercepciones: number;
  entradasGanadas: number;
  recuperaciones: number;
  /** Duelos (regate, conducción o entrada) ganados, como atacante o como defensor (SC-006). */
  duelosGanados: number;
  /** Conducciones de 15 m o más (SC-006). */
  conduccionesLargas: number;
  /** Goles de falta directa (SC-007, Lanzador de faltas). */
  golesFalta: number;
  /** Goles de cabeza (SC-007, Cabeceador). */
  golesCabeza: number;
  /** Goles marcados (sin los de propia puerta). */
  goles: number;
}

export interface Estadisticas {
  local: EstadisticasEquipo;
  visitante: EstadisticasEquipo;
}

export type DecisionPartido =
  | { participanteId: string; tipo: 'sustitucion'; datos: { sale: number; entra: number } }
  | {
      participanteId: string;
      tipo: 'formacion';
      datos: { formacion: FormacionId; asignacion?: { casillaId: string; jugadorId: number }[]; colocacion?: { jugadorId: number; x: number; y: number }[] };
    }
  | { participanteId: string; tipo: 'tactica'; datos: { tactica: Tactica } }
  | { participanteId: string; tipo: 'lanzadores'; datos: { lanzadores: Lanzadores } }
  | {
      participanteId: string;
      tipo: 'recolocacion';
      datos: { asignacion: { casillaId: string; jugadorId: number }[]; colocacion?: { jugadorId: number; x: number; y: number }[] };
    };

/** Decisión registrada: la del participante más el tick en que se pidió y en que se aplicó. */
export type DecisionRegistrada = DecisionPartido & { solicitadaEnTick: number; aplicadaEnTick?: number };

export type ModoAvance = 'parte' | 'interrupcion' | 'final' | 'ticks';

/**
 * Fotograma v2 (research R5; data-model §7.5): `[tick, bx, by, bz, x0, y0, x1, y1, …]` en unidades enteras
 * de campo, con los jugadores en el orden de `ordenJugadores`; (-1, -1) = fuera del campo.
 */
export type Fotograma = number[];

/** Acción con balón visible en la 2D (research R4; data-model §7.5). */
export interface AccionVisible {
  tipo: 'pase_corto' | 'pase_largo' | 'pase_espacio' | 'conduccion' | 'regate' | 'centro' | 'tiro' | 'despeje' | 'saque' | 'control';
  inicioTick: number;
  finTick: number;
  de: number;
  a?: number;
  exito: boolean;
}
