/**
 * Liderazgo del defensa y del portero (spec 015, US6; research R9; FR-015, FR-016). Solo con el bloque `liderazgo` de
 * los parámetros; sin él, la 7.0.0.
 *
 * - Defensa líder: los defensas de su línea a `radioDefensaM` o menos se acercan a la línea del fuera de juego (el
 *   penúltimo defensor) en la fracción `correccionLinea` del mayor liderazgo cercano (`objetivos.ts`).
 * - Portero líder: suma `porcentajePortero` × su liderazgo al atributo de los defensas de su equipo en sus zonas 0 a
 *   `zonaMaxPortero` cuando defienden un duelo (`ajusteDuelo` y el duelo aéreo del balón parado).
 */
import type { ParametrosEquilibrado } from '@fbd/domain';
import type { EstadoMotor, JugadorEnPartido } from '../estado/estado';
import { dist2 } from '../espacio/aritmetica';
import { decimasDeMetros } from '../espacio/campo';
import { zonaCarrilDe } from '../espacio/geometria';

type Liderazgo = NonNullable<ParametrosEquilibrado['liderazgo']>;

/** Defensa de la línea: punto (décimas, coordenadas de su equipo) y liderazgo (0 si no es DEF). */
export interface DefensaLinea {
  x: number;
  y: number;
  liderazgo: number;
}

/** Mayor liderazgo entre los defensas de `linea` a `radioDefensaM` o menos de `defensa`, él incluido: no se acumulan. */
export function liderDeLinea(defensa: DefensaLinea, linea: readonly DefensaLinea[], p: Liderazgo): number {
  const r = decimasDeMetros(p.radioDefensaM);
  let mayor = defensa.liderazgo;
  for (const d of linea) if (d.liderazgo > mayor && dist2(d.x, d.y, defensa.x, defensa.y) <= r * r) mayor = d.liderazgo;
  return mayor;
}

/** Fracción en que un defensa se acerca a la línea con un líder de liderazgo `lider`: 0 con `baseDefensa` o menos. */
export function correccionLinea(lider: number, p: Liderazgo): number {
  return Math.min(p.maxCorreccion, Math.max(0, (p.kDefensa * (lider - p.baseDefensa)) / 25));
}

/**
 * Puntos que el portero suma a un defensa en la zona `zonaDefensa` de su equipo (0 = su área): `porcentajePortero` de lo
 * que su liderazgo pasa de `basePortero`, para que un portero medio no refuerce a todas las defensas (decisión del
 * 2026-11-17).
 */
export function bonusPortero(liderazgoPortero: number, zonaDefensa: number, p: Liderazgo): number {
  return zonaDefensa <= p.zonaMaxPortero ? p.porcentajePortero * Math.max(0, liderazgoPortero - p.basePortero) : 0;
}

/** Bonus del portero propio al DEF que defiende un duelo (0 sin el bloque, si no es DEF o si está lejos de su área). */
export function bonusLiderPortero(estado: EstadoMotor, defensor: JugadorEnPartido | undefined): number {
  const p = estado.parametros.liderazgo;
  if (!p || !defensor || defensor.jugador.demarcacion !== 'DEF') return 0;
  const q = estado.espacio.jugadores[defensor.id];
  if (!q) return 0;
  const equipo = estado.equipos.local.jugadores.includes(defensor) ? estado.equipos.local : estado.equipos.visitante;
  const arquero = equipo.jugadores.find((j) => j.enCampo && j.casillaId === 'POR');
  const liderazgo = arquero ? (arquero.jugador.stats as unknown as Record<string, number>).liderazgo : undefined;
  return liderazgo === undefined ? 0 : bonusPortero(liderazgo, zonaCarrilDe(equipo.lado, q).zona, p);
}
