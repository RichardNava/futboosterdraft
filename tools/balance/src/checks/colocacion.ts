/**
 * Comprobaciones de posiciones y colocación (spec 002, research R19): SC-011 (penalizaciones graduadas) y,
 * con la colocación libre (US7), SC-018. Sustituyen a la comprobación SC-005 de la spec 001.
 */
import type { Demarcacion, Posicion } from '@fbd/domain';
import { clonar, conTresSustituidos, equipoSintetico } from '../equipos';
import { mayorSignificativo, media, serie } from '../series';
import type { Comprobacion } from './partido';

const pct = (x: number, n: number) => `${((100 * x) / n).toFixed(1)} %`;

/**
 * SC-011: con los 11 en posiciones naturales se gana ≥ 60 % frente al mismo equipo con 3 titulares en una
 * demarcación con −40 % (delanteros en la defensa); frente a 3 titulares penalizados dentro de su
 * demarcación (−10 %), la diferencia de goles media sigue siendo favorable.
 */
export function comprobarSC011(n: number, semilla: number): Comprobacion[] {
  const base = equipoSintetico({ semilla: 'sc011' });
  const conCambio = (demarcacion: Demarcacion, posicion: Posicion) => conTresSustituidos(clonar(base, 'b'), 'DEF', demarcacion, posicion);
  const r40 = serie(base, conCambio('DEL', 'DC'), n, semilla, 'sc011-40');
  // CI: defensa de cinco; en la defensa de cuatro del 4-4-2 es "misma demarcación, otra posición".
  const r10 = serie(base, conCambio('DEF', 'CI'), n, semilla, 'sc011-10');
  const diferencia10 = media(r10.golesA.map((g, i) => g - r10.golesB[i]!));
  return [
    {
      id: 'SC-011',
      descripcion: 'Naturales frente a 3 titulares con −40 %: ganan ≥ 60 %',
      ok: r40.victoriasA / n >= 0.6,
      detalle: `naturales ${pct(r40.victoriasA, n)}, empates ${pct(r40.empates, n)}, penalizados ${pct(r40.victoriasB, n)}`,
    },
    {
      id: 'SC-011b',
      descripcion: 'Naturales frente a 3 titulares con −10 %: diferencia de goles media > 0',
      ok: diferencia10 > 0,
      detalle: `diferencia ${diferencia10.toFixed(3)} goles por partido (naturales ${pct(r10.victoriasA, n)}, penalizados ${pct(r10.victoriasB, n)})`,
    },
  ];
}

/**
 * SC-018: contra el mismo rival, una colocación con un delantero más y un defensa menos que la formación de
 * partida (un central adelantado a la zona de delantero centro) marca y recibe más goles de media.
 */
export function comprobarSC018(n: number, semilla: number): Comprobacion {
  const rival = equipoSintetico({ semilla: 'referencia', participanteId: 'rival' });
  const base = equipoSintetico({ semilla: 'sc018' });
  const adelantado = clonar(base, 'sintetico');
  adelantado.titulares = adelantado.titulares.map((t) => (t.casillaId === 'DCI' ? { ...t, ancla: { x: 800, y: 260 } } : t));
  const normal = serie(base, rival, n, semilla, 'sc018');
  const ofensiva = serie(adelantado, rival, n, semilla, 'sc018');
  const fmt = (r: typeof normal) => `GF ${media(r.golesA).toFixed(2)} / GC ${media(r.golesB).toFixed(2)}`;
  return {
    id: '002/SC-018',
    descripcion: 'Colocación con un delantero más y un defensa menos: marca y recibe más goles que la formación de partida',
    ok: mayorSignificativo(ofensiva.golesA, normal.golesA) && mayorSignificativo(ofensiva.golesB, normal.golesB),
    detalle: `colocación ${fmt(ofensiva)} · formación ${fmt(normal)}`,
  };
}

export function comprobacionesColocacion(n: number, semilla: number): Comprobacion[] {
  return [...comprobarSC011(n, semilla), comprobarSC018(n, semilla)];
}
