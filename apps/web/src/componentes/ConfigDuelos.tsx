import { FORMACIONES, FORMACIONES_IDS, type ConfigDuelos as Config, type FormacionId } from '@fbd/domain';
import { useEffect, useState } from 'react';
import { api, ErrorApi } from '../api/cliente';
import { Aviso } from './Aviso';

interface Props {
  partidaId: string;
  duelos: Config;
  /** Solo el anfitrión la cambia; el resto la ve en modo de solo lectura. */
  editable: boolean;
}

/** Miniatura de una formación: un punto por casilla, de la portería (abajo) a la delantera (arriba). */
export function MiniaturaFormacion({ formacion }: { formacion: FormacionId }) {
  return (
    <svg className="miniatura-formacion" viewBox="0 0 64 84" role="img" aria-label={`Formación ${formacion}`}>
      <rect x="1" y="1" width="62" height="82" rx="3" className="miniatura-campo" />
      <line x1="1" y1="42" x2="63" y2="42" className="miniatura-linea" />
      {FORMACIONES[formacion].casillas.map((c) => (
        <circle key={c.id} cx={4 + (c.zona.y / 640) * 56} cy={80 - (c.zona.x / 800) * 76} r="3.2" className="miniatura-casilla" />
      ))}
    </svg>
  );
}

/**
 * Configuración del modo Duelo de jugadores en la sala (spec 005, T073; FR-061, FR-064a; contracts/ui.md): formación
 * común y Estado de forma. Cada cambio se guarda en el momento (`PUT /api/partidas/:id/duelos`) y llega a todos.
 */
export function ConfigDuelos({ partidaId, duelos: recibida, editable }: Props) {
  const [error, setError] = useState<string | null>(null);
  // Se muestra el cambio al momento; la sala lo confirma con `sala.actualizada` (y lo corrige si falla).
  const [duelos, setDuelos] = useState(recibida);
  useEffect(() => setDuelos(recibida), [recibida]);
  const guardar = async (nueva: Config) => {
    setError(null);
    setDuelos(nueva);
    try {
      await api(`/api/partidas/${partidaId}/duelos`, { metodo: 'PUT', cuerpo: nueva });
    } catch (e) {
      setDuelos(recibida);
      setError(e instanceof ErrorApi ? e.message : 'No se pudo guardar la configuración');
    }
  };
  return (
    <section className="config-duelos panel" aria-label="Duelo de jugadores">
      <h2>Duelo de jugadores</h2>
      <div className="config-duelos-fila">
        <MiniaturaFormacion formacion={duelos.formacion} />
        <div className="config-duelos-campos">
          <label>
            Formación
            <select
              value={duelos.formacion}
              disabled={!editable}
              onChange={(e) => void guardar({ ...duelos, formacion: e.target.value as FormacionId })}
            >
              {FORMACIONES_IDS.map((f) => (
                <option key={f} value={f}>
                  {FORMACIONES[f].nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="interruptor">
            <input
              type="checkbox"
              role="switch"
              checked={duelos.estadoForma}
              disabled={!editable}
              onChange={(e) => void guardar({ ...duelos, estadoForma: e.target.checked })}
            />
            Estado de forma
          </label>
          <p className="nota">Cada jugador suma o resta hasta 2 puntos al azar en cada duelo.</p>
          {!editable && <p className="nota">Lo elige el anfitrión.</p>}
        </div>
      </div>
      {error && (
        <Aviso tipo="error">
          <p>{error}</p>
        </Aviso>
      )}
    </section>
  );
}
