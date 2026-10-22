/**
 * Estado del torneo (T109): jornadas, resultados, bajas, cuadro y campeón para liga, playoff y mixto
 * (FR-051 a FR-054). Funciones puras: cada operación devuelve un estado nuevo.
 */
import type { Modo } from '../partida/partida';
import { derivarSemilla, type Semilla } from '../rng/xoshiro';
import { aplicarConsecuencias, estadoBajasVacio, transicionAEliminatoria, type Baja, type EstadoBajas, type EventoConsecuencia } from './bajas';
import { calendarioLiga } from './calendario';
import { clasificacion, type FilaClasificacion } from './clasificacion';
import { avanzarCuadro, cuadroMixto, cuadroPlayoff, rondaActual, type Cuadro, type TipoRonda } from './cuadro';

export type TipoJornada = 'liga' | TipoRonda;

export interface JornadaTorneo {
  numero: number;
  tipo: TipoJornada;
  cruces: { local: string; visitante: string }[];
  descansa?: string;
  estado: 'pendiente' | 'abierta' | 'cerrada';
  /** Ronda del cuadro (solo en eliminatoria). */
  rondaCuadro?: number;
}

export interface ResultadoTorneo {
  jornada: number;
  indice: number;
  local: string;
  visitante: string;
  golesLocal: number;
  golesVisitante: number;
  penaltis?: { local: number; visitante: number };
  /** Partido del que sale el resultado (spec 002): permite excluirlo de la vista de quien no lo ha visto. */
  partidoId?: string;
}

/** Partidos que no cuentan en una vista: los "pendientes de ver" del participante que la pide (research R8). */
export interface OpcionesVista {
  excluirPartidos?: readonly string[];
}

export interface EstadoTorneo {
  modo: Modo;
  participantes: string[];
  mesas: string[][];
  semilla: Semilla;
  fase: 'liga' | 'eliminatoria';
  jornadas: JornadaTorneo[];
  resultados: ResultadoTorneo[];
  cuadro: Cuadro | null;
  campeon: string | null;
  bajas: EstadoBajas;
  /** Goles, asistencias y partidos jugados por jugador y partido (research R15; data-model §6.4). */
  aportaciones?: Aportacion[];
}

/** Lo que aporta un jugador en un partido (para las tablas de goleadores y asistentes). */
export interface Aportacion {
  partidoId: string;
  participanteId: string;
  jugadorId: number;
  goles: number;
  asistencias: number;
  jugo: boolean;
}

/**
 * Aportaciones de un partido: los eventos `gol` dan un gol al autor y una asistencia al asistente (sin los
 * goles en propia, `datos.enPropia`); juegan los titulares iniciales y los que entran en una sustitución.
 * Los lanzamientos de la tanda (`tanda_lanzamiento`) no cuentan.
 */
export function aportacionesDePartido(
  partidoId: string,
  equipos: { local: string; visitante: string },
  eventos: readonly EventoConsecuencia[],
  titulares?: { local: readonly number[]; visitante: readonly number[] },
): Aportacion[] {
  const porJugador = new Map<string, Aportacion>();
  const de = (lado: 'local' | 'visitante', jugadorId: number) => {
    const clave = `${lado}:${jugadorId}`;
    let a = porJugador.get(clave);
    if (!a) {
      a = { partidoId, participanteId: equipos[lado], jugadorId, goles: 0, asistencias: 0, jugo: false };
      porJugador.set(clave, a);
    }
    return a;
  };
  for (const lado of ['local', 'visitante'] as const) for (const id of titulares?.[lado] ?? []) de(lado, id).jugo = true;
  for (const e of eventos) {
    if (e.tipo === 'sustitucion') {
      const entra = e.jugadores.find((j) => j.rol === 'entra');
      if (entra) de(e.equipo, entra.jugadorId).jugo = true;
    } else if (e.tipo === 'gol' && e.datos.enPropia !== true) {
      for (const j of e.jugadores) {
        if (j.rol === 'autor') de(e.equipo, j.jugadorId).goles++;
        else if (j.rol === 'asistente') de(e.equipo, j.jugadorId).asistencias++;
      }
    }
  }
  return [...porJugador.values()];
}

function jornadaDeRonda(cuadro: Cuadro, ronda: number, numero: number): JornadaTorneo {
  const r = cuadro.rondas[ronda]!;
  return {
    numero,
    tipo: r.tipo,
    rondaCuadro: ronda,
    estado: 'pendiente',
    cruces: r.cruces.map((c) => ({ local: c.local!, visitante: c.visitante! })),
  };
}

export function crearTorneo(modo: Modo, participantes: string[], mesas: string[][], semilla: Semilla): EstadoTorneo {
  const base = { modo, participantes, mesas, semilla, resultados: [], campeon: null, bajas: estadoBajasVacio(), aportaciones: [] };
  // El modo Duelo de jugadores usa el cuadro del playoff (spec 005, research R10).
  if (modo === 'playoff' || modo === 'duelos') {
    const cuadro = cuadroPlayoff(participantes, mesas, derivarSemilla(semilla, 'cuadro'));
    return { ...base, fase: 'eliminatoria', cuadro, jornadas: [jornadaDeRonda(cuadro, 0, 1)] };
  }
  const jornadas = calendarioLiga(participantes, derivarSemilla(semilla, 'calendario')).map((j) => ({
    numero: j.numero,
    tipo: 'liga' as const,
    cruces: j.partidos,
    ...(j.descansa ? { descansa: j.descansa } : {}),
    estado: 'pendiente' as const,
  }));
  return { ...base, fase: 'liga', cuadro: null, jornadas };
}

/** Siguiente jornada por jugar (abierta o pendiente). */
export function jornadaActual(t: EstadoTorneo): JornadaTorneo | undefined {
  return t.jornadas.find((j) => j.estado !== 'cerrada');
}

export function abrirJornada(t: EstadoTorneo, numero: number): EstadoTorneo {
  return { ...t, jornadas: t.jornadas.map((j) => (j.numero === numero ? { ...j, estado: 'abierta' } : j)) };
}

export function esEliminatoria(j: JornadaTorneo): boolean {
  return j.tipo !== 'liga';
}

export function clasificacionActual(t: EstadoTorneo, opciones: OpcionesVista = {}): FilaClasificacion[] {
  const excluidos = new Set(opciones.excluirPartidos ?? []);
  const liga = t.resultados.filter(
    (r) => t.jornadas.find((j) => j.numero === r.jornada)?.tipo === 'liga' && !(r.partidoId && excluidos.has(r.partidoId)),
  );
  return clasificacion(t.participantes, liga, derivarSemilla(t.semilla, 'desempate'));
}

/** Registra el resultado de un partido y aplica sus consecuencias (bajas y amarillas). */
export function registrarResultado(
  t: EstadoTorneo,
  r: ResultadoTorneo & {
    partidoId: string;
    eventos: readonly EventoConsecuencia[];
    /** Titulares iniciales de cada equipo (para saber quién jugó). */
    titulares?: { local: readonly number[]; visitante: readonly number[] };
  },
): { torneo: EstadoTorneo; bajasNuevas: Baja[] } {
  const jornada = t.jornadas.find((j) => j.numero === r.jornada);
  if (!jornada) throw new Error(`No existe la jornada ${r.jornada}`);
  const { estado: bajas, bajasNuevas } = aplicarConsecuencias(
    t.bajas,
    { partidoId: r.partidoId, local: r.local, visitante: r.visitante, eventos: r.eventos },
    jornada.tipo === 'liga' ? 'liga' : 'eliminatoria',
  );
  const { eventos: _e, titulares, ...resultado } = r;
  const aportaciones = [...(t.aportaciones ?? []), ...aportacionesDePartido(r.partidoId, { local: r.local, visitante: r.visitante }, r.eventos, titulares)];
  let cuadro = t.cuadro;
  if (jornada.tipo !== 'liga' && cuadro && jornada.rondaCuadro !== undefined) {
    const ganador =
      r.golesLocal !== r.golesVisitante
        ? r.golesLocal > r.golesVisitante
          ? r.local
          : r.visitante
        : (r.penaltis?.local ?? 0) > (r.penaltis?.visitante ?? 0)
          ? r.local
          : r.visitante;
    cuadro = avanzarCuadro(cuadro, jornada.rondaCuadro, r.indice, ganador);
  }
  return { torneo: { ...t, resultados: [...t.resultados, resultado], bajas, cuadro, aportaciones }, bajasNuevas };
}

/**
 * Cierra la jornada si todos sus partidos tienen resultado y prepara lo siguiente: la próxima jornada,
 * la fase final del mixto, la siguiente ronda del cuadro o el campeón.
 */
export function cerrarJornadaSiCompleta(t: EstadoTorneo, numero: number): { torneo: EstadoTorneo; cerrada: boolean } {
  const jornada = t.jornadas.find((j) => j.numero === numero);
  if (!jornada || jornada.estado === 'cerrada') return { torneo: t, cerrada: false };
  const jugados = t.resultados.filter((r) => r.jornada === numero).length;
  if (jugados < jornada.cruces.length) return { torneo: t, cerrada: false };

  let torneo: EstadoTorneo = { ...t, jornadas: t.jornadas.map((j) => (j.numero === numero ? { ...j, estado: 'cerrada' } : j)) };
  if (jornadaActual(torneo)) return { torneo, cerrada: true };

  const siguiente = Math.max(...torneo.jornadas.map((j) => j.numero)) + 1;
  if (torneo.fase === 'liga') {
    const tabla = clasificacionActual(torneo);
    if (torneo.modo === 'liga') return { torneo: { ...torneo, campeon: tabla[0]!.participanteId }, cerrada: true };
    // Mixto: los cuatro primeros pasan a semifinales.
    const cuadro = cuadroMixto(tabla.slice(0, 4).map((f) => f.participanteId));
    torneo = { ...torneo, fase: 'eliminatoria', cuadro, bajas: transicionAEliminatoria(torneo.bajas), jornadas: [...torneo.jornadas, jornadaDeRonda(cuadro, 0, siguiente)] };
    return { torneo, cerrada: true };
  }
  const cuadro = torneo.cuadro!;
  if (cuadro.campeon) return { torneo: { ...torneo, campeon: cuadro.campeon }, cerrada: true };
  const ronda = rondaActual(cuadro);
  if (ronda === undefined) return { torneo, cerrada: true };
  return { torneo: { ...torneo, jornadas: [...torneo.jornadas, jornadaDeRonda(cuadro, ronda, siguiente)] }, cerrada: true };
}
