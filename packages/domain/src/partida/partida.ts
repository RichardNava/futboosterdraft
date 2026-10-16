/**
 * Entidad Partida (data-model §2.2): configuración, validación y máquina de estados.
 */
import { Rng, type Semilla } from '../rng/xoshiro';

export type Modo = 'liga' | 'playoff' | 'mixto';
export type TipoSimulacion = 'rapida' | '2d';
export type Ritmo = 'directo' | 'asincrono';
export type NivelNPC = 'amateur' | 'intermedio' | 'avanzado' | 'PRO';
export type EstadoPartida = 'buscando' | 'en_draft' | 'en_torneo' | 'terminada' | 'cancelada' | 'abandonada';
export type TipoUsuario = 'registrado' | 'invitado';

export const NIVELES_NPC: readonly NivelNPC[] = ['amateur', 'intermedio', 'avanzado', 'PRO'];
export const NIVELES_RELLENO: readonly NivelNPC[] = ['amateur', 'intermedio', 'avanzado'];

export interface TiemposPartida {
  busquedaS: number;
  turnoDraftS: number;
  preparacionS: number;
  preparacionInicialS: number;
  descansoS: number;
}

export interface ConfigPartida {
  modo: Modo;
  numParticipantes: number;
  tipoSimulacion: TipoSimulacion;
  ritmo: Ritmo;
  plazoJornadaHoras: number;
  /** NPC añadidos explícitamente por el anfitrión (PRO solo por esta vía, FR-059). */
  npc: { nivel: NivelNPC }[];
  /**
   * Plazas reservadas a personas, incluido el anfitrión. Si no se indica, son todas las que no ocupan
   * los NPC añadidos. Las plazas humanas que sigan libres al empezar se rellenan con NPC (FR-003).
   */
  plazasHumanas?: number;
  tiempos: TiemposPartida;
  colecciones: string[];
}

export const TIEMPOS_POR_DEFECTO: TiemposPartida = {
  busquedaS: 180,
  turnoDraftS: 45,
  preparacionS: 180,
  preparacionInicialS: 300,
  descansoS: 120,
};

export function configPorDefecto(): ConfigPartida {
  return {
    modo: 'liga',
    numParticipantes: 4,
    tipoSimulacion: 'rapida',
    ritmo: 'directo',
    plazoJornadaHoras: 24,
    npc: [],
    tiempos: { ...TIEMPOS_POR_DEFECTO },
    colecciones: ['Core'],
  };
}

export interface ErrorConfig {
  codigo: 'NUM_PARTICIPANTES_INVALIDO' | 'INVITADO_NO_PERMITIDO' | 'DEMASIADOS_NPC' | 'CONFIG_INVALIDA';
  mensaje: string;
}

export function numParticipantesValido(modo: Modo, n: number): boolean {
  if (!Number.isInteger(n)) return false;
  if (modo === 'liga') return n >= 4 && n <= 8;
  if (modo === 'playoff') return n === 4 || n === 8 || n === 16;
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
      mensaje: 'Participantes: liga de 4 a 8; playoff de 4, 8 o 16; mixto, 8',
    });
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
  if (!Number.isInteger(c.plazoJornadaHoras) || c.plazoJornadaHoras < 1) {
    errores.push({ codigo: 'CONFIG_INVALIDA', mensaje: 'El plazo de jornada debe ser de al menos 1 hora' });
  }
  const t = c.tiempos;
  if (Object.values(t).some((v) => !Number.isFinite(v) || v <= 0)) {
    errores.push({ codigo: 'CONFIG_INVALIDA', mensaje: 'Los tiempos deben ser positivos' });
  }
  if (c.colecciones.length === 0) errores.push({ codigo: 'CONFIG_INVALIDA', mensaje: 'Debe haber al menos una colección' });
  if (anfitrion === 'invitado') {
    if (c.ritmo !== 'directo') {
      errores.push({ codigo: 'INVITADO_NO_PERMITIDO', mensaje: 'Un invitado solo puede jugar partidas en directo' });
    }
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

/** Niveles aleatorios para rellenar plazas: amateur, intermedio o avanzado, nunca PRO (FR-059). */
export function rellenarConNPC(cantidad: number, semilla: Semilla): NivelNPC[] {
  const rng = new Rng(semilla);
  return Array.from({ length: cantidad }, () => rng.elegir(NIVELES_RELLENO));
}

/** Asientos sorteados con la semilla de la partida (FR-005). */
export function sortearAsientos<T>(participantes: readonly T[], semilla: Semilla): T[] {
  return new Rng(semilla).barajar(participantes);
}

/** Minutos seguidos sin conexión tras los que se abandona una partida de invitado. */
export const MINUTOS_ABANDONO_INVITADO = 10;

export function debeAbandonarsePorDesconexion(desconectadoDesde: number | null, ahora: number): boolean {
  return desconectadoDesde !== null && ahora - desconectadoDesde >= MINUTOS_ABANDONO_INVITADO * 60_000;
}
