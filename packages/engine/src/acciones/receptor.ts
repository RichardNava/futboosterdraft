/**
 * Receptor e interceptor de un pase (spec 003, research R3; FR-016, FR-017).
 *
 * - **Distancia real**: el tipo de pase restringe la distancia entre el portador y el candidato (corto ≤ 20 m,
 *   medio 20–35 m, largo > 35 m). Si en el rango no hay nadie, se usa el contiguo.
 * - **Dirección**: hacia delante ×1, lateral (|Δx| ≤ 5 m) ×0,8, hacia atrás corto (≤ 15 m) ×0,5 y hacia atrás
 *   largo ×0,05 (`pases.factorDireccion`).
 * - **Último tercio** (FR-017): con el portador en x ≥ 6.667, un pase hacia atrás de más de 20 m solo es
 *   candidato en un callejón sin salida.
 * - **Pasador**: `2^(atraccionPasador·(pase − 70)/10)`, acotado a `pases.atraccionPasadorAcotada`.
 * - **Interceptor**: el rival más cercano a la línea del pase, con la distancia dividida por su radio de
 *   intervención de anticipación.
 *
 * Todo en coordenadas del equipo que ataca y con aritmética entera en lo espacial.
 */
import type { EquipoEstado, EstadoMotor, JugadorEnPartido } from '../estado/estado';
import { dist2, dividir, isqrt } from '../espacio/aritmetica';
import { anguloTiro, AREA, decimasDeMetros, distanciaPorteria, ULTIMO_TERCIO } from '../espacio/campo';
import { papelLlegada } from '../espacio/objetivos';
import { aEquipo, type Punto } from '../espacio/geometria';
import { atributo } from '../modificadores/atributos';
import { tiene } from '../modificadores/specials';
import type { Lado } from '../tipos';
import { elegirPonderado, esPortero, holgura, radioDe, type Contexto } from './contexto';
import { pesoTiro } from './pesoTiro';

export type TipoPase = 'pase_corto' | 'pase_largo' | 'pase_espacio';
type Rango = 'corto' | 'medio' | 'largo';

/**
 * Rangos que se prueban, en orden, para cada tipo de pase: el suyo y después el contiguo. El corto y el pase al
 * espacio nunca acaban en un pase de más de 35 m: sin receptor, el portador conduce (SC-004).
 */
const RANGOS: Record<TipoPase, Rango[]> = {
  pase_corto: ['corto', 'medio'],
  pase_espacio: ['medio', 'corto'],
  pase_largo: ['largo', 'medio', 'corto'],
};

/** Rival "encima" del portador (6 m) y compañero "libre" (sin rival a menos de 3 m). */
const RIVAL_ENCIMA = 571;
const LIBRE = 286;
/** Lateral: |Δx| ≤ 5 m; hacia atrás corto: ≤ 15 m. */
const LATERAL = 476;
const ATRAS_CORTO = 1429;

export interface OpcionesReceptor {
  /** Punto (absoluto) hacia el que va el pase: se prefiere a los compañeros cercanos a él. */
  objetivo?: Punto;
  /** Solo estos candidatos (p. ej. los que cumplen el motivo de un pase largo). */
  candidatos?: readonly JugadorEnPartido[];
}

const rivalDe = (lado: Lado): Lado => (lado === 'local' ? 'visitante' : 'local');

function posicionEquipo(estado: EstadoMotor, lado: Lado, id: number): Punto | null {
  const p = estado.espacio.jugadores[id];
  return p ? aEquipo(lado, p) : null;
}

/** Factor del pasador como receptor: los que mejor la mueven reciben más, sin acaparar el juego (002/SC-008). */
export function factorPasador(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido): number {
  const a = estado.parametros.acciones;
  const [min, max] = estado.parametros.pases.atraccionPasadorAcotada;
  const f = 2 ** ((a.atraccionPasador * (atributo(estado, equipo, j, 'pase') - a.statPaseReferencia)) / 10);
  return Math.min(max, Math.max(min, f));
}

/** Factor de dirección del pase según el avance del candidato respecto al portador. */
function factorDireccion(estado: EstadoMotor, dx: number): number {
  const f = estado.parametros.pases.factorDireccion;
  if (dx > LATERAL) return f.adelante;
  if (dx >= -LATERAL) return f.lateral;
  return dx >= -ATRAS_CORTO ? f.atrasCorto : f.atrasLargo;
}

function rangoDe(estado: EstadoMotor, d2: number): Rango {
  const p = estado.parametros.pases;
  if (d2 <= p.distanciaCorto * p.distanciaCorto) return 'corto';
  return d2 <= p.distanciaLargo * p.distanciaLargo ? 'medio' : 'largo';
}

/**
 * Callejón sin salida (FR-017): rival encima, ningún compañero por delante o a su altura libre a menos de 20 m y
 * sin ángulo de tiro. Solo entonces se admite un pase largo hacia atrás desde el último tercio.
 */
export function callejonSinSalida(estado: EstadoMotor, equipo: EquipoEstado, portador: JugadorEnPartido): boolean {
  const yo = posicionEquipo(estado, equipo.lado, portador.id);
  if (!yo) return false;
  const rivalLado = rivalDe(equipo.lado);
  let encima = false;
  for (const r of estado.equipos[rivalLado].jugadores) {
    const q = r.enCampo ? posicionEquipo(estado, equipo.lado, r.id) : null;
    if (q && dist2(yo.x, yo.y, q.x, q.y) <= RIVAL_ENCIMA * RIVAL_ENCIMA) encima = true;
  }
  if (!encima) return false;
  const corto = estado.parametros.pases.distanciaCorto;
  for (const c of equipo.jugadores) {
    if (!c.enCampo || c.id === portador.id) continue;
    const q = posicionEquipo(estado, equipo.lado, c.id);
    if (!q || q.x < yo.x - LATERAL || dist2(yo.x, yo.y, q.x, q.y) > corto * corto) continue;
    if (holgura(estado, rivalLado, estado.espacio.jugadores[c.id]!) >= LIBRE * LIBRE) return false;
  }
  return pesoTiro(estado.parametros, distanciaPorteria(yo), anguloTiro(yo), false) === 0;
}

/**
 * Pesos de los candidatos a recibir un pase de este tipo (milésimas enteras). Vacío si no hay ninguno en
 * ningún rango.
 */
export function pesosReceptor(
  estado: EstadoMotor,
  equipo: EquipoEstado,
  portador: JugadorEnPartido,
  tipo: TipoPase,
  opciones: OpcionesReceptor = {},
): [JugadorEnPartido, number][] {
  const yo = posicionEquipo(estado, equipo.lado, portador.id);
  if (!yo) return [];
  const rivalLado = rivalDe(equipo.lado);
  const objetivo = opciones.objetivo ? aEquipo(equipo.lado, opciones.objetivo) : null;
  const corto = estado.parametros.pases.distanciaCorto;
  const enCampoPropio = yo.x < decimasDeMetros(35);
  // Visión de juego del pasador: con más pase, más peso a los compañeros por delante (research R9, SC-006).
  const f = estado.parametros.decision.factores.pase;
  const haciaDelante = Math.round(1000 * Math.min(f.max, Math.max(f.min, 1 + (f.k * (atributo(estado, equipo, portador, 'pase') - 70)) / 10)));
  let callejon: boolean | null = null;
  const porRango: Record<Rango, [JugadorEnPartido, number][]> = { corto: [], medio: [], largo: [] };
  for (const j of opciones.candidatos ?? equipo.jugadores) {
    if (!j.enCampo || j.id === portador.id || (esPortero(j) && !enCampoPropio)) continue;
    const q = posicionEquipo(estado, equipo.lado, j.id);
    if (!q) continue;
    const dx = q.x - yo.x;
    const d2 = dist2(yo.x, yo.y, q.x, q.y);
    // Último tercio: nada de pases largos hacia atrás salvo en un callejón sin salida (FR-017).
    if (yo.x >= ULTIMO_TERCIO && dx < 0 && d2 > corto * corto) {
      callejon ??= callejonSinSalida(estado, equipo, portador);
      if (!callejon) continue;
    }
    const libre = holgura(estado, rivalLado, estado.espacio.jugadores[j.id]!);
    // De 0,6 (un rival encima) a 1,4 (nadie a menos de 15 m).
    const factorLibre = libre >= 1430 * 1430 ? 14 : libre <= 300 * 300 ? 6 : 10;
    // Cercanía al punto del pase, si lo hay (en unidades, con el ancho pesando menos que el largo).
    let cercania = 1000;
    if (objetivo) {
      const d = dividir(Math.abs(q.x - objetivo.x) + dividir(Math.abs(q.y - objetivo.y) * 7, 10), 10);
      cercania = dividir(36_000_000, (60 + d) * (60 + d)) + 1;
    }
    const direccion = Math.round(1000 * factorDireccion(estado, dx));
    const conVision = dx > LATERAL ? dividir(direccion * haciaDelante, 1000) : direccion;
    // Llegada desde segunda línea (H11): el extremo o el mediapunta que ya está en el área rival se busca más.
    const llega = q.x >= AREA.x0 && q.y >= AREA.y0 && q.y <= AREA.y1 && papelLlegada(equipo, j) !== null;
    const factorLlegada = llega ? Math.round(1000 * estado.parametros.acciones.bonusLlegada) : 1000;
    const peso =
      dividir(dividir(cercania * factorLibre * conVision * Math.round(1000 * factorPasador(estado, equipo, j)), 10_000_000) * factorLlegada, 1000) *
      (tiene(j, 'Carismatico') ? 3 : 2);
    porRango[rangoDe(estado, d2)].push([j, Math.max(1, peso)]);
  }
  for (const rango of RANGOS[tipo]) if (porRango[rango].length > 0) return porRango[rango];
  return [];
}

/** Compañero que recibe el pase, o `undefined` si no hay ninguno. */
export function receptorDePase(
  ctx: Contexto,
  equipo: EquipoEstado,
  portador: JugadorEnPartido,
  tipo: TipoPase,
  opciones: OpcionesReceptor = {},
): JugadorEnPartido | undefined {
  const pesos = pesosReceptor(ctx.estado, equipo, portador, tipo, opciones);
  return pesos.length > 0 ? elegirPonderado(ctx.rng, pesos) : undefined;
}

/** Distancia entera de un punto a un segmento. */
export function distanciaASegmento(p: Punto, a: Punto, b: Punto): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const largo2 = vx * vx + vy * vy;
  const proyeccion = (p.x - a.x) * vx + (p.y - a.y) * vy;
  if (largo2 === 0 || proyeccion <= 0) return isqrt(dist2(p.x, p.y, a.x, a.y));
  if (proyeccion >= largo2) return isqrt(dist2(p.x, p.y, b.x, b.y));
  return dividir(Math.abs((p.x - a.x) * vy - (p.y - a.y) * vx), isqrt(largo2));
}

/**
 * Rival que corta un pase entre `origen` y `destino` (puntos absolutos): el más cercano a la línea del pase,
 * con la distancia dividida por su radio de intervención de anticipación (research R3 y R9).
 */
export function interceptorDePase(ctx: Contexto, defensor: EquipoEstado, origen: Punto, destino: Punto): JugadorEnPartido | undefined {
  const e = ctx.estado;
  let mejor: JugadorEnPartido | undefined;
  let mejorEfectiva = Infinity;
  for (const j of defensor.jugadores) {
    const q = j.enCampo ? e.espacio.jugadores[j.id] : undefined;
    if (!q) continue;
    const efectiva = dividir(distanciaASegmento(q, origen, destino) * 1000, radioDe(e, defensor, j, 'anticipacion'));
    if (efectiva < mejorEfectiva || (efectiva === mejorEfectiva && mejor !== undefined && j.id < mejor.id)) {
      mejor = j;
      mejorEfectiva = efectiva;
    }
  }
  return mejor;
}
