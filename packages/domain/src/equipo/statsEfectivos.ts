/**
 * Stats efectivos de un jugador en una casilla o zona del campo (spec 001: FR-025a, FR-028; spec 002:
 * FR-031 a FR-033, research R12, data-model §3).
 *
 * - En una de sus posiciones (o la central de una defensa de 3/5 para un DCI/DCD): sin penalización.
 * - Jugador de campo en la portería, o portero fuera de ella: −`penalizacionPosicion.porteria` (60 %).
 * - Todocampista: sin penalización fuera de la portería.
 * - Misma demarcación, posición que no tiene: −`mismaDemarcacion` (10 %).
 * - Otra demarcación: la tabla de cruces de FR-032. Con varias posiciones, se aplica la menor.
 * - Inflexible y Versátil (spec 005): si hay penalización, 5 puntos porcentuales más (`defectos.inflexible`) o menos
 *   (`virtudes.versatil`, con un mínimo de 0).
 */
import { CLAVES_STATS, POSICIONES_POR_DEMARCACION, type Demarcacion, type Jugador, type Posicion } from '../catalogo/tipos';
import { parametrosEfectivos, type ParametrosEquilibrado, type RolPenalizacion } from '../parametros/index';

export interface StatsEfectivos {
  stats: Record<string, number>;
  media: number;
  fueraDePosicion: boolean;
  /** Fracción aplicada: 0; 0,10; 0,20; 0,30; 0,40 o 0,60 con los parámetros 2.0.0. */
  penalizacion: number;
}

export interface ContextoStats {
  /** Bonificación de equipo a todos los stats (p. ej. Capitanía), aplicada tras la penalización. */
  bonus?: number;
}

/** Cualquier destino con las posiciones que admite: una casilla de formación o una zona del campo. */
export interface DestinoPosicion {
  posicionesAdmitidas: readonly Posicion[];
}

const DEMARCACION_DE: Readonly<Record<Posicion, Demarcacion>> = Object.fromEntries(
  (Object.entries(POSICIONES_POR_DEMARCACION) as [Demarcacion, readonly Posicion[]][]).flatMap(([d, ps]) => ps.map((x) => [x, d])),
) as Record<Posicion, Demarcacion>;

/** Rol de origen de una posición del jugador (paso 4 de data-model §3). */
function rolOrigen(posicion: Posicion): RolPenalizacion | 'POR' {
  if (posicion === 'MCO') return 'MED_MCO';
  if (posicion === 'MD') return 'MED_MD';
  const d = DEMARCACION_DE[posicion];
  return d;
}

/** Clase del destino (paso 5): DEF, MED_MCO (casilla o zona MCO), MED o DEL. */
function claseDestino(destino: DestinoPosicion): RolPenalizacion | 'POR' {
  if (destino.posicionesAdmitidas.includes('MCO')) return 'MED_MCO';
  return DEMARCACION_DE[destino.posicionesAdmitidas[0]!];
}

const demarcacionDeRol = (r: RolPenalizacion | 'POR'): Demarcacion => (r === 'MED_MCO' || r === 'MED_MD' ? 'MED' : r);

export function penalizacionPorPosicion(
  jugador: Pick<Jugador, 'demarcacion' | 'posicion' | 'virtudes' | 'defectos'>,
  destino: DestinoPosicion,
  p: ParametrosEquilibrado,
): number {
  const base = penalizacionBase(jugador, destino, p);
  if (base <= 0) return base;
  // Spec 005 (research R6): ajustes en puntos porcentuales, solo fuera de posición.
  const e = parametrosEfectivos(p);
  if (jugador.virtudes.includes('Versatil')) return Math.max(0, base - e.virtudes.versatil);
  return jugador.defectos?.includes('Inflexible') ? base + e.defectos.inflexible : base;
}

function penalizacionBase(jugador: Pick<Jugador, 'demarcacion' | 'posicion' | 'virtudes'>, destino: DestinoPosicion, p: ParametrosEquilibrado): number {
  const tabla = p.penalizacionPosicion;
  if (destino.posicionesAdmitidas.some((pos) => jugador.posicion.includes(pos))) return 0;
  const destinoPortero = destino.posicionesAdmitidas.includes('POR');
  if (destinoPortero !== (jugador.demarcacion === 'POR')) return tabla.porteria;
  if (jugador.virtudes.includes('Todocampista')) return 0;
  const clase = claseDestino(destino);
  let menor = Number.POSITIVE_INFINITY;
  for (const posicion of jugador.posicion) {
    const rol = rolOrigen(posicion);
    let valor: number;
    if (demarcacionDeRol(rol) === demarcacionDeRol(clase)) valor = tabla.mismaDemarcacion;
    else {
      const cruce = tabla.cruces.find((c) => c.origen === rol && c.destino === clase)
        // MED (sin MCO ni MD) hacia la casilla MCO no existe: dentro de la demarcación ya se resolvió arriba.
        ?? tabla.cruces.find((c) => c.origen === rol && demarcacionDeRol(c.destino) === demarcacionDeRol(clase));
      if (!cruce) throw new Error(`Sin penalización para ${rol} → ${clase}`);
      valor = cruce.valor;
    }
    menor = Math.min(menor, valor);
  }
  return Number.isFinite(menor) ? menor : tabla.porteria;
}

export function statsEfectivos(
  jugador: Jugador,
  destino: DestinoPosicion,
  p: ParametrosEquilibrado,
  contexto: ContextoStats = {},
): StatsEfectivos {
  const penalizacion = penalizacionPorPosicion(jugador, destino, p);
  const base = jugador.stats as unknown as Record<string, number>;
  const bonus = contexto.bonus ?? 0;
  const stats: Record<string, number> = {};
  for (const clave of CLAVES_STATS[jugador.demarcacion]) {
    const valor = Math.round((base[clave] ?? 0) * (1 - penalizacion)) + bonus;
    stats[clave] = Math.max(1, Math.min(99, valor));
  }
  const valores = Object.values(stats);
  return {
    stats,
    media: valores.reduce((a, b) => a + b, 0) / valores.length,
    fueraDePosicion: penalizacion > 0,
    penalizacion,
  };
}
