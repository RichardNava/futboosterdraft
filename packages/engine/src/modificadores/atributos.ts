/**
 * Atributos de juego de un jugador en el partido (T083: posición, cansancio y bonificaciones).
 *
 * Los stats de cada demarcación se traducen a atributos comunes (pase, regate, remate…), ya con la
 * penalización por posición (`statsEfectivos`), las bonificaciones de equipo de las virtudes y el
 * cansancio aplicados.
 */
import { FORMACIONES, statsEfectivos, type Demarcacion } from '@fbd/domain';
import type { EquipoEstado, EstadoMotor, JugadorEnPartido } from '../estado/estado';
import { bonusProvocador, conRasgos005, equipoConMultiplicadores, multiplicadorEquipo, multiplicadorIndividual } from './defectos';
import { bonusEquipo } from './virtudes';

export type Atributo =
  | 'pase'
  | 'vision'
  | 'regate'
  | 'remate'
  | 'velocidad'
  | 'quite'
  | 'anticipacion'
  | 'fisico'
  | 'aereo'
  | 'desmarque'
  | 'centro'
  | 'parada';

type S = Record<string, number>;
const media = (s: S) => Object.values(s).reduce((a, b) => a + b, 0) / Object.values(s).length;

const TRADUCCION: Readonly<Record<Demarcacion, (s: S) => Record<Atributo, number>>> = {
  POR: (s) => ({
    pase: s.distribucion!,
    vision: s.distribucion!,
    regate: s.distribucion! * 0.6,
    remate: 20,
    velocidad: s.agilidad! * 0.8,
    quite: s.defensa!,
    anticipacion: s.colocacion!,
    fisico: s.aereo!,
    aereo: s.aereo!,
    desmarque: 20,
    centro: s.distribucion! * 0.7,
    parada: (s.agilidad! + s.colocacion!) / 2,
  }),
  DEF: (s) => ({
    pase: s.tecnica!,
    vision: s.tecnica!,
    regate: (s.tecnica! + s.velocidad!) / 2,
    remate: (s.anticipacion! + s.tecnica!) / 2 - 8,
    velocidad: s.velocidad!,
    quite: s.tackling!,
    anticipacion: s.anticipacion!,
    fisico: s.marcaje!,
    aereo: s.anticipacion!,
    desmarque: s.velocidad! * 0.8,
    centro: s.tecnica!,
    parada: media(s) * 0.5,
  }),
  MED: (s) => ({
    pase: s.pase!,
    vision: s.vision!,
    regate: s.tecnica!,
    remate: s.disparo!,
    velocidad: s.velocidad!,
    quite: s.posicionamiento!,
    anticipacion: s.posicionamiento!,
    fisico: (s.posicionamiento! + s.velocidad!) / 2,
    aereo: s.posicionamiento! * 0.85,
    desmarque: s.vision!,
    centro: s.pase!,
    parada: media(s) * 0.5,
  }),
  DEL: (s) => ({
    pase: s.creatividad!,
    vision: s.creatividad!,
    regate: s.regate!,
    remate: s.finalizacion!,
    velocidad: s.velocidad!,
    quite: s.agresividad! * 0.8,
    anticipacion: s.agresividad! * 0.8,
    fisico: s.agresividad!,
    aereo: (s.finalizacion! + s.desmarque!) / 2,
    desmarque: s.desmarque!,
    centro: s.creatividad!,
    parada: media(s) * 0.5,
  }),
};

/**
 * Atributos sin cansancio de cada jugador, que solo dependen de la formación, su casilla y la
 * bonificación de equipo. Se recalculan cuando cambia alguna; el resultado es exactamente el mismo que
 * calcularlos cada vez, pero el motor los pide miles de veces por partido (T140). La clave es el objeto
 * del jugador en el estado, que `avanzar` copia en cada llamada, así que la caché nunca cruza partidos.
 */
const cacheAtributos = new WeakMap<
  JugadorEnPartido,
  { formacion: string; casilla: string | null; posicion: string | undefined; bonus: number; valores: Record<Atributo, number>; media: number }
>();

/** Atributo de un jugador en el partido. */
export function atributo(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido, nombre: Atributo): number {
  return atributoConBonus(estado, equipo, j, nombre, bonusEquipo(estado, equipo, j));
}

/**
 * Igual que `atributo`, con la bonificación de equipo ya calculada (la capa espacial la calcula una vez por tick).
 *
 * Orden (spec 005, research R6): stats base → penalización por posición → bonificaciones en puntos (virtudes de equipo
 * y Provocador del rival) → cansancio → multiplicadores de los defectos (Polémico × Rebelde × Estrellita).
 */
export function atributoConBonus(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido, nombre: Atributo, bonus: number): number {
  const valor = entradaAtributos(estado, equipo, j, bonus + bonusProvocador(estado, equipo, j)).valores[nombre] * (1 - j.cansancio);
  if (!conRasgos005(estado) || !equipoConMultiplicadores(equipo)) return valor;
  return valor * multiplicadorEquipo(estado, equipo) * multiplicadorIndividual(estado, equipo, j);
}

/**
 * Media efectiva de un jugador en el campo: la de sus stats con la penalización por posición y las bonificaciones en
 * puntos, sin cansancio ni multiplicadores. Es la que compara Estrellita (spec 005).
 */
export function mediaEfectiva(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido): number {
  return entradaAtributos(estado, equipo, j, bonusEquipo(estado, equipo, j) + bonusProvocador(estado, equipo, j)).media;
}

function entradaAtributos(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido, bonus: number) {
  let entrada = cacheAtributos.get(j);
  if (!entrada || entrada.formacion !== equipo.formacion || entrada.casilla !== j.casillaId || entrada.posicion !== j.posicion || entrada.bonus !== bonus) {
    const casilla = j.casillaId ? FORMACIONES[equipo.formacion].casillas.find((c) => c.id === j.casillaId) : undefined;
    // Colocado fuera de la zona de su casilla, juega con la posición efectiva de su zona (FR-034).
    const destino = casilla && j.posicion && casilla.id !== 'POR' ? { posicionesAdmitidas: [j.posicion] } : casilla;
    const efectivos = destino
      ? statsEfectivos(j.jugador, destino, estado.parametros, { bonus }).stats
      : (j.jugador.stats as unknown as S);
    entrada = {
      formacion: equipo.formacion,
      casilla: j.casillaId,
      posicion: j.posicion,
      bonus,
      valores: TRADUCCION[j.jugador.demarcacion](efectivos),
      media: media(efectivos),
    };
    cacheAtributos.set(j, entrada);
  }
  return entrada;
}
