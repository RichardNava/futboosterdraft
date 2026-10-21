import { useEffect } from 'react';
import { marcarPantallaVista } from '../api/cliente';
import { BarraPrincipal } from '../componentes/BarraPrincipal';
import { Trofeo } from '../componentes/arte/Trofeo';

interface Props {
  partidaId: string;
  campeon: string;
  onVolverAlMenu: () => void;
}

/**
 * Pantalla del campeón (spec 003, FR-040, FR-041; spec 004, FR-017; contracts/ui.md §5): el titular de cartel
 * «Campeones» es el protagonista, con «¡{campeón}, campeón del torneo!» en la parte superior, donde la barra
 * del botón no lo tapa (ronda 4, FR-055), y un trofeo pequeño en segundo plano. La ven todos los participantes, también cuando gana un NPC. Al mostrarse, se marca como vista.
 */
export function PantallaCampeon({ partidaId, campeon, onVolverAlMenu }: Props) {
  useEffect(() => {
    void marcarPantallaVista(partidaId, 'campeon').catch(() => undefined);
  }, [partidaId]);

  return (
    <main className="pantalla pantalla-final campeon-torneo">
      <div className="final-escena" aria-hidden="true">
        <span className="final-haces" />
        <Trofeo className="final-trofeo" />
        <span className="final-destellos" />
      </div>
      <h1 className="cartel">Campeones</h1>
      {/* Tras el titular para el lector de pantalla; el CSS lo sube a la parte superior (FR-055). */}
      <h2 className="final-campeon">¡{campeon}, campeón del torneo!</h2>
      <BarraPrincipal principal={{ etiqueta: 'Volver al menú', onClick: onVolverAlMenu }} />
    </main>
  );
}
