/**
 * Estado del motor (T081). Es un objeto plano y serializable: `avanzar` trabaja sobre una copia, de
 * modo que el mismo estado de partida siempre produce el mismo resultado (FR-040).
 */
import {
  calcularColocacion,
  estadoDesdeSemilla,
  FORMACIONES,
  zonaEn,
  type PuntoColocacion,
  type EstadoRng,
  type FormacionId,
  type Jugador,
  type Lanzadores,
  type ParametrosEquilibrado,
  type Posicion,
  type Tactica,
  versionMayor,
  VERSION_MAYOR_SOPORTADA,
  VersionNoSoportada,
} from '@fbd/domain';
import type {
  AccionVisible,
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
import { colocarSaqueInicial } from '../espacio/colocacion';

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
  /** Punto de la colocación en unidades y coordenadas del equipo (research R13); si falta, el de su casilla. */
  ancla?: { x: number; y: number };
  /** Posición efectiva (la de la zona de su ancla) si se colocó libremente (US7). */
  posicion?: Posicion;
}

export interface EquipoEstado {
  lado: Lado;
  participanteId: string;
  formacion: FormacionId;
  tactica: Tactica;
  lanzadores: Lanzadores;
  jugadores: JugadorEnPartido[];
  sustitucionesUsadas: number;
  /** Ofensividad y amplitud calculadas con la colocación (FR-034b); las de la formación si no se movió nadie. */
  perfil: { ofensividad: number; amplitud: number };
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

/** Posición y velocidad de una chapa, en décimas de unidad y décimas por tick (coordenadas absolutas). */
export interface PosicionMovil {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /**
   * Último tick en que tuvo un papel en la jugada (llevar el balón, recibir, presionar, ir a su sitio en
   * un balón parado al área). Hasta `TICKS_VUELTA` después aún vuelve a su sitio y no cuenta para la altura
   * de su línea.
   */
  papel: number;
}

export type TipoAccionVisible = AccionVisible['tipo'];

/** Acción con balón en curso en la capa espacial (data-model §7.4). */
export interface AccionEnCurso {
  tipo: TipoAccionVisible;
  deId: number;
  /** Jugador hacia el que va el balón (lo sigue hasta llegar a él). */
  aId?: number;
  inicioTick: number;
  finTick: number;
  origen: { x: number; y: number };
  /** Punto de destino del balón si no va hacia un jugador. */
  destino: { x: number; y: number };
  aerea: boolean;
  exito: boolean;
  /** Velocidad del balón en vuelo (décimas por tick): va hacia su destino a esta velocidad. */
  velocidad?: number;
  /** El balón ya pasó por el punto de destino: ahora va hacia el jugador `aId`. */
  enPunto?: boolean;
  /** Reanudación a balón parado: córner, falta, saque de centro… (colocación de los jugadores, FR-022a). */
  motivo?: string;
  /** Orden de los jugadores del equipo que saca, del más adelantado al más retrasado, al empezar el saque. */
  orden?: number[];
}

export interface EstadoEspacio {
  jugadores: Record<number, PosicionMovil>;
  balon: { x: number; y: number; z: number };
  accion: AccionEnCurso | null;
  /** Puntos a los que deben llegar algunos jugadores: el receptor de un pase, el que conduce. */
  destinos: Record<number, { x: number; y: number }>;
  /** Objetivos de forma de cada titular (se recalculan cada pocos ticks; research R3). */
  objetivos: Record<number, { x: number; y: number }>;
  /**
   * Referencia del balón para la forma de los equipos: sigue al balón a una velocidad acotada, para que el
   * bloque bascule de forma progresiva y no salte con cada pase.
   */
  referencia: { x: number; y: number; tick: number };
  /** Quién va al balón en el equipo que defiende (como mucho 2; 3 en una presión coordinada). */
  presion: { lado: Lado | null; presionadores: number[]; coordinada: boolean };
  /** Tiempo de parada de la última interrupción, que se consume al recolocar el balón. */
  paradaPendiente: number;
}

/** Posesión en curso, para las estadísticas de secuencias, paredes y contraataques (research R4). */
export interface EstadoPosesion {
  lado: Lado;
  inicioTick: number;
  pases: number;
  /** La posesión empezó en el campo propio (para contar contraataques). */
  enCampoPropio: boolean;
  /** Último pase completado de esta posesión, para detectar paredes (A → B → A). */
  ultimoPase: { de: number; a: number } | null;
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
  /** Capa espacial: posiciones de jugadores y balón (research R3). */
  espacio: EstadoEspacio;
  /** Acciones con balón ya jugadas (research R4); la salida de cada tramo lleva las suyas. */
  acciones: AccionVisible[];
  posesion: EstadoPosesion;
  /**
   * El último tramo paró en un punto de decisión (interrupción, descanso…). Un tramo cortado por ticks en
   * pleno juego no lo es: las decisiones pendientes esperan a la siguiente interrupción (research R6).
   */
  puntoDecision: boolean;
  /**
   * Córner que ha salido de un tiro (rechace o parada) y se saca al principio del paso siguiente: así cada córner es
   * una interrupción propia y una cadena de córners no cabe en una sola jugada.
   */
  cornerPendiente?: Lado | null;
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
    centros: 0,
    precisionPase: 0,
    secuencias: {},
    conducciones: 0,
    paredes: 0,
    cambiosOrientacion: 0,
    contraataques: 0,
    lesiones: 0,
    cansancioMedio: 0,
    pasesCortos: 0,
    pasesLargos: 0,
    pasesLargosAtras: 0,
    tirosArea: 0,
    tirosFrontal: 0,
    tirosLejos: 0,
    golesPorTipo: { jugada: 0, cabeza: 0, falta: 0, penalti: 0, propia: 0 },
    golesPorZona: { area: 0, frontal: 0, lejos: 0 },
  };
}

function crearEquipo(lado: Lado, e: EquipoPartido, parametros: ParametrosEquilibrado): EquipoEstado {
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
  const equipo: EquipoEstado = {
    lado,
    participanteId: e.participanteId,
    formacion: e.formacion,
    tactica: { ...e.tactica },
    lanzadores: { ...e.lanzadores, tanda: [...e.lanzadores.tanda] },
    jugadores,
    sustitucionesUsadas: 0,
    perfil: { ...FORMACIONES[e.formacion].perfil },
  };
  const colocacion = e.titulares.flatMap((t) => (t.ancla ? [{ jugadorId: t.jugador.id, x: t.ancla.x, y: t.ancla.y }] : []));
  colocar(equipo, colocacion, parametros);
  return equipo;
}

/**
 * Coloca a los titulares (research R13): su ancla es su punto de la colocación (o el de su casilla); si
 * está en una zona distinta de la de su casilla, juega con la posición efectiva de esa zona. El perfil del
 * equipo (ofensividad y amplitud) es el calculado con la colocación.
 */
export function colocar(equipo: EquipoEstado, colocacion: readonly PuntoColocacion[] | undefined, parametros: ParametrosEquilibrado): void {
  const enCampo = equipo.jugadores.filter((j) => j.enCampo && j.casillaId);
  const r = calcularColocacion(
    equipo.formacion,
    enCampo.map((j) => ({ casillaId: j.casillaId!, jugadorId: j.id })),
    colocacion,
    parametros,
    (id) => equipo.jugadores.find((j) => j.id === id)!.jugador.posicion,
  );
  for (const t of r.titulares) {
    const j = enCampo.find((x) => x.id === t.jugadorId)!;
    j.ancla = { x: t.x, y: t.y };
    const casilla = FORMACIONES[equipo.formacion].casillas.find((c) => c.id === t.casillaId)!;
    if (zonaEn(casilla.zona.x, casilla.zona.y).id === t.zona.id) delete j.posicion;
    else j.posicion = t.posicionEfectiva;
  }
  equipo.perfil = { ofensividad: r.ofensividad, amplitud: r.amplitud };
}

function nuevoJugador(jugador: Jugador, casillaId: string | null, enCampo: boolean): JugadorEnPartido {
  return { id: jugador.id, jugador, casillaId, enCampo, retirado: false, expulsado: false, lesionado: false, amarillas: 0, cansancio: 0 };
}

/** Ancla de un titular: el punto de su casilla en la formación (unidades, coordenadas del equipo). */
export function anclaDeCasilla(formacion: FormacionId, casillaId: string | null): { x: number; y: number } | undefined {
  const c = casillaId ? FORMACIONES[formacion].casillas.find((x) => x.id === casillaId) : undefined;
  return c ? { x: c.zona.x, y: c.zona.y } : undefined;
}

export function crearPartido(entrada: EntradaPartido): EstadoMotor {
  // El motor de la spec 003 no puede volver a simular partidos de los parámetros 1.x ni 2.x (research R2).
  if (versionMayor(entrada.parametros.version) < VERSION_MAYOR_SOPORTADA || versionMayor(entrada.version) < VERSION_MAYOR_SOPORTADA) {
    throw new VersionNoSoportada(entrada.parametros.version);
  }
  const local = crearEquipo('local', entrada.local, entrada.parametros);
  const visitante = crearEquipo('visitante', entrada.visitante, entrada.parametros);
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
    espacio: {
      jugadores: {},
      balon: { x: 5000, y: 3200, z: 0 },
      accion: null,
      destinos: {},
      objetivos: {},
      referencia: { x: 5000, y: 3200, tick: 0 },
      presion: { lado: null, presionadores: [], coordinada: false },
      paradaPendiente: 0,
    },
    acciones: [],
    posesion: { lado: 'local', inicioTick: 0, pases: 0, enCampoPropio: true, ultimoPase: null },
    puntoDecision: true,
  };
  colocarSaqueInicial(estado, 'local');
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
