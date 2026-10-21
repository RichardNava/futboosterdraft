/**
 * Goleadores de un partido para el marcador (spec 004, FR-048): por equipo, cada jugador con los minutos de sus
 * goles en el orden en que marcó. Los goles en propia puerta cuentan para el equipo que los recibe a favor
 * (`equipo` del evento) y van aparte, con «p. p.»; los de penalti llevan «pen.». La tanda de penaltis no cuenta.
 */
import type { EventoVista } from './ResumenEventos';

export interface Goleador {
  /** Jugador y tipo: el mismo jugador con un gol en propia puerta es otra entrada. */
  clave: string;
  nombre: string;
  /** «23'», «67' (pen.)»… */
  goles: string[];
  propia: boolean;
}

/** Quita el dorsal delante del nombre («9. Pérez» → «Pérez»): en la lista de goleadores sobra. */
const sinDorsal = (nombre: string) => nombre.replace(/^\d+\.\s+/, '');

export function goleadoresDe(eventos: readonly EventoVista[], nombre: (id: number) => string): Record<'local' | 'visitante', Goleador[]> {
  const lados = { local: new Map<string, Goleador>(), visitante: new Map<string, Goleador>() };
  for (const e of eventos) {
    if (e.tipo !== 'gol') continue;
    const autor = e.jugadores.find((j) => j.rol === 'autor');
    if (!autor) continue;
    const propia = e.datos.tipo === 'propia';
    const clave = `${autor.jugadorId}${propia ? '-pp' : ''}`;
    const mapa = lados[e.equipo];
    const g = mapa.get(clave) ?? { clave, nombre: sinDorsal(nombre(autor.jugadorId)), goles: [], propia };
    g.goles.push(e.datos.tipo === 'penalti' ? `${e.minuto} (pen.)` : e.minuto);
    mapa.set(clave, g);
  }
  return { local: [...lados.local.values()], visitante: [...lados.visitante.values()] };
}
