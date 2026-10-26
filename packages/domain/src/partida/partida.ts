/**
 * Entidad Partida (data-model §2.2): configuración, validación y máquina de estados.
 */
import type { ConfigDuelos } from '../duelos/tipos';
import { esFormacionId } from '../equipo/formaciones';
import { Rng, type Semilla } from '../rng/xoshiro';

/** `duelos`: modo Duelo de jugadores (spec 005, FR-060), con el cuadro del playoff y cruces resueltos por duelos. */
export type Modo = 'liga' | 'playoff' | 'mixto' | 'duelos';
export const MODOS: readonly Modo[] = ['liga', 'playoff', 'mixto', 'duelos'];

/** Formación común y Estado de forma por defecto del modo Duelo de jugadores (spec 005, FR-061, FR-064a). */
export const CONFIG_DUELOS_POR_DEFECTO: Readonly<ConfigDuelos> = { formacion: '4-3-3', estadoForma: true };

/** Configuración de duelos válida (formación conocida y Estado de forma booleano). */
export function configDuelosValida(c: unknown): c is ConfigDuelos {
  if (typeof c !== 'object' || c === null) return false;
  const { formacion, estadoForma } = c as Record<string, unknown>;
  return esFormacionId(formacion) && typeof estadoForma === 'boolean';
}
/** Modo de simulación de un partido: lo elige cada participante al abrirlo (spec 003, FR-032 a FR-035). */
export type ModoSimulacion = 'rapida' | '2d';
export type NivelNPC = 'amateur' | 'intermedio' | 'avanzado' | 'PRO';
export type EstadoPartida = 'buscando' | 'en_draft' | 'en_torneo' | 'terminada' | 'cancelada' | 'abandonada';
export type TipoUsuario = 'registrado' | 'invitado';

export const NIVELES_NPC: readonly NivelNPC[] = ['amateur', 'intermedio', 'avanzado', 'PRO'];
export const NIVELES_RELLENO: readonly NivelNPC[] = ['amateur', 'intermedio', 'avanzado'];

/** Dificultad de la partida: decide los niveles del relleno automático de NPC (spec 003, FR-038a). */
export type Dificultad = 'facil' | 'normal' | 'dificil';
export const DIFICULTADES: readonly Dificultad[] = ['facil', 'normal', 'dificil'];

/**
 * Niveles del relleno por dificultad. «Normal» los sortea uno a uno (001/FR-059); «Fácil» y «Difícil» los reparten a
 * partes iguales. Nunca PRO.
 */
export const NIVELES_RELLENO_POR_DIFICULTAD: Readonly<Record<Dificultad, readonly NivelNPC[]>> = {
  facil: ['amateur', 'intermedio'],
  normal: NIVELES_RELLENO,
  dificil: ['intermedio', 'avanzado'],
};

export interface TiemposPartida {
  busquedaS: number;
  turnoDraftS: number;
  /** Ventana del descanso en el directo contra un NPC, como límite frente a un humano ausente. */
  descansoS: number;
}

export interface ConfigPartida {
  modo: Modo;
  numParticipantes: number;
  /** Plazo de cada jornada; solo se aplica con 2 o más humanos activos (FR-030, research R9). */
  plazoJornadaHoras: number;
  /** NPC añadidos explícitamente por el anfitrión (PRO solo por esta vía, FR-059). */
  npc: { nivel: NivelNPC }[];
  /**
   * Plazas reservadas a personas, incluido el anfitrión. Si no se indica, son todas las que no ocupan
   * los NPC añadidos. Las plazas humanas que sigan libres al empezar se rellenan con NPC (FR-003).
   */
  plazasHumanas?: number;
  /** Niveles del relleno automático de NPC (spec 003, FR-038a). */
  dificultad: Dificultad;
  tiempos: TiemposPartida;
  colecciones: string[];
  /** Solo en el modo duelos (spec 005): formación común y Estado de forma; por defecto, `CONFIG_DUELOS_POR_DEFECTO`. */
  duelos?: ConfigDuelos;
}

export const TIEMPOS_POR_DEFECTO: TiemposPartida = {
  busquedaS: 180,
  turnoDraftS: 45,
  descansoS: 120,
};

export function configPorDefecto(): ConfigPartida {
  return {
    modo: 'liga',
    numParticipantes: 4,
    plazoJornadaHoras: 24,
    npc: [],
    dificultad: 'normal',
    tiempos: { ...TIEMPOS_POR_DEFECTO },
    colecciones: ['core'],
  };
}

export interface ErrorConfig {
  codigo: 'NUM_PARTICIPANTES_INVALIDO' | 'INVITADO_NO_PERMITIDO' | 'DEMASIADOS_NPC' | 'CONFIG_INVALIDA';
  mensaje: string;
}

export function numParticipantesValido(modo: Modo, n: number): boolean {
  if (!Number.isInteger(n)) return false;
  if (modo === 'liga') return n >= 4 && n <= 8;
  if (modo === 'playoff' || modo === 'duelos') return n === 4 || n === 8 || n === 16;
  return n === 8;
}

export function plazasHumanasEfectivas(c: ConfigPartida): number {
  return c.plazasHumanas ?? c.numParticipantes - c.npc.length;
}

export function validarConfigPartida(c: ConfigPartida, anfitrion: TipoUsuario): ErrorConfig[] {
  const errores: ErrorConfig[] = [];
  if (!numParticipantesValido(c.modo, c.numParticipantes)) {
    errores.push({
      codigo: 'NUM_PARTICIPANTES_INVALIDO',
      mensaje: 'Participantes: liga de 4 a 8; playoff y Duelo de jugadores de 4, 8 o 16; mixto, 8',
    });
  }
  if (!MODOS.includes(c.modo)) errores.push({ codigo: 'CONFIG_INVALIDA', mensaje: 'Modo de juego desconocido' });
  if (c.duelos !== undefined && (c.modo !== 'duelos' || !configDuelosValida(c.duelos))) {
    errores.push({ codigo: 'CONFIG_INVALIDA', mensaje: 'Configuración de duelos inválida' });
  }
  const humanas = plazasHumanasEfectivas(c);
  if (!Number.isInteger(humanas) || humanas < 1) {
    errores.push({ codigo: 'CONFIG_INVALIDA', mensaje: 'Debe haber al menos una plaza humana (el anfitrión)' });
  }
  if (c.npc.length + humanas > c.numParticipantes) {
    errores.push({ codigo: 'DEMASIADOS_NPC', mensaje: 'Hay más NPC y plazas humanas que participantes' });
  }
  if (c.npc.some((n) => !NIVELES_NPC.includes(n.nivel))) {
    errores.push({ codigo: 'CONFIG_INVALIDA', mensaje: 'Nivel de NPC desconocido' });
  }
  if (!DIFICULTADES.includes(c.dificultad)) {
    errores.push({ codigo: 'CONFIG_INVALIDA', mensaje: 'Dificultad desconocida' });
  }
  if (!Number.isInteger(c.plazoJornadaHoras) || c.plazoJornadaHoras < 1) {
    errores.push({ codigo: 'CONFIG_INVALIDA', mensaje: 'El plazo de jornada debe ser de al menos 1 hora' });
  }
  const t = c.tiempos;
  if (Object.values(t).some((v) => !Number.isFinite(v) || v <= 0)) {
    errores.push({ codigo: 'CONFIG_INVALIDA', mensaje: 'Los tiempos deben ser positivos' });
  }
  if (c.colecciones.length === 0) errores.push({ codigo: 'CONFIG_INVALIDA', mensaje: 'Debe haber al menos una colección' });
  if (anfitrion === 'invitado') {
    if (humanas !== 1) {
      errores.push({
        codigo: 'INVITADO_NO_PERMITIDO',
        mensaje: 'Un invitado solo puede jugar contra la IA: el resto de plazas deben ser NPC',
      });
    }
  }
  return errores;
}

export type EventoPartida = 'iniciar_draft' | 'terminar_draft' | 'terminar_torneo' | 'cancelar' | 'abandonar_invitado';

const TRANSICIONES: Readonly<Record<EstadoPartida, Partial<Record<EventoPartida, EstadoPartida>>>> = {
  buscando: { iniciar_draft: 'en_draft', cancelar: 'cancelada', abandonar_invitado: 'abandonada' },
  en_draft: { terminar_draft: 'en_torneo', abandonar_invitado: 'abandonada' },
  en_torneo: { terminar_torneo: 'terminada', abandonar_invitado: 'abandonada' },
  terminada: {},
  cancelada: {},
  abandonada: {},
};

export function transicion(estado: EstadoPartida, evento: EventoPartida): EstadoPartida {
  const siguiente = TRANSICIONES[estado][evento];
  if (!siguiente) throw new Error(`Transición no permitida: ${estado} --${evento}-->`);
  return siguiente;
}

/**
 * Niveles para rellenar plazas según la dificultad, nunca PRO (001/FR-059, 003/FR-038a). «Normal» sortea cada
 * nivel; «Fácil» y «Difícil» reparten sus dos niveles a partes iguales, con el sobrante y el orden sorteados.
 */
export function rellenarConNPC(cantidad: number, semilla: Semilla, dificultad: Dificultad = 'normal'): NivelNPC[] {
  const rng = new Rng(semilla);
  const niveles = NIVELES_RELLENO_POR_DIFICULTAD[dificultad];
  if (dificultad === 'normal') return Array.from({ length: cantidad }, () => rng.elegir(niveles));
  const inicio = rng.entero(0, niveles.length - 1);
  const reparto = Array.from({ length: cantidad }, (_, i) => niveles[(inicio + i) % niveles.length]!);
  return rng.barajar(reparto);
}

/** Asientos sorteados con la semilla de la partida (FR-005). */
export function sortearAsientos<T>(participantes: readonly T[], semilla: Semilla): T[] {
  return new Rng(semilla).barajar(participantes);
}

/** Participante visto desde el ritmo de la partida: solo importa si es humano y si sigue controlándolo él. */
export interface ParticipanteRitmo {
  /** `'humano'` o `'npc'`. */
  tipo: string;
  controladoPorNPC: boolean;
}

/** Humanos que siguen jugando la partida (los que han abandonado los controla un NPC). */
export function humanosActivos(participantes: readonly ParticipanteRitmo[]): number {
  return participantes.filter((p) => p.tipo === 'humano' && !p.controladoPorNPC).length;
}

/**
 * Ritmo deducido (research R9): con un solo humano activo no hay plazos y la siguiente jornada se abre
 * cuando él lo pide; con varios, cada jornada tiene plazo.
 */
export function soloUnHumano(participantes: readonly ParticipanteRitmo[]): boolean {
  return humanosActivos(participantes) <= 1;
}

/** Minutos seguidos sin conexión tras los que se abandona una partida de invitado. */
export const MINUTOS_ABANDONO_INVITADO = 10;

export function debeAbandonarsePorDesconexion(desconectadoDesde: number | null, ahora: number): boolean {
  return desconectadoDesde !== null && ahora - desconectadoDesde >= MINUTOS_ABANDONO_INVITADO * 60_000;
}
