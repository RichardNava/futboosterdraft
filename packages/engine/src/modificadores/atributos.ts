/**
 * Atributos de juego de un jugador en el partido (T083: posición, cansancio y bonificaciones).
 *
 * Los stats de cada demarcación se traducen a atributos comunes (pase, regate, remate…), ya con la
 * penalización por posición (`statsEfectivos`), las bonificaciones de equipo de las virtudes y la
 * penalización por energía aplicadas.
 */
import { FORMACIONES, statsEfectivos, type Demarcacion, type Jugador, type ParametrosMotor } from '@fbd/domain';
import type { EquipoEstado, EstadoMotor, JugadorEnPartido } from '../estado/estado';
import { bonusProvocador, equipoConMultiplicadores, multiplicadorEquipo, multiplicadorIndividual } from './defectos';
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
  | 'parada'
  // Spec 015 (data-model §4): solo los usan los duelos de desmarque, control con presión y liderazgo.
  | 'marcaje'
  | 'tecnica'
  | 'liderazgo';

/** Tipo de cada atributo para la penalización por energía (spec 018, FR-012). */
const TIPO_ATRIBUTO: Readonly<Record<Atributo, 'fisica' | 'tecnica' | 'mental'>> = {
  velocidad: 'fisica',
  fisico: 'fisica',
  quite: 'fisica',
  aereo: 'fisica',
  pase: 'tecnica',
  regate: 'tecnica',
  remate: 'tecnica',
  centro: 'tecnica',
  tecnica: 'tecnica',
  parada: 'tecnica',
  desmarque: 'tecnica',
  marcaje: 'tecnica',
  vision: 'mental',
  anticipacion: 'mental',
  liderazgo: 'mental',
};

type S = Record<string, number>;
const media = (s: S) => Object.values(s).reduce((a, b) => a + b, 0) / Object.values(s).length;

/**
 * Multiplicador del quite (spec 015, FR-004/005, research R3): base por demarcación (MED con MD en su carta, no en su
 * casilla) + Presionador − Mal defensor. El portero no lo usa.
 */
function multQuite(j: Jugador, p: ParametrosMotor): number {
  const q = p.quite;
  if (j.demarcacion === 'POR') return 1;
  const base = j.demarcacion === 'MED' ? (j.posicion.includes('MD') ? q.MED_MD : q.MED) : q[j.demarcacion];
  return base + (j.virtudes.includes('Presionador') ? q.presionador : 0) - (j.defectos.includes('MalDefensor') ? q.malDefensor : 0);
}

const TRADUCCION: Readonly<Record<Demarcacion, (s: S, m: number) => Record<Atributo, number>>> = {
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
    marcaje: 50,
    tecnica: s.distribucion!,
    liderazgo: s.liderazgo!,
  }),
  DEF: (s, m) => ({
    pase: s.tecnica!,
    vision: s.tecnica!,
    regate: (s.tecnica! + s.velocidad!) / 2,
    remate: (s.anticipacion! + s.tecnica!) / 2 - 8,
    velocidad: s.velocidad!,
    quite: s.tackling! * m,
    anticipacion: s.anticipacion!,
    fisico: s.marcaje!,
    aereo: s.anticipacion!,
    // Spec 015 (FR-012): su velocidad entera, la stat con la que se desmarca.
    desmarque: s.velocidad!,
    centro: s.tecnica!,
    parada: media(s) * 0.5,
    marcaje: s.marcaje!,
    tecnica: s.tecnica!,
    liderazgo: s.liderazgo!,
  }),
  MED: (s, m) => ({
    pase: s.pase!,
    vision: s.vision!,
    regate: s.tecnica!,
    remate: s.disparo!,
    velocidad: s.velocidad!,
    quite: ((s.posicionamiento! + s.velocidad!) / 2) * m,
    anticipacion: s.posicionamiento!,
    fisico: (s.posicionamiento! + s.velocidad!) / 2,
    aereo: s.posicionamiento! * 0.85,
    desmarque: s.vision!,
    centro: s.pase!,
    parada: media(s) * 0.5,
    marcaje: s.posicionamiento!,
    tecnica: s.tecnica!,
    liderazgo: 0,
  }),
  DEL: (s, m) => ({
    pase: s.creatividad!,
    vision: s.creatividad!,
    regate: s.regate!,
    remate: s.finalizacion!,
    velocidad: s.velocidad!,
    quite: ((s.agresividad! + s.velocidad!) / 2) * m,
    anticipacion: s.agresividad! * 0.8,
    fisico: s.agresividad!,
    aereo: (s.finalizacion! + s.desmarque!) / 2,
    desmarque: s.desmarque!,
    centro: s.creatividad!,
    parada: media(s) * 0.5,
    marcaje: s.agresividad!,
    tecnica: (s.regate! + s.creatividad!) / 2,
    liderazgo: 0,
  }),
};

/**
 * Atributos sin penalización por energía de cada jugador, que solo dependen de la formación, su casilla y la
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
 * y Provocador del rival) → energía → multiplicadores de los defectos (Polémico × Rebelde × Estrellita).
 */
export function atributoConBonus(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido, nombre: Atributo, bonus: number): number {
  const base = entradaAtributos(estado, equipo, j, bonus + bonusProvocador(estado, equipo, j)).valores[nombre];
  const valor = j.penalizacionFisica === 0 ? base : base * (1 - (j.penalizacionFisica * estado.parametros.fatiga.penalizacion.tipo[TIPO_ATRIBUTO[nombre]]) / 100);
  if (!equipoConMultiplicadores(equipo)) return valor;
  return valor * multiplicadorEquipo(estado, equipo) * multiplicadorIndividual(estado, equipo, j);
}

/**
 * Media efectiva de un jugador en el campo: la de sus stats con la penalización por posición y las bonificaciones en
 * puntos, sin energía ni multiplicadores. Es la que compara Estrellita (spec 005).
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
      valores: TRADUCCION[j.jugador.demarcacion](efectivos, multQuite(j.jugador, estado.parametros)),
      media: media(efectivos),
    };
    cacheAtributos.set(j, entrada);
  }
  return entrada;
}
