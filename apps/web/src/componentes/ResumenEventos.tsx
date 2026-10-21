import { Icono, type NombreIcono } from './Icono';

export interface EventoVista {
  tick: number;
  minuto: string;
  tipo: string;
  equipo: 'local' | 'visitante';
  jugadores: { rol: string; jugadorId: number }[];
  datos: Record<string, unknown>;
}

const GRAVEDAD: Record<string, string> = { leve: 'leve', media: 'media', grave: 'grave', larga: 'de larga duración' };

/** Cómo se marcó un gol (`datos.tipo`, spec 003 T035): jugada, de cabeza, de falta, de penalti o en propia puerta. */
const TIPO_GOL: Record<string, string> = {
  normal: 'jugada',
  lejano: 'jugada',
  manoAMano: 'jugada',
  cabeza: 'de cabeza',
  falta: 'de falta',
  penalti: 'de penalti',
  propia: 'en propia puerta',
};

/** «jugada», «de cabeza»…, con la distancia del remate si se conoce: «de falta (23 m)». */
export function tipoDeGol(datos: Record<string, unknown>): string {
  const tipo = TIPO_GOL[String(datos.tipo)] ?? 'jugada';
  return typeof datos.distancia === 'number' ? `${tipo} (${datos.distancia} m)` : tipo;
}

export function describirEvento(e: EventoVista, nombre: (id: number) => string): string {
  const de = (rol: string) => {
    const j = e.jugadores.find((x) => x.rol === rol);
    return j ? nombre(j.jugadorId) : '';
  };
  switch (e.tipo) {
    case 'gol': {
      if (e.datos.tipo === 'propia') return `Gol en propia puerta de ${de('autor')} (p. p.) · ${tipoDeGol(e.datos)}`;
      const asistente = de('asistente');
      return `Gol de ${de('autor')} · ${tipoDeGol(e.datos)}${asistente ? ` (asistencia de ${asistente})` : ''}`;
    }
    case 'amarilla':
      return `Amarilla para ${de('autor')}`;
    case 'roja':
      return `Roja para ${de('autor')}${e.datos.motivo === 'doble_amarilla' ? ' (doble amarilla)' : ''}`;
    case 'lesion':
      return `Lesión ${GRAVEDAD[String(e.datos.gravedad)] ?? ''} de ${de('autor')} (${String(e.datos.partidos)} partido${e.datos.partidos === 1 ? '' : 's'} de baja)`;
    case 'ocasion':
      return `Ocasión clara de ${de('autor')}`;
    case 'sustitucion':
      return `Entra ${de('entra')} por ${de('sale')}${e.datos.automatica ? ' (cambio por lesión o expulsión)' : ''}`;
    case 'penalti':
      return `Penalti a favor; lo lanza ${de('autor')}`;
    case 'tanda_lanzamiento':
      return `Tanda: ${de('autor')} ${e.datos.resultado === 'gol' ? 'marca' : 'falla'}`;
    case 'fin_tramo':
      return e.datos.motivo === 'inferioridad_numerica' ? 'Partido terminado por inferioridad numérica' : 'Fin del tramo';
    default:
      return e.tipo;
  }
}

/** Icono y texto alternativo de cada tipo de evento (spec 004, FR-022). */
const ICONO_EVENTO: Partial<Record<string, { nombre: NombreIcono; etiqueta: string }>> = {
  gol: { nombre: 'gol', etiqueta: 'Gol' },
  amarilla: { nombre: 'amarilla', etiqueta: 'Tarjeta amarilla' },
  roja: { nombre: 'roja', etiqueta: 'Tarjeta roja' },
  sustitucion: { nombre: 'cambio', etiqueta: 'Cambio' },
  lesion: { nombre: 'lesion', etiqueta: 'Lesión' },
  penalti: { nombre: 'gol', etiqueta: 'Penalti' },
  tanda_lanzamiento: { nombre: 'gol', etiqueta: 'Tanda de penaltis' },
  ocasion: { nombre: 'informacion', etiqueta: 'Ocasión' },
  fin_tramo: { nombre: 'informacion', etiqueta: 'Fin del tramo' },
};

interface Props {
  eventos: EventoVista[];
  nombre: (id: number) => string;
  nombresEquipo: { local: string; visitante: string };
}

/**
 * Lista de eventos relevantes con su minuto (FR-044; spec 004, FR-022): el minuto alineado a la derecha en una
 * columna fija y un icono por tipo con su texto alternativo, para escanearla sin leer cada línea. Los goles van
 * resaltados con la luz del oro (ronda 4, FR-054).
 */
export function ResumenEventos({ eventos, nombre, nombresEquipo }: Props) {
  if (eventos.length === 0) return <p className="nota">Sin incidencias destacadas.</p>;
  return (
    <ol className="resumen-eventos">
      {eventos.map((e, i) => {
        const icono = ICONO_EVENTO[e.tipo] ?? { nombre: 'informacion' as const, etiqueta: 'Evento' };
        return (
          <li key={`${e.tick}-${i}`} className={e.tipo === 'gol' ? `evento ${e.equipo} evento-gol` : `evento ${e.equipo}`}>
            <span className="evento-minuto">{e.tipo === 'tanda_lanzamiento' ? 'P' : e.minuto}</span>
            <span className="evento-icono">
              <Icono nombre={icono.nombre} etiqueta={icono.etiqueta} className={`icono-${e.tipo}`} />
            </span>
            <span className="evento-texto">
              <span>{describirEvento(e, nombre)}</span>
              <span className="evento-equipo">{nombresEquipo[e.equipo]}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
