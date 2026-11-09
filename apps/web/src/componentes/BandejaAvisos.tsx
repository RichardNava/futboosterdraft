import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { api } from '../api/cliente';
import type { AvisoEquipo } from '@fbd/protocol';
import { Icono, type NombreIcono } from './Icono';
import { textoAvisoEquipo } from './textoBloqueoBajas';

interface Aviso {
  id: string;
  tipo: 'jornada_abierta' | 'plazo_proximo' | 'partido_auto_resuelto' | 'torneo_terminado' | 'dorsal_asignado' | 'baja_sustituida';
  partidaId: string;
  partidoId: string | null;
  texto: string;
  leido: boolean;
  creadoEn: string;
}

const CADA_MS = 60_000;

/** Bajas del equipo: su texto va en rojo (spec 012, ronda 5). */
const BAJAS: ReadonlySet<AvisoEquipo['tipo']> = new Set(['baja_pendiente', 'lesionado', 'sancionado']);

/** Longitud del texto para la letra que se ajusta: grande en los cortos, menor en los largos (ronda 5). */
const largo = (texto: string) => ({ '--caracteres': texto.length }) as CSSProperties;

/** Icono por tipo de aviso: los que piden algo (plazo, jornada) como advertencia; el resto, información. */
const ICONO_AVISO: Record<Aviso['tipo'], NombreIcono> = {
  jornada_abierta: 'informacion',
  plazo_proximo: 'advertencia',
  partido_auto_resuelto: 'informacion',
  torneo_terminado: 'exito',
  dorsal_asignado: 'informacion',
  baja_sustituida: 'informacion',
};

/** Avisos del equipo de la partida que se está viendo (spec 012, FR-027): no se guardan, salen de la vista de equipo. */
export interface AvisosDelEquipo {
  partidaId: string;
  avisos: AvisoEquipo[];
  nombre: (id: number) => string;
}

/**
 * Bandeja de avisos del modo asíncrono (T117; FR-056b). Se recarga al montarse, cada minuto y cada vez
 * que cambia `actualizar` (p. ej. al recibir un mensaje `aviso` por la conexión en tiempo real).
 */
export function BandejaAvisos({ actualizar = 0, equipo }: { actualizar?: number; equipo?: AvisosDelEquipo }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [abierta, setAbierta] = useState(false);

  const cargar = useCallback(() => {
    api<Aviso[]>('/api/avisos')
      .then(setAvisos)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    cargar();
    const id = window.setInterval(cargar, CADA_MS);
    return () => window.clearInterval(id);
  }, [cargar, actualizar]);

  const marcarLeido = async (a: Aviso) => {
    if (a.leido) return;
    setAvisos((xs) => xs.map((x) => (x.id === a.id ? { ...x, leido: true } : x)));
    await api(`/api/avisos/${a.id}/leido`, { metodo: 'POST' }).catch(() => undefined);
  };

  const intervenciones = equipo?.avisos.filter((a) => a.nivel === 'intervencion').length ?? 0;
  const noLeidos = avisos.filter((a) => !a.leido).length + intervenciones;

  return (
    <div className="bandeja-avisos">
      <button type="button" className="secundario" aria-expanded={abierta} onClick={() => setAbierta(!abierta)}>
        <Icono nombre={intervenciones > 0 ? 'advertencia' : 'informacion'} />
        Avisos{noLeidos > 0 && <span className="contador" aria-label={`${noLeidos} sin leer`}>{noLeidos}</span>}
      </button>
      {abierta && (
        <ul className="lista-avisos" aria-label="Avisos">
          {/* Arriba, los del equipo: los que piden intervenir, con enlace a Formación. */}
          {equipo?.avisos.map((a) => (
            <li
              key={`${a.tipo}-${a.jugadorId}`}
              className={`aviso-equipo aviso-${a.nivel}${BAJAS.has(a.tipo) ? ' aviso-baja' : ''}`}
              data-aviso-equipo={a.tipo}
              style={largo(textoAvisoEquipo(a, equipo.nombre))}
            >
              <Icono nombre={a.nivel === 'intervencion' ? 'advertencia' : 'informacion'} etiqueta={a.nivel === 'intervencion' ? 'Hay que actuar' : 'Información'} />
              {a.enlace === 'formacion' ? (
                <Link to={`/partidas/${equipo.partidaId}/alineacion`}>{textoAvisoEquipo(a, equipo.nombre)}</Link>
              ) : (
                <span>{textoAvisoEquipo(a, equipo.nombre)}</span>
              )}
            </li>
          ))}
          {avisos.length === 0 && !equipo?.avisos.length && <li className="nota">No tienes avisos.</li>}
          {avisos.map((a) => (
            <li key={a.id} className={a.leido ? 'leido' : ''} style={largo(a.texto)}>
              <Icono nombre={ICONO_AVISO[a.tipo]} etiqueta={a.leido ? 'Leído' : 'Sin leer'} />
              <Link to={`/partidas/${a.partidaId}/torneo`} onClick={() => void marcarLeido(a)}>
                {a.texto}
              </Link>
              <time dateTime={a.creadoEn}>{new Date(a.creadoEn).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
