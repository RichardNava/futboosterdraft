/**
 * Alineación y táctica de los NPC antes de cada partido (T126).
 *
 * - amateur e intermedio: la mejor alineación entre unas formaciones básicas, a veces (despiste) otra
 *   al azar; táctica por defecto.
 * - avanzado: la mejor de las 10 formaciones y una táctica según la fuerza relativa del rival.
 * - PRO: las 3 mejores formaciones × 2 tácticas, probadas con 20 partidos simulados cada una contra la
 *   alineación probable del rival (su plantilla es visible tras el draft, FR-054a), con un límite de
 *   tiempo; elige la de más puntos (y, con empate, más diferencia de goles).
 */
import {
  autoAlineacion,
  derivarSemilla,
  parametrosActuales,
  Rng,
  tacticaPorDefecto,
  type Alineacion,
  type Jugador,
  type NivelNPC,
  type ParametrosEquilibrado,
  type Semilla,
  type Tactica,
} from '@fbd/domain';
import { fuerzaAlineacion, fuerzaPlantilla } from './evaluador';
import { FORMACIONES_BASICAS, PERFILES, TODAS_LAS_FORMACIONES } from './perfiles';
import { equipoDesdeAlineacion, simularCandidata } from './pro/simulacionPrueba';

export interface OpcionesAlineacion {
  parametros?: ParametrosEquilibrado;
  /** Límite de tiempo para las simulaciones del PRO (por defecto, 2 s). */
  limiteMs?: number;
  /** Reloj en milisegundos (inyectable en pruebas). */
  ahora?: () => number;
}

export const LIMITE_PRO_MS = 2000;

export const TACTICA_OFENSIVA: Tactica = {
  sistemaDefensivo: 'zona',
  alturaBloque: 'presion_alta',
  lineaAdelantada: true,
  estiloConBalon: 'combinativo',
  juegoVertical: false,
};

export const TACTICA_DEFENSIVA: Tactica = {
  sistemaDefensivo: 'zona',
  alturaBloque: 'catenaccio',
  lineaAdelantada: false,
  estiloConBalon: 'contraataque',
  juegoVertical: true,
};

/** Táctica según la diferencia de fuerza con el rival: presiona si es mejor, se repliega si es peor. */
export function tacticaSegunRival(fuerzaPropia: number, fuerzaRival: number | null): Tactica {
  if (fuerzaRival === null) return tacticaPorDefecto();
  if (fuerzaPropia > fuerzaRival + 2) return TACTICA_OFENSIVA;
  if (fuerzaRival > fuerzaPropia + 2) return TACTICA_DEFENSIVA;
  return tacticaPorDefecto();
}

export function decidirAlineacion(
  nivel: NivelNPC,
  plantilla: readonly Jugador[],
  bajas: ReadonlySet<number>,
  rivalPlantilla: readonly Jugador[] | null,
  semilla: Semilla,
  opciones: OpcionesAlineacion = {},
): Alineacion {
  const perfil = PERFILES[nivel];
  const p = opciones.parametros ?? parametrosActuales();
  const rng = new Rng(semilla);
  const porId = new Map(plantilla.map((j) => [j.id, j]));

  if (perfil.alcanceFormaciones === 'basicas') {
    const formaciones = rng.probabilidad(perfil.despisteFormacion) ? [rng.elegir(FORMACIONES_BASICAS)] : FORMACIONES_BASICAS;
    return autoAlineacion(plantilla, bajas, p, { formaciones });
  }

  // Avanzado y PRO: todas las formaciones, ordenadas por fuerza.
  const candidatas = TODAS_LAS_FORMACIONES.map((f) => {
    const alineacion = autoAlineacion(plantilla, bajas, p, { formaciones: [f] });
    return { alineacion, fuerza: fuerzaAlineacion(alineacion, porId, p) };
  }).sort((a, b) => b.fuerza - a.fuerza || a.alineacion.formacion.localeCompare(b.alineacion.formacion));
  const rival = rivalPlantilla?.length ? fuerzaPlantilla(rivalPlantilla, new Set(), TODAS_LAS_FORMACIONES, p) : null;
  const mejor = candidatas[0]!;
  const heuristica = { ...mejor.alineacion, tactica: tacticaSegunRival(mejor.fuerza, rival?.fuerza ?? null) };
  if (perfil.simulaciones === 0 || !rival || !rivalPlantilla) return heuristica;

  // PRO: prueba candidatas con partidos simulados.
  const ahora = opciones.ahora ?? (() => performance.now());
  const limite = opciones.limiteMs ?? LIMITE_PRO_MS;
  const inicio = ahora();
  // Se deja un margen para terminar la candidata en curso sin pasarse del límite.
  const seguir = () => ahora() - inicio < limite * 0.85;
  const rivalEquipo = equipoDesdeAlineacion('rival', rival.alineacion, new Map(rivalPlantilla.map((j) => [j.id, j])));
  const pruebas: Alineacion[] = [];
  for (const c of candidatas.slice(0, 3)) {
    const t = tacticaSegunRival(c.fuerza, rival.fuerza);
    const alternativa = JSON.stringify(t) === JSON.stringify(tacticaPorDefecto()) ? (c.fuerza >= rival.fuerza ? TACTICA_OFENSIVA : TACTICA_DEFENSIVA) : tacticaPorDefecto();
    pruebas.push({ ...c.alineacion, tactica: t }, { ...c.alineacion, tactica: alternativa });
  }
  let elegida = heuristica;
  let mejorRendimiento: { puntos: number; diferencia: number } | null = null;
  const semillaPruebas = derivarSemilla(semilla, 'pro:simulaciones');
  for (const a of pruebas) {
    if (!seguir()) break;
    const r = simularCandidata(equipoDesdeAlineacion('propio', a, porId), rivalEquipo, perfil.simulaciones, semillaPruebas, p, seguir);
    // Una candidata a medias no se compara con las completas.
    if (r.jugados < perfil.simulaciones) break;
    if (!mejorRendimiento || r.puntos > mejorRendimiento.puntos + 1e-9 || (Math.abs(r.puntos - mejorRendimiento.puntos) <= 1e-9 && r.diferencia > mejorRendimiento.diferencia + 1e-9)) {
      mejorRendimiento = r;
      elegida = a;
    }
  }
  return elegida;
}
