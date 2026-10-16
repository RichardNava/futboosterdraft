/**
 * Estado del motor (T081). Es un objeto plano y serializable: `avanzar` trabaja sobre una copia, de
 * modo que el mismo estado de partida siempre produce el mismo resultado (FR-040).
 */
import {
  estadoDesdeSemilla,
  FORMACIONES,
  type EstadoRng,
  type FormacionId,
  type Jugador,
  type Lanzadores,
  type ParametrosEquilibrado,
  type Tactica,
} from '@fbd/domain';
import type {
  DecisionRegistrada,
  EntradaPartido,
  EquipoPartido,
  Estadisticas,
  EstadisticasEquipo,
  EventoPartido,
  Fase,
  Lado,
  Marcador,
} from '../tipos';

export interface JugadorEnPartido {
  id: number;
  jugador: Jugador;
  /** Casilla que ocupa en la formación (null si está en el banquillo o fuera). */
  casillaId: string | null;
  enCampo: boolean;
  /** Ya jugó y salió (sustituido, lesionado o expulsado): no puede volver. */
  retirado: boolean;
  expulsado: boolean;
  lesionado: boolean;
  amarillas: number;
  /** Fracción de stats perdida por cansancio (0 = fresco). */
  cansancio: number;
}

export interface EquipoEstado {
  lado: Lado;
  participanteId: string;
  formacion: FormacionId;
  tactica: Tactica;
  lanzadores: Lanzadores;
  jugadores: JugadorEnPartido[];
  sustitucionesUsadas: number;
  /** Lanzadores de la tanda: jugadores en el campo al final del partido, en el orden designado. */
}

export interface Balon {
  /** Equipo con la posesión. */
  posesion: Lado;
  /** 0 = área propia … 5 = área rival, desde el punto de vista del equipo con la posesión. */
  zona: number;
  /** 0 = banda izquierda, 1 = centro, 2 = banda derecha (del equipo con la posesión). */
  carril: number;
  portadorId: number;
  /** Recuperación de un equipo que juega al contraataque: el siguiente pase busca la espalda rival. */
  transicion: boolean;
}

export interface RelojPartido {
  /** 1 y 2 = partes; 3 y 4 = prórroga. */
  parte: number;
  /** Segundos jugados en la parte actual (incluido el descuento). */
  segundosEnParte: number;
  /** Segundos de interrupciones en la parte (para calcular el descuento). */
  paradas: number;
  /** Descuento de la parte, fijado al llegar a su duración reglamentaria. */
  descuento: number | null;
}

export interface EstadoMotor {
  version: string;
  parametros: ParametrosEquilibrado;
  eliminatoria: boolean;
  rng: EstadoRng;
  tick: number;
  fase: Fase;
  reloj: RelojPartido;
  balon: Balon;
  equipos: Record<Lado, EquipoEstado>;
  marcador: Marcador;
  estadisticas: Estadisticas;
  eventos: EventoPartido[];
  decisionesPendientes: DecisionRegistrada[];
  decisiones: DecisionRegistrada[];
  /** Equipo que perdió el partido por quedarse con menos de 7 jugadores. */
  derrotaPorInferioridad: Lado | null;
  /** Saque de la segunda parte: el equipo que no sacó en la primera. */
  sacoPrimeraParte: Lado;
}

export const DURACION_PARTE = 45 * 60;
export const DURACION_PARTE_PRORROGA = 15 * 60;
export const MAX_SUSTITUCIONES = 5;

export const rival = (lado: Lado): Lado => (lado === 'local' ? 'visitante' : 'local');

function estadisticasVacias(): EstadisticasEquipo {
  return {
    posesion: 0,
    posesionCampoRival: 0,
    tiros: 0,
    tirosPuerta: 0,
    corners: 0,
    faltas: 0,
    amarillas: 0,
    rojas: 0,
    fuerasDeJuego: 0,
    fuerasDeJuegoProvocados: 0,
    recuperaciones: 0,
    recuperacionesCampoRival: 0,
    pases: 0,
    pasesCompletados: 0,
    lesiones: 0,
    cansancioMedio: 0,
  };
}

function crearEquipo(lado: Lado, e: EquipoPartido): EquipoEstado {
  const casillasValidas = new Set(FORMACIONES[e.formacion].casillas.map((c) => c.id));
  const ids = new Set<number>();
  const jugadores: JugadorEnPartido[] = [];
  for (const t of e.titulares) {
    if (!casillasValidas.has(t.casillaId)) throw new Error(`Casilla ${t.casillaId} no existe en ${e.formacion}`);
    if (ids.has(t.jugador.id)) throw new Error(`Jugador repetido: ${t.jugador.id}`);
    ids.add(t.jugador.id);
    jugadores.push(nuevoJugador(t.jugador, t.casillaId, true));
  }
  for (const j of e.suplentes) {
    if (ids.has(j.id)) throw new Error(`Jugador repetido: ${j.id}`);
    ids.add(j.id);
    jugadores.push(nuevoJugador(j, null, false));
  }
  return {
    lado,
    participanteId: e.participanteId,
    formacion: e.formacion,
    tactica: { ...e.tactica },
    lanzadores: { ...e.lanzadores, tanda: [...e.lanzadores.tanda] },
    jugadores,
    sustitucionesUsadas: 0,
  };
}

function nuevoJugador(jugador: Jugador, casillaId: string | null, enCampo: boolean): JugadorEnPartido {
  return { id: jugador.id, jugador, casillaId, enCampo, retirado: false, expulsado: false, lesionado: false, amarillas: 0, cansancio: 0 };
}

export function crearPartido(entrada: EntradaPartido): EstadoMotor {
  const local = crearEquipo('local', entrada.local);
  const visitante = crearEquipo('visitante', entrada.visitante);
  const estado: EstadoMotor = {
    version: entrada.version,
    parametros: entrada.parametros,
    eliminatoria: entrada.eliminatoria,
    rng: estadoDesdeSemilla(entrada.semilla),
    tick: 0,
    fase: 'primera_parte',
    reloj: { parte: 1, segundosEnParte: 0, paradas: 0, descuento: null },
    balon: { posesion: 'local', zona: 2, carril: 1, portadorId: 0, transicion: false },
    equipos: { local, visitante },
    marcador: { local: 0, visitante: 0 },
    estadisticas: { local: estadisticasVacias(), visitante: estadisticasVacias() },
    eventos: [],
    decisionesPendientes: [],
    decisiones: [],
    derrotaPorInferioridad: null,
    sacoPrimeraParte: 'local',
  };
  return estado;
}

export function enCampo(e: EquipoEstado): JugadorEnPartido[] {
  return e.jugadores.filter((j) => j.enCampo);
}

export function banquillo(e: EquipoEstado): JugadorEnPartido[] {
  return e.jugadores.filter((j) => !j.enCampo && !j.retirado);
}

export function jugadorEn(estado: EstadoMotor, id: number): { equipo: EquipoEstado; j: JugadorEnPartido } | undefined {
  for (const lado of ['local', 'visitante'] as const) {
    const j = estado.equipos[lado].jugadores.find((x) => x.id === id);
    if (j) return { equipo: estado.equipos[lado], j };
  }
  return undefined;
}

export function maxSustituciones(estado: EstadoMotor): number {
  return MAX_SUSTITUCIONES + (estado.reloj.parte >= 3 || estado.fase === 'pre_prorroga' ? 1 : 0);
}

/** Minuto mostrable: "23'", "45+2'", "90+4'", "105+1'". */
export function minutoMostrable(reloj: RelojPartido): string {
  const base = [0, 0, 45, 90, 105][reloj.parte] ?? 0;
  const duracion = reloj.parte <= 2 ? DURACION_PARTE : DURACION_PARTE_PRORROGA;
  const minutoReglamentario = Math.floor(reloj.segundosEnParte / 60) + 1;
  const tope = duracion / 60;
  if (minutoReglamentario <= tope) return `${base + minutoReglamentario}'`;
  return `${base + tope}+${minutoReglamentario - tope}'`;
}

/** Minuto de juego (entero, sin descuento separado) para reglas como el cansancio o Santo. */
export function minutoDeJuego(reloj: RelojPartido): number {
  const base = [0, 0, 45, 90, 105][reloj.parte] ?? 0;
  const duracion = reloj.parte <= 2 ? DURACION_PARTE : DURACION_PARTE_PRORROGA;
  return base + Math.min(duracion, reloj.segundosEnParte) / 60;
}
