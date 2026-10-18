/**
 * Incorporación de un tramo recibido (en directo o en una reproducción) a lo que se reproduce: fotogramas,
 * acciones, lanzamientos de la tanda y las pausas anunciadas del reloj (gol, descanso, antes de la
 * prórroga y final).
 */
import type { AccionVista, DatosReproduccion } from './Lienzo2D';
import { agregarFotogramas, type Fotograma } from './interpolacion';
import type { RelojReproduccion } from './relojReproduccion';

export interface TramoRecibido {
  desdeTick: number;
  hastaTick: number;
  fase: string;
  eventos: { tick: number; tipo: string; equipo: 'local' | 'visitante'; jugadores: { rol: string; jugadorId: number }[]; datos: Record<string, unknown> }[];
  acciones?: AccionVista[];
  fotogramas?: Fotograma[];
}

export function datosVacios(): DatosReproduccion {
  return { fotogramas: [], acciones: [], tanda: [] };
}

export function incorporarTramo(datos: DatosReproduccion, reloj: RelojReproduccion, t: TramoRecibido): void {
  if (t.fotogramas) agregarFotogramas(datos.fotogramas, t.fotogramas);
  const ultimaAccion = datos.acciones.at(-1)?.inicioTick ?? -1;
  for (const a of t.acciones ?? []) if (a.inicioTick > ultimaAccion || (a.inicioTick === ultimaAccion && a.finTick > (datos.acciones.at(-1)?.finTick ?? -1))) datos.acciones.push(a);
  for (const e of t.eventos) {
    if (e.tipo === 'gol') reloj.anunciarPausa(e.tick, 'gol');
    if (e.tipo === 'tanda_lanzamiento' && !datos.tanda.some((l) => l.tick === e.tick)) {
      if (datos.tanda.length === 0) reloj.marcarTanda(e.tick);
      datos.tanda.push({ tick: e.tick, lado: e.equipo, lanzadorId: e.jugadores[0]?.jugadorId ?? -1, gol: e.datos.resultado === 'gol' });
    }
  }
  if (t.fase === 'descanso') reloj.anunciarPausa(t.hastaTick, 'descanso');
  if (t.fase === 'pre_prorroga') reloj.anunciarPausa(t.hastaTick, 'pre_prorroga');
  if (t.fase === 'finalizado') reloj.marcarFinal(t.hastaTick);
  reloj.ampliar(t.hastaTick);
}
