import { CLAVES_STATS, type Jugador } from '@fbd/domain';
import { useEffect, useState } from 'react';
import { api } from '../api/cliente';
import { ABREVIATURA_STAT, ETIQUETA_DEMARCACION, ETIQUETA_NIVEL } from '../textos/niveles';

interface Props {
  jugadorId: number;
  onCerrar: () => void;
}

function edad(fechaNacimiento: string): number {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let anios = hoy.getFullYear() - nacimiento.getFullYear();
  const cumplido =
    hoy.getMonth() > nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate());
  if (!cumplido) anios--;
  return anios;
}

/** Ventana con la ficha completa de un jugador (FR-013). */
export function FichaJugador({ jugadorId, onCerrar }: Props) {
  const [jugador, setJugador] = useState<Jugador | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    api<Jugador>(`/api/catalogo/jugadores/${jugadorId}`)
      .then((j) => vigente && setJugador(j))
      .catch((e: Error) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [jugadorId]);

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [onCerrar]);

  return (
    <div className="modal-fondo" role="presentation" onClick={onCerrar}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Ficha del jugador" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
          ×
        </button>
        {error && <p className="error">{error}</p>}
        {!jugador && !error && <p>Cargando…</p>}
        {jugador && (
          <>
            <h2>
              {jugador.nombre} {jugador.apellidos}
            </h2>
            <p className="ficha-meta">
              {ETIQUETA_DEMARCACION[jugador.demarcacion]} · {jugador.posicion.join(', ')} · {ETIQUETA_NIVEL[jugador.nivel]}
            </p>
            <p className="ficha-meta">
              {jugador.nacionalidad} · {edad(jugador.fecha_nacimiento)} años · {jugador.altura} cm
            </p>
            <div className="ficha-media">
              Media <strong>{Math.round(jugador.media)}</strong>
            </div>
            <table className="ficha-stats">
              <tbody>
                {CLAVES_STATS[jugador.demarcacion].map((clave) => (
                  <tr key={clave}>
                    <th scope="row">{ABREVIATURA_STAT[clave]}</th>
                    <td>
                      <div className="barra" style={{ width: `${(jugador.stats as Record<string, number>)[clave]}%` }} />
                    </td>
                    <td>{(jugador.stats as Record<string, number>)[clave]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {jugador.specials.length > 0 && (
              <p>
                <strong>Specials:</strong> {jugador.specials.join(', ')}
              </p>
            )}
            {jugador.historia && <p className="ficha-historia">{jugador.historia}</p>}
          </>
        )}
      </div>
    </div>
  );
}
