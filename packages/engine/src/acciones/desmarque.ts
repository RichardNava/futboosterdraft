/**
 * Desmarque contra marcaje antes del pase y control con presión (spec 015, US4 y US5; research R7 y R8; FR-011 a FR-014,
 * FR-018, FR-019). Funciones puras: localizar al marcador es un solo recorrido por los rivales, sin ordenar ni reservar
 * memoria (M2.12), y los dos duelos son la fórmula de siempre (`probabilidad`) con la curva de su bloque.
 */
import type { ParametrosEquilibrado } from '@fbd/domain';
import type { EquipoEstado, EstadoMotor, JugadorEnPartido } from '../estado/estado';
import { dist2 } from '../espacio/aritmetica';
import { decimasDeMetros } from '../espacio/campo';
import { esPortero } from './contexto';
import { probabilidad } from './duelo';

/** Rival de campo más cercano al receptor a `radioMarcaM` o menos; `null` si no hay ninguno o si el receptor es portero. */
export function marcadorDe(e: EstadoMotor, receptor: JugadorEnPartido, rivales: EquipoEstado, radioMarcaM: number): JugadorEnPartido | null {
  const q = esPortero(receptor) ? undefined : e.espacio.jugadores[receptor.id];
  if (!q) return null;
  const radio = decimasDeMetros(radioMarcaM);
  let marcador: JugadorEnPartido | null = null;
  let mejor = radio * radio + 1;
  for (const r of rivales.jugadores) {
    const pr = r.enCampo && !esPortero(r) ? e.espacio.jugadores[r.id] : undefined;
    const d = pr ? dist2(q.x, q.y, pr.x, pr.y) : mejor;
    if (d < mejor) {
      mejor = d;
      marcador = r;
    }
  }
  return marcador;
}

/** Probabilidad (milésimas) de que el receptor gane el desmarque: su `desmarque` contra el `marcaje` del marcador. */
export function probabilidadDesmarque(desmarque: number, marcaje: number, p: ParametrosEquilibrado): number {
  const d = p.desmarque!;
  return probabilidad({ base: d.base, atacante: desmarque, defensor: marcaje, pendiente: d.m }, p);
}

/** Probabilidad (milésimas) de que el receptor marcado controle: su `tecnica` contra el `quite` del marcador. */
export function probabilidadControl(tecnica: number, quite: number, p: ParametrosEquilibrado): number {
  const c = p.controlPresion!;
  return probabilidad({ base: c.base, atacante: tecnica, defensor: quite, pendiente: c.m }, p);
}
