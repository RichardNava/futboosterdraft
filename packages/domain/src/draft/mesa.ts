/**
 * Máquina de estados de la mesa de draft (FR-006 a FR-013; data-model §3).
 *
 * Funciones puras: cada operación devuelve una mesa nueva. El instante actual (`ahora`, en ms) entra
 * como parámetro. Convención de asientos: "izquierda" = asiento + 1; los sobres pasan a la izquierda
 * en las rondas 1 y 3 y a la derecha en la 2.
 */
import type { Ronda, SobreGenerado } from '../sobres/generador';

export type CodigoErrorDraft = 'NO_PARTICIPA' | 'TURNO_CERRADO' | 'YA_ELEGIDO' | 'CARTA_NO_EN_SOBRE' | 'TURNO_ABIERTO';

export class ErrorDraft extends Error {
  constructor(
    readonly codigo: CodigoErrorDraft,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorDraft';
  }
}

export interface SobreEnJuego {
  id: string;
  ronda: Ronda;
  asientoOrigen: number;
  cartas: number[];
  restantes: number[];
}

export type OrigenEleccion = 'manual' | 'auto' | 'npc';

export interface Eleccion {
  ronda: Ronda;
  turno: number;
  participanteId: string;
  sobreId: string;
  jugadorId: number;
  origen: OrigenEleccion;
}

export interface Mesa {
  /** Participantes ordenados por asiento. */
  participantes: string[];
  ronda: Ronda;
  turno: number;
  sobres: SobreEnJuego[];
  elecciones: Eleccion[];
  /** Media de cada carta de la mesa, para la elección automática. */
  medias: Record<number, number>;
  turnoS: number;
  venceEn: number;
  estado: 'en_turno' | 'terminada';
}

export const TURNOS_POR_RONDA = 8;

export const idSobre = (ronda: Ronda, asientoOrigen: number) => `r${ronda}-a${asientoOrigen}`;

/** Asiento que recibe el sobre del asiento `asiento` al resolver un turno de la ronda `ronda`. */
export function receptor(asiento: number, ronda: Ronda, n: number): number {
  const d = ronda === 2 ? -1 : 1;
  return (((asiento + d) % n) + n) % n;
}

export function crearMesa(datos: {
  participantes: string[];
  sobres: SobreGenerado[];
  medias: Record<number, number>;
  ahora: number;
  turnoS: number;
}): Mesa {
  const n = datos.participantes.length;
  if (datos.sobres.length !== 3 * n) throw new Error(`Se esperaban ${3 * n} sobres y hay ${datos.sobres.length}`);
  return {
    participantes: [...datos.participantes],
    ronda: 1,
    turno: 1,
    sobres: datos.sobres.map((s) => ({
      id: idSobre(s.ronda, s.asientoOrigen),
      ronda: s.ronda,
      asientoOrigen: s.asientoOrigen,
      cartas: [...s.cartas],
      restantes: [...s.cartas],
    })),
    elecciones: [],
    medias: { ...datos.medias },
    turnoS: datos.turnoS,
    venceEn: datos.ahora + datos.turnoS * 1000,
    estado: 'en_turno',
  };
}

function asientoDe(mesa: Mesa, participanteId: string): number {
  const asiento = mesa.participantes.indexOf(participanteId);
  if (asiento < 0) throw new ErrorDraft('NO_PARTICIPA', `${participanteId} no está en la mesa`);
  return asiento;
}

/** Sobre que tiene el participante en el turno actual. */
export function sobreDe(mesa: Mesa, participanteId: string): SobreEnJuego {
  const n = mesa.participantes.length;
  const asiento = asientoDe(mesa, participanteId);
  const d = mesa.ronda === 2 ? -1 : 1;
  const origen = (((asiento - d * (mesa.turno - 1)) % n) + n) % n;
  const sobre = mesa.sobres.find((s) => s.ronda === mesa.ronda && s.asientoOrigen === origen);
  if (!sobre) throw new Error(`No existe el sobre de la ronda ${mesa.ronda} del asiento ${origen}`);
  return sobre;
}

const eleccionDelTurno = (mesa: Mesa, participanteId: string) =>
  mesa.elecciones.find((e) => e.participanteId === participanteId && e.ronda === mesa.ronda && e.turno === mesa.turno);

export function haElegido(mesa: Mesa, participanteId: string): boolean {
  return eleccionDelTurno(mesa, participanteId) !== undefined;
}

export function todosEligieron(mesa: Mesa): boolean {
  return mesa.participantes.every((p) => haElegido(mesa, p));
}

/** Registra la elección de un participante en el turno actual (FR-010). */
export function elegir(
  mesa: Mesa,
  participanteId: string,
  jugadorId: number,
  ahora: number,
  origen: OrigenEleccion = 'manual',
): Mesa {
  asientoDe(mesa, participanteId);
  if (mesa.estado !== 'en_turno' || ahora > mesa.venceEn) {
    throw new ErrorDraft('TURNO_CERRADO', 'El turno ya está cerrado');
  }
  if (haElegido(mesa, participanteId)) throw new ErrorDraft('YA_ELEGIDO', 'Ya has elegido en este turno');
  const sobre = sobreDe(mesa, participanteId);
  if (!sobre.restantes.includes(jugadorId)) {
    throw new ErrorDraft('CARTA_NO_EN_SOBRE', 'Esa carta no está en tu sobre');
  }
  return {
    ...mesa,
    elecciones: [
      ...mesa.elecciones,
      { ronda: mesa.ronda, turno: mesa.turno, participanteId, sobreId: sobre.id, jugadorId, origen },
    ],
  };
}

/** Carta que se elige automáticamente: la de mayor media; con empate, la primera del sobre (FR-009). */
export function cartaAutomatica(mesa: Mesa, sobre: SobreEnJuego): number {
  let mejor = sobre.restantes[0]!;
  for (const id of sobre.restantes) {
    if ((mesa.medias[id] ?? 0) > (mesa.medias[mejor] ?? 0)) mejor = id;
  }
  return mejor;
}

/**
 * Cierra el turno: autoelige por quien falte (solo si ya venció el plazo), retira las cartas elegidas
 * de los sobres y abre el siguiente turno o ronda. Las elecciones solo se aplican a los sobres aquí, de
 * modo que durante el turno nadie ve qué eligieron los demás.
 */
export function resolverTurno(mesa: Mesa, ahora: number): Mesa {
  if (mesa.estado !== 'en_turno') throw new ErrorDraft('TURNO_CERRADO', 'El draft ya ha terminado');
  const faltan = mesa.participantes.filter((p) => !haElegido(mesa, p));
  if (faltan.length > 0 && ahora <= mesa.venceEn) {
    throw new ErrorDraft('TURNO_ABIERTO', 'Aún faltan elecciones y queda tiempo');
  }

  let elecciones = mesa.elecciones;
  for (const p of faltan) {
    const sobre = sobreDe(mesa, p);
    elecciones = [
      ...elecciones,
      { ronda: mesa.ronda, turno: mesa.turno, participanteId: p, sobreId: sobre.id, jugadorId: cartaAutomatica(mesa, sobre), origen: 'auto' },
    ];
  }

  const delTurno = elecciones.filter((e) => e.ronda === mesa.ronda && e.turno === mesa.turno);
  const elegidasPorSobre = new Map(delTurno.map((e) => [e.sobreId, e.jugadorId]));
  const sobres = mesa.sobres.map((s) =>
    elegidasPorSobre.has(s.id) ? { ...s, restantes: s.restantes.filter((id) => id !== elegidasPorSobre.get(s.id)) } : s,
  );

  let { ronda, turno } = mesa;
  let estado: Mesa['estado'] = 'en_turno';
  if (turno < TURNOS_POR_RONDA) turno++;
  else if (ronda < 3) {
    ronda = (ronda + 1) as Ronda;
    turno = 1;
  } else estado = 'terminada';

  return { ...mesa, sobres, elecciones, ronda, turno, estado, venceEn: estado === 'terminada' ? mesa.venceEn : ahora + mesa.turnoS * 1000 };
}

export interface VistaDraft {
  ronda: Ronda;
  turno: number;
  direccion: 'izquierda' | 'derecha';
  sobre: { id: string; cartas: number[] };
  venceEn: number;
  misElecciones: number[];
  haElegido: boolean;
  eleccionActual: number | null;
  /** Quién ha elegido ya en este turno (sin revelar qué). */
  eligieron: string[];
  terminada: boolean;
}

/** Lo que puede ver un participante: su sobre y sus elecciones, nunca las ajenas (FR-007, FR-054a). */
export function vistaParticipante(mesa: Mesa, participanteId: string): VistaDraft {
  const terminada = mesa.estado === 'terminada';
  const misElecciones = mesa.elecciones
    .filter((e) => e.participanteId === participanteId && !(e.ronda === mesa.ronda && e.turno === mesa.turno && !terminada))
    .map((e) => e.jugadorId);
  const actual = terminada ? undefined : eleccionDelTurno(mesa, participanteId);
  const sobre = terminada ? { id: '', cartas: [] } : (({ id, restantes }) => ({ id, cartas: [...restantes] }))(sobreDe(mesa, participanteId));
  return {
    ronda: mesa.ronda,
    turno: mesa.turno,
    direccion: mesa.ronda === 2 ? 'derecha' : 'izquierda',
    sobre,
    venceEn: mesa.venceEn,
    misElecciones,
    haElegido: actual !== undefined,
    eleccionActual: actual?.jugadorId ?? null,
    eligieron: terminada ? [] : mesa.participantes.filter((p) => haElegido(mesa, p)),
    terminada,
  };
}

/** Plantilla de cada participante (sus elecciones en orden). */
export function plantillas(mesa: Mesa): Record<string, number[]> {
  const resultado: Record<string, number[]> = {};
  for (const p of mesa.participantes) resultado[p] = [];
  for (const e of mesa.elecciones) resultado[e.participanteId]!.push(e.jugadorId);
  return resultado;
}
