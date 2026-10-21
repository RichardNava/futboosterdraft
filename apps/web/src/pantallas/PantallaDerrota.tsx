import { useEffect } from 'react';
import { marcarPantallaVista } from '../api/cliente';
import { BarraPrincipal, type AccionBarra } from '../componentes/BarraPrincipal';
import { Estadio } from '../componentes/arte/Estadio';

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
 * Pantalla de derrota (spec 003, FR-039 a FR-041b; spec 004, FR-017; contracts/ui.md §5): titular de cartel
 * «Eliminados» («Subcampeones» si se perdió la final) con «{equipo} ha sido derrotado en {fase}» debajo. El botón
 * principal depende de cómo sigue el torneo: «Simular resto del torneo» (sin humanos en competición), «Ver torneo»
 * (con humanos en competición) o «Ver campeón» (se perdió la final). Al mostrarse, se marca como vista.
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
      <div className="final-escena" aria-hidden="true">
        <Estadio className="final-estadio" />
      </div>
      <h1 className="cartel">{torneoTerminado ? 'Subcampeones' : 'Eliminados'}</h1>
      <h2>
        {equipo} ha sido derrotado en {fase}
      </h2>
      <BarraPrincipal principal={principal} secundarios={torneoTerminado ? [] : [volver]} />
    </main>
  );
}
