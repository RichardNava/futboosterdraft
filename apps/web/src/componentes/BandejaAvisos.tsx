import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/cliente';

interface Aviso {
  id: string;
  tipo: 'jornada_abierta' | 'plazo_proximo' | 'partido_auto_resuelto' | 'torneo_terminado' | 'dorsal_asignado';
  partidaId: string;
  partidoId: string | null;
  texto: string;
  leido: boolean;
  creadoEn: string;
}

const CADA_MS = 60_000;

/**
 * Bandeja de avisos del modo asíncrono (T117; FR-056b). Se recarga al montarse, cada minuto y cada vez
 * que cambia `actualizar` (p. ej. al recibir un mensaje `aviso` por la conexión en tiempo real).
 */
export function BandejaAvisos({ actualizar = 0 }: { actualizar?: number }) {
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

  const noLeidos = avisos.filter((a) => !a.leido).length;

  return (
    <div className="bandeja-avisos">
      <button type="button" className="secundario" aria-expanded={abierta} onClick={() => setAbierta(!abierta)}>
        Avisos{noLeidos > 0 && <span className="contador" aria-label={`${noLeidos} sin leer`}>{noLeidos}</span>}
      </button>
      {abierta && (
        <ul className="lista-avisos" aria-label="Avisos">
          {avisos.length === 0 && <li className="nota">No tienes avisos.</li>}
          {avisos.map((a) => (
            <li key={a.id} className={a.leido ? 'leido' : ''}>
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
