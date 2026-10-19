import { useEffect } from 'react';
import { marcarPantallaVista } from '../api/cliente';
import { BarraPrincipal, type AccionBarra } from '../componentes/BarraPrincipal';

interface Props {
  partidaId: string;
  equipo: string;
  /** Etiqueta de la fase («Cuartos de final», «Final»…). */
  fase: string;
  /** Sin humanos en competición y con el torneo sin terminar (FR-041a). */
  puedeSimularResto: boolean;
  /** Se perdió la final: el torneo ya ha terminado. */
  torneoTerminado: boolean;
  onSimularResto: () => Promise<unknown>;
  onVerTorneo: () => void;
  onVerCampeon: () => void;
  onVolverAlMenu: () => void;
}

/**
 * Pantalla de derrota (spec 003, FR-039 a FR-041b; research R22; contracts/ui.md): ilustración propia y el
 * texto «{equipo} ha sido derrotado en {fase}». El botón principal depende de cómo sigue el torneo:
 * «Simular resto del torneo» (sin humanos en competición), «Ver torneo» (con humanos en competición) o
 * «Ver campeón» (se perdió la final). Al mostrarse, se marca como vista.
 */
export function PantallaDerrota({ partidaId, equipo, fase, puedeSimularResto, torneoTerminado, onSimularResto, onVerTorneo, onVerCampeon, onVolverAlMenu }: Props) {
  useEffect(() => {
    void marcarPantallaVista(partidaId, 'derrota').catch(() => undefined);
  }, [partidaId]);

  const volver: AccionBarra = { etiqueta: 'Volver al menú', onClick: onVolverAlMenu };
  const principal: AccionBarra = torneoTerminado
    ? { etiqueta: 'Ver campeón', onClick: onVerCampeon }
    : puedeSimularResto
      ? { etiqueta: 'Simular resto del torneo', onClick: onSimularResto }
      : { etiqueta: 'Ver torneo', onClick: onVerTorneo };

  return (
    <main className="pantalla pantalla-final derrota">
      <svg className="ilustracion-final" viewBox="0 0 160 120" role="img" aria-label="Balón detenido junto a la portería">
        <rect x="20" y="20" width="120" height="70" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M20 20 L40 35 L120 35 L140 20 M40 35 L40 90 M120 35 L120 90" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <line x1="0" y1="104" x2="160" y2="104" stroke="currentColor" strokeWidth="2" opacity="0.4" />
        <g className="balon-derrota">
          <circle cx="80" cy="92" r="11" fill="var(--superficie, #fff)" stroke="currentColor" strokeWidth="3" />
          <path d="M80 85 l6 4 -2 7 h-8 l-2 -7 z" fill="currentColor" />
        </g>
      </svg>
      <h1>
        {equipo} ha sido derrotado en {fase}
      </h1>
      <BarraPrincipal principal={principal} secundarios={torneoTerminado ? [] : [volver]} />
    </main>
  );
}
