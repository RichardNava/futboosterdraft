import { useState } from 'react';

/** Situaciones en las que el juego espera y se puede avanzar (FR-011; contracts/ui.md). */
export type SituacionAvance = 'fin_draft' | 'preparacion' | 'pausa' | 'fin_partido' | 'fin_jornada' | 'fin_torneo';

const ETIQUETA: Record<SituacionAvance, string> = {
  fin_draft: 'Preparar equipo',
  preparacion: 'Comenzar partido',
  pausa: 'Seguir',
  fin_partido: 'Siguiente',
  fin_jornada: 'Siguiente jornada',
  fin_torneo: 'Volver al menú',
};

interface Props {
  situacion: SituacionAvance;
  /** En la preparación, contra un humano el partido no se juega en directo: «Ver partido» (FR-030). */
  contraHumano?: boolean;
  /**
   * Acción del botón. Recibe un `requestId` nuevo en cada pulsación: el servidor descarta las repetidas
   * (FR-016). Mientras no termina, el botón queda desactivado.
   */
  onAvanzar: (requestId: string) => Promise<unknown> | void;
  className?: string;
}

/**
 * Botón para avanzar sin esperar a que venza un temporizador (US2; research R18), con la etiqueta de cada
 * situación. Centraliza el comportamiento común: una sola petición a la vez y error visible si falla.
 */
export function BotonAvanzar({ situacion, contraHumano, onAvanzar, className }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const etiqueta = situacion === 'preparacion' && contraHumano ? 'Ver partido' : ETIQUETA[situacion];

  const pulsar = async () => {
    if (ocupado) return;
    setOcupado(true);
    setError(null);
    try {
      await onAvanzar(crypto.randomUUID());
    } catch (e) {
      setError((e as Error).message || 'No se pudo avanzar');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <span className="boton-avanzar">
      <button type="button" className={className} disabled={ocupado} aria-busy={ocupado} onClick={() => void pulsar()}>
        {etiqueta}
      </button>
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
