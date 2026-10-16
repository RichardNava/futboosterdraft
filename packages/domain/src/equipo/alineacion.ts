/**
 * Alineación: formación, titulares por casilla, suplentes, táctica y lanzadores
 * (FR-026, FR-028, FR-029a, FR-030; data-model §4.1).
 */
import type { Jugador } from '../catalogo/tipos';
import type { ParametrosEquilibrado } from '../parametros/index';
import { esFormacionId, FORMACIONES, type FormacionId } from './formaciones';
import type { Lanzadores } from './lanzadores';
import { statsEfectivos, type StatsEfectivos } from './statsEfectivos';
import { validarTactica, type Tactica } from './tactica';

export const MAX_SUPLENTES = 7;
export const TITULARES = 11;

export interface Titular {
  casillaId: string;
  jugadorId: number;
}

export interface Alineacion {
  formacion: FormacionId;
  titulares: Titular[];
  suplentes: number[];
  tactica: Tactica;
  lanzadores: Lanzadores;
}

export type CodigoErrorAlineacion = 'ALINEACION_INVALIDA' | 'TACTICA_INCOMPATIBLE' | 'JUGADOR_NO_DISPONIBLE';

export interface ErrorAlineacion {
  codigo: CodigoErrorAlineacion;
  mensaje: string;
  motivos: string[];
}

/**
 * Valida una alineación contra la plantilla y las bajas activas.
 * Con menos de 11 jugadores disponibles, se admiten tantos titulares como disponibles haya.
 */
export function validarAlineacion(
  a: Alineacion,
  plantilla: readonly number[],
  bajasActivas: ReadonlySet<number>,
): ErrorAlineacion[] {
  const errores: ErrorAlineacion[] = [];
  const motivos: string[] = [];
  const enPlantilla = new Set(plantilla);

  if (!esFormacionId(a.formacion)) {
    motivos.push(`Formación desconocida: ${String(a.formacion)}`);
    return [{ codigo: 'ALINEACION_INVALIDA', mensaje: 'Alineación no válida', motivos }];
  }
  const casillas = FORMACIONES[a.formacion].casillas.map((c) => c.id);
  const disponibles = plantilla.filter((id) => !bajasActivas.has(id)).length;
  const esperados = Math.min(TITULARES, disponibles);

  if (a.titulares.length !== esperados) {
    motivos.push(`Debe haber ${esperados} titulares y hay ${a.titulares.length}`);
  }
  const casillasUsadas = a.titulares.map((t) => t.casillaId);
  if (casillasUsadas.some((c) => !casillas.includes(c))) motivos.push('Hay casillas que no existen en la formación');
  if (new Set(casillasUsadas).size !== casillasUsadas.length) motivos.push('Una casilla está ocupada por dos jugadores');

  const titularesIds = a.titulares.map((t) => t.jugadorId);
  if (new Set(titularesIds).size !== titularesIds.length) motivos.push('Un jugador está en dos casillas');
  if (titularesIds.some((id) => !enPlantilla.has(id))) motivos.push('Hay titulares que no son de tu plantilla');

  if (a.suplentes.length > MAX_SUPLENTES) motivos.push(`Como máximo ${MAX_SUPLENTES} suplentes`);
  if (new Set(a.suplentes).size !== a.suplentes.length) motivos.push('Hay suplentes repetidos');
  if (a.suplentes.some((id) => !enPlantilla.has(id))) motivos.push('Hay suplentes que no son de tu plantilla');
  if (a.suplentes.some((id) => titularesIds.includes(id))) motivos.push('Un jugador es titular y suplente a la vez');

  const enCampo = new Set(titularesIds);
  const l = a.lanzadores;
  for (const [tipo, id] of [
    ['penaltis', l.penaltis],
    ['faltas', l.faltas],
    ['córners', l.corners],
  ] as const) {
    if (!enCampo.has(id)) motivos.push(`El lanzador de ${tipo} debe ser titular`);
  }
  const tandaEsperada = Math.min(5, titularesIds.length);
  if (l.tanda.length !== tandaEsperada || new Set(l.tanda).size !== l.tanda.length || l.tanda.some((id) => !enCampo.has(id))) {
    motivos.push(`La tanda de penaltis debe tener ${tandaEsperada} titulares distintos`);
  }

  if (motivos.length) errores.push({ codigo: 'ALINEACION_INVALIDA', mensaje: motivos[0]!, motivos });

  const deBaja = [...titularesIds, ...a.suplentes].filter((id) => bajasActivas.has(id));
  if (deBaja.length) {
    errores.push({
      codigo: 'JUGADOR_NO_DISPONIBLE',
      mensaje: 'Hay jugadores lesionados o sancionados en la alineación',
      motivos: deBaja.map((id) => `Jugador ${id} no disponible`),
    });
  }

  const tactica = validarTactica(a.tactica);
  if (tactica.length) {
    errores.push({
      codigo: tactica.some((e) => e.codigo === 'TACTICA_INCOMPATIBLE') ? 'TACTICA_INCOMPATIBLE' : 'ALINEACION_INVALIDA',
      mensaje: tactica[0]!.mensaje,
      motivos: tactica.map((e) => e.mensaje),
    });
  }
  return errores;
}

export interface CasillaPrevisualizada extends StatsEfectivos {
  casillaId: string;
  etiqueta: string;
  jugadorId: number;
}

/** Stats efectivos de cada titular en su casilla, para la pantalla de alineación (FR-028). */
export function previsualizar(
  a: Alineacion,
  buscar: (id: number) => Jugador,
  p: ParametrosEquilibrado,
): CasillaPrevisualizada[] {
  const casillas = FORMACIONES[a.formacion].casillas;
  return a.titulares.flatMap((t) => {
    const c = casillas.find((x) => x.id === t.casillaId);
    if (!c) return [];
    return [{ casillaId: c.id, etiqueta: c.etiqueta, jugadorId: t.jugadorId, ...statsEfectivos(buscar(t.jugadorId), c, p) }];
  });
}
