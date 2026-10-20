/**
 * Decisiones de draft de los NPC (T125). Sustituye a `basico.ts` en el servidor.
 *
 * Spec 003 (FR-037 a FR-037b): tras elegir, el NPC puede cometer un error de draft (`errorDraft`) con la
 * probabilidad de su nivel, y el PRO toma una decisión dudosa por draft (la segunda mejor carta, a ≤ 1,5 puntos)
 * en un turno elegido con la semilla del draft (`semillaDraft`).
 */
import {
  derivarSemilla,
  FORMACIONES_IDS,
  parametrosActuales,
  Rng,
  TURNOS_POR_RONDA,
  type FormacionId,
  type Jugador,
  type ParametrosEquilibrado,
  type Semilla,
} from '@fbd/domain';
import { decisionDudosa, errorDraft, type CartaValorada } from './errores';
import { cobertura, valorCarta } from './evaluador';
import { erroresDe, FORMACIONES_BASICAS, PERFILES, TODAS_LAS_FORMACIONES, type NivelIA } from './perfiles';

export interface OpcionesDraft {
  /** Participantes de la mesa: si el sobre tiene más cartas que participantes, volverá a este asiento. */
  participantes?: number;
  parametros?: ParametrosEquilibrado;
  /** Semilla del draft de este NPC (la misma en todos sus turnos): fija desde qué turno toma el PRO su decisión dudosa. */
  semillaDraft?: Semilla;
  /** El PRO ya tomó su decisión dudosa en este draft (lo recuerda quien llama). */
  dudosaHecha?: boolean;
}

/** Error aplicado en una elección: uno de draft, la decisión dudosa del PRO o ninguno. */
export type ErrorEleccion = 'draft' | 'dudosa' | null;

/**
 * Elección (0..23) a partir de la cual el PRO toma su decisión dudosa: la primera, desde ahí, en la que haya una
 * segunda carta a ≤ 1,5 puntos de la mejor. Cae en la primera mitad del draft para que casi siempre la haya.
 */
export function inicioDudosa(semillaDraft: Semilla): number {
  return new Rng(derivarSemilla(semillaDraft, 'dudosa')).entero(0, 11);
}

/** Penalización (en puntos de media) a una carta que probablemente vuelva en este mismo sobre. */
const DESCUENTO_VUELTA = 4;

/**
 * Formación objetivo del NPC avanzado: la que mejor cubre su plantilla parcial; con pocas cartas aún,
 * una de las básicas al azar (con la semilla).
 */
export function formacionObjetivo(plantilla: readonly Jugador[], rng: Rng): FormacionId {
  if (plantilla.length < 6) return rng.elegir(FORMACIONES_BASICAS);
  let mejor: FormacionId = FORMACIONES_IDS[0];
  let mejorHuecos = Infinity;
  for (const f of FORMACIONES_IDS) {
    // Cuantas menos plazas sin cubrir le queden a la plantilla en esa formación, mejor encaja.
    const huecos = plantilla.reduce((n, j) => n - cobertura(j, [], [f]), 0);
    if (huecos < mejorHuecos) {
      mejorHuecos = huecos;
      mejor = f;
    }
  }
  return mejor;
}

/**
 * Elige una carta del sobre. Mismos datos y misma semilla dan siempre la misma carta; el PRO no tiene
 * ruido y elige el máximo del evaluador.
 */
export function elegirCarta(
  nivel: NivelIA,
  sobre: readonly Jugador[],
  plantillaParcial: readonly Jugador[],
  ronda: number,
  turno: number,
  semilla: Semilla,
  opciones: OpcionesDraft = {},
): number {
  return elegirCartaDetallada(nivel, sobre, plantillaParcial, ronda, turno, semilla, opciones).id;
}

/** Como `elegirCarta`, pero dice además qué error se aplicó (para la revisión de SC-010b). */
export function elegirCartaDetallada(
  nivel: NivelIA,
  sobre: readonly Jugador[],
  plantillaParcial: readonly Jugador[],
  ronda: number,
  turno: number,
  semilla: Semilla,
  opciones: OpcionesDraft = {},
): { id: number; error: ErrorEleccion } {
  if (sobre.length === 0) throw new Error('El sobre está vacío');
  const perfil = PERFILES[nivel];
  const p = opciones.parametros ?? parametrosActuales();
  const rng = new Rng(semilla);
  const formaciones =
    perfil.alcanceFormaciones === 'todas'
      ? TODAS_LAS_FORMACIONES
      : perfil.alcanceFormaciones === 'objetivo'
        ? [formacionObjetivo(plantillaParcial, rng)]
        : FORMACIONES_BASICAS;

  // Anticipación: si el sobre volverá con (k − n) cartas, las peores para los demás (por media) volverán.
  const vuelven = new Set<number>();
  const n = opciones.participantes ?? 0;
  if (perfil.anticipacion && n > 0 && sobre.length > n) {
    const porMedia = [...sobre].sort((a, b) => b.media - a.media || a.id - b.id);
    for (const j of porMedia.slice(n)) vuelven.add(j.id);
  }

  // Las necesidades pesan más según avanza el draft: al final ya no hay margen para cubrirlas.
  const eleccion = (ronda - 1) * TURNOS_POR_RONDA + (turno - 1);
  const urgencia = 1 + eleccion / (3 * TURNOS_POR_RONDA);
  const pesos = { ...perfil.pesos, cobertura: perfil.pesos.cobertura * urgencia, porteros: perfil.pesos.porteros * urgencia };

  let mejor = sobre[0]!;
  let mejorValor = -Infinity;
  const valoradas: CartaValorada[] = [];
  for (const carta of sobre) {
    let valor = valorCarta(carta, plantillaParcial, pesos, formaciones, p);
    if (vuelven.has(carta.id)) valor -= DESCUENTO_VUELTA;
    valoradas.push({ carta, valor });
    // Ruido uniforme en ±ruido, en milésimas para no depender de coma flotante.
    if (perfil.ruido > 0) valor += rng.entero(-perfil.ruido * 1000, perfil.ruido * 1000) / 1000;
    if (valor > mejorValor + 1e-9) {
      mejorValor = valor;
      mejor = carta;
    }
  }

  // Errores, con un PRNG aparte para que, sin error, la elección sea la de siempre.
  const errores = erroresDe(nivel, p);
  if (errores.dudosaPorDraft && opciones.semillaDraft !== undefined && !opciones.dudosaHecha) {
    if (eleccion >= inicioDudosa(opciones.semillaDraft)) {
      const dudosa = decisionDudosa(valoradas);
      if (dudosa !== null) return { id: dudosa, error: 'dudosa' };
    }
  }
  const rngError = new Rng(derivarSemilla(semilla, 'error'));
  if (rngError.probabilidad(errores.probabilidad.draft)) {
    const otra = errorDraft(valoradas, mejor.id, errores.costeMaximo, rngError);
    if (otra !== null) return { id: otra, error: 'draft' };
  }
  return { id: mejor.id, error: null };
}
