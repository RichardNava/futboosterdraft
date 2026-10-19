import { useEffect } from 'react';
import { marcarPantallaVista } from '../api/cliente';
import { BarraPrincipal } from '../componentes/BarraPrincipal';

interface Props {
  partidaId: string;
  campeon: string;
  onVolverAlMenu: () => void;
}

/**
 * Pantalla del campeón (spec 003, FR-040, FR-041; research R22; contracts/ui.md): trofeo propio y el texto
 * «¡{campeón}, campeón del torneo!». La ven todos los participantes, también cuando gana un NPC. Al mostrarse,
 * se marca como vista.
 */
export function PantallaCampeon({ partidaId, campeon, onVolverAlMenu }: Props) {
  useEffect(() => {
    void marcarPantallaVista(partidaId, 'campeon').catch(() => undefined);
  }, [partidaId]);

  return (
    <main className="pantalla pantalla-final campeon-torneo">
      <svg className="ilustracion-final" viewBox="0 0 160 140" role="img" aria-label="Trofeo">
        <g className="trofeo">
          <path d="M50 20 h60 v25 a30 30 0 0 1 -60 0 z" fill="#f5c542" stroke="#9a6b00" strokeWidth="3" />
          <path d="M50 28 h-14 a14 14 0 0 0 16 22 M110 28 h14 a14 14 0 0 1 -16 22" fill="none" stroke="#9a6b00" strokeWidth="4" />
          <rect x="72" y="74" width="16" height="22" fill="#f5c542" stroke="#9a6b00" strokeWidth="3" />
          <rect x="54" y="96" width="52" height="14" rx="3" fill="#7a4e1d" />
          <path d="M70 34 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 z" fill="#fff8d6" />
        </g>
        <g className="destellos" stroke="#f5c542" strokeWidth="3" strokeLinecap="round">
          <line x1="20" y1="30" x2="32" y2="34" />
          <line x1="140" y1="30" x2="128" y2="34" />
          <line x1="80" y1="2" x2="80" y2="12" />
        </g>
      </svg>
      <h1>¡{campeon}, campeón del torneo!</h1>
      <BarraPrincipal principal={{ etiqueta: 'Volver al menú', onClick: onVolverAlMenu }} />
    </main>
  );
}
