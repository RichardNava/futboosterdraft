/**
 * Curvas de la spec 015 (SC-001, FR-002; contracts/balance.md §B1): los nueve duelos de FR-002 calculados con
 * `probabilidad()` y los parámetros actuales, sin ajustes ni series. Sustituye a 014/SC-008-pase, -remate y -fisico.
 */
import { parametrosActuales, type AccionCurva, type ParametrosEquilibrado } from '@fbd/domain';
import { probabilidad } from '@fbd/engine';
import type { GrupoComprobaciones } from '../cli';
import type { Comprobacion } from './partido';

/** Los nueve duelos de FR-002: acción, atacante, defensor y rango en %. El remate es el normal a 11 m, sin nadie que tape. */
const FR002: [AccionCurva | 'remate', number, number, number, number][] = [
  ['regate', 98, 90, 44, 54],
  ['regate', 98, 70, 65, 75],
  ['regate', 66, 90, 15, 25],
  ['pase_corto', 55, 75, 63, 73],
  ['pase_corto', 90, 75, 80, 90],
  ['remate', 90, 80, 64, 74],
  ['remate', 60, 90, 22, 32],
  ['conduccion', 90, 70, 72, 82],
  ['conduccion', 70, 90, 25, 35],
];

/** Base y m de una acción, como en `juego.ts`: el bloque `curvas` o los de la 7.0.0. */
function curva(p: ParametrosEquilibrado, accion: AccionCurva | 'remate'): { base: number; m: number } {
  if (accion === 'remate') return { base: p.acciones.gol.normal, m: 1 };
  return p.curvas?.[accion] ?? { base: { regate: p.acciones.regate, conduccion: p.acciones.conduccion, pase_corto: p.acciones.paseCorto }[accion], m: accion === 'pase_corto' ? p.acciones.pendientePase : 1 };
}

export function comprobarCurvas015(p: ParametrosEquilibrado = parametrosActuales()): Comprobacion {
  const valores = FR002.map(([accion, at, def, min, max]) => {
    const c = curva(p, accion);
    const v = probabilidad({ base: c.base, atacante: at, defensor: def, pendiente: c.m }, p) / 10;
    return { ok: v >= min && v <= max, texto: `${accion} ${at}/${def} ${v.toFixed(1)} % (${min}–${max})${v >= min && v <= max ? '' : ' ✘'}` };
  });
  return {
    id: '015/SC-001',
    descripcion: `Curvas de FR-002 (${p.version}): los nueve duelos, sin ajustes, dentro de su rango`,
    ok: valores.every((v) => v.ok),
    detalle: valores.map((v) => v.texto).join(' · '),
  };
}

export function gruposCurvas015(): GrupoComprobaciones[] {
  return [{ ids: ['015/SC-001'], serie: 'sintetica', ejecutar: () => [comprobarCurvas015()] }];
}
