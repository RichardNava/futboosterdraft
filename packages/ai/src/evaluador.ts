/**
 * Evaluador común de los NPC (T123; research R9). Todos los niveles usan esta misma función; lo que
 * cambia entre niveles es qué partes tienen en cuenta (pesos), cuántas formaciones miran y el ruido
 * (ver `perfiles.ts`). Así el orden de dificultad sale de un único criterio (SC-010).
 *
 * El valor de una carta para una plantilla combina:
 * - **media**: la media efectiva de la carta en la mejor casilla que podría ocupar;
 * - **cobertura**: cuánto cubre posiciones que faltan para las formaciones viables;
 * - **porteros**: la escasez de porteros (se necesitan al menos 2);
 * - **sinergia**: specials de equipo que la plantilla aún no tiene y lanzadores que le faltan.
 */
import {
  autoAlineacion,
  FORMACIONES,
  statsEfectivos,
  type Alineacion,
  type FormacionId,
  type Jugador,
  type ParametrosEquilibrado,
  type Posicion,
  type Special,
} from '@fbd/domain';

export interface PesosEvaluacion {
  media: number;
  cobertura: number;
  porteros: number;
  sinergia: number;
}

/** Specials de equipo: su efecto no se acumula, así que el primero vale mucho más que los siguientes. */
const SPECIALS_EQUIPO: readonly Special[] = ['Capitania', 'Jerarquia', 'Libero', 'BoxToBox', 'FortalezaMental', 'Motivador', 'Carismatico'];
const LANZADORES: readonly Special[] = ['LanzadorPenalties', 'LanzadorFaltas'];

/** Plantilla objetivo (24 jugadores): con esto ya hay titular y suplente en cada línea. */
const CUPO_DEMARCACION = { POR: 2, DEF: 8, MED: 8, DEL: 6 } as const;
const MINIMO_PORTEROS = 2;
/** Cada casilla quiere titular y suplente de su posición. */
const PROFUNDIDAD = 2;

/** Media efectiva de un jugador en la mejor casilla de entre las formaciones dadas. */
export function mediaEnMejorCasilla(j: Jugador, formaciones: readonly FormacionId[], p: ParametrosEquilibrado): number {
  let mejor = 0;
  for (const f of formaciones) for (const c of FORMACIONES[f].casillas) mejor = Math.max(mejor, statsEfectivos(j, c, p).media);
  return mejor;
}

const encaja = (j: Pick<Jugador, 'posicion' | 'specials'>, admitidas: readonly Posicion[]) =>
  admitidas.some((pos) => j.posicion.includes(pos)) || (j.specials.includes('Todocampista') && !admitidas.includes('POR'));

/**
 * Cobertura que aporta la carta (0..1): para cada formación, la fracción de las plazas sin cubrir
 * (titular y suplente por casilla) que la carta llenaría. Se queda con la formación en que más aporta.
 */
export function cobertura(carta: Jugador, plantilla: readonly Jugador[], formaciones: readonly FormacionId[]): number {
  let mejor = 0;
  for (const f of formaciones) {
    // Plazas por grupo de posiciones admitidas (p. ej. "MC" o "DCD|DCI").
    const demanda = new Map<string, { admitidas: readonly Posicion[]; plazas: number }>();
    for (const c of FORMACIONES[f].casillas) {
      const clave = [...c.posicionesAdmitidas].sort().join('|');
      const actual = demanda.get(clave) ?? { admitidas: c.posicionesAdmitidas, plazas: 0 };
      actual.plazas += PROFUNDIDAD;
      demanda.set(clave, actual);
    }
    let huecos = 0;
    let cubre = 0;
    for (const { admitidas, plazas } of demanda.values()) {
      const oferta = plantilla.filter((j) => encaja(j, admitidas)).length;
      const hueco = Math.max(0, plazas - oferta);
      huecos += hueco;
      if (hueco > 0 && encaja(carta, admitidas)) cubre += 1;
    }
    if (huecos > 0) mejor = Math.max(mejor, Math.min(1, cubre / Math.max(1, Math.min(huecos, 3))));
  }
  return mejor;
}

/** Valor por escasez de porteros (0..1): alto si faltan porteros, negativo si ya sobran. */
export function escasezPorteros(carta: Pick<Jugador, 'demarcacion'>, plantilla: readonly Pick<Jugador, 'demarcacion'>[]): number {
  if (carta.demarcacion !== 'POR') return 0;
  const porteros = plantilla.filter((j) => j.demarcacion === 'POR').length;
  if (porteros === 0) return 1;
  if (porteros < MINIMO_PORTEROS) return 0.6;
  return porteros >= 3 ? -1 : -0.3;
}

/** Saturación de una demarcación: penaliza seguir sumando jugadores de una línea ya completa (−1..0). */
export function saturacion(carta: Pick<Jugador, 'demarcacion'>, plantilla: readonly Pick<Jugador, 'demarcacion'>[]): number {
  if (carta.demarcacion === 'POR') return 0; // la escasez de porteros ya lo cubre
  const n = plantilla.filter((j) => j.demarcacion === carta.demarcacion).length;
  const cupo = CUPO_DEMARCACION[carta.demarcacion];
  return n >= cupo ? -Math.min(1, (n - cupo + 1) / 3) : 0;
}

/** Sinergia de specials (0..1): specials de equipo nuevos para la plantilla y lanzadores que faltan. */
export function sinergia(carta: Pick<Jugador, 'specials'>, plantilla: readonly Pick<Jugador, 'specials'>[]): number {
  const presentes = new Set(plantilla.flatMap((j) => j.specials));
  let valor = 0;
  for (const s of carta.specials) {
    if (SPECIALS_EQUIPO.includes(s)) valor += presentes.has(s) ? 0.1 : 0.5;
    else if (LANZADORES.includes(s)) valor += presentes.has(s) ? 0.05 : 0.3;
    else valor += 0.15;
  }
  return Math.min(1, valor);
}

/**
 * Valor de una carta para una plantilla parcial. La media va en puntos de media (≈70–95) y el resto de
 * términos se escalan con sus pesos, de modo que unos pocos puntos de media compensen una necesidad.
 */
export function valorCarta(
  carta: Jugador,
  plantilla: readonly Jugador[],
  pesos: PesosEvaluacion,
  formaciones: readonly FormacionId[],
  p: ParametrosEquilibrado,
): number {
  const media = pesos.cobertura > 0 ? mediaEnMejorCasilla(carta, formaciones, p) : carta.media;
  return (
    pesos.media * media +
    pesos.cobertura * (cobertura(carta, plantilla, formaciones) + saturacion(carta, plantilla)) +
    pesos.porteros * escasezPorteros(carta, plantilla) +
    pesos.sinergia * sinergia(carta, plantilla)
  );
}

/**
 * Fuerza esperada de una alineación: media efectiva de los titulares en sus casillas, más la sinergia
 * de los specials de equipo presentes en el campo.
 */
export function fuerzaAlineacion(a: Alineacion, porId: ReadonlyMap<number, Jugador>, p: ParametrosEquilibrado): number {
  const casillas = new Map(FORMACIONES[a.formacion].casillas.map((c) => [c.id, c]));
  let total = 0;
  const titulares: Jugador[] = [];
  for (const t of a.titulares) {
    const j = porId.get(t.jugadorId);
    const c = casillas.get(t.casillaId);
    if (!j || !c) continue;
    titulares.push(j);
    total += statsEfectivos(j, c, p).media;
  }
  const equipo = new Set(titulares.flatMap((j) => j.specials).filter((s) => SPECIALS_EQUIPO.includes(s)));
  return total / 11 + equipo.size * 0.5;
}

/** Fuerza de una plantilla: la de su mejor alineación entre las formaciones dadas. */
export function fuerzaPlantilla(
  plantilla: readonly Jugador[],
  bajas: ReadonlySet<number>,
  formaciones: readonly FormacionId[],
  p: ParametrosEquilibrado,
): { fuerza: number; alineacion: Alineacion } {
  const porId = new Map(plantilla.map((j) => [j.id, j]));
  let mejor: { fuerza: number; alineacion: Alineacion } | null = null;
  for (const f of formaciones) {
    const alineacion = autoAlineacion(plantilla, bajas, p, { formaciones: [f] });
    const fuerza = fuerzaAlineacion(alineacion, porId, p);
    if (!mejor || fuerza > mejor.fuerza + 1e-9) mejor = { fuerza, alineacion };
  }
  return mejor!;
}
