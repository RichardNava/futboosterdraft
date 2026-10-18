import type { Jugador } from '@fbd/domain';
import { useEffect, useState } from 'react';
import { api } from '../api/cliente';
import { ETIQUETA_DEMARCACION, ETIQUETA_NIVEL } from '../textos/niveles';
import { CartaJugador } from './CartaJugador';

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

/** Ventana con la carta completa y los datos personales de un jugador (FR-013; spec 002, FR-005). */
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
            {/* La misma carta que en el draft y la plantilla (FR-005). */}
            <div className="ficha-carta">
              <CartaJugador jugador={{ ...jugador, stats: jugador.stats as unknown as Record<string, number> }} />
            </div>
            <p className="ficha-meta">
              {ETIQUETA_DEMARCACION[jugador.demarcacion]} · {ETIQUETA_NIVEL[jugador.nivel]} · {jugador.nacionalidad} ·{' '}
              {edad(jugador.fecha_nacimiento)} años · {jugador.altura} cm
            </p>
            {jugador.historia && <p className="ficha-historia">{jugador.historia}</p>}
          </>
        )}
      </div>
    </div>
  );
}
