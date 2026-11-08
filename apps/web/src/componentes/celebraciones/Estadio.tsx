import { Insignia } from './Insignia';
import type { PropsJuego } from './tipos';

/** Estadio: barren los focos y el rótulo sube como en una retransmisión, con la franja del color del equipo. */
export function Estadio({ equipo, goleador }: PropsJuego) {
  return (
    <div className="celebracion celebracion-estadio">
      <span className="celebracion-foco celebracion-foco-izquierdo" />
      <span className="celebracion-foco celebracion-foco-derecho" />
      <span className="celebracion-titulo">¡GOL!</span>
      <span className="celebracion-rotulo">
        <Insignia equipo={equipo} />
        <span className="celebracion-goleador">{goleador}</span>
        <span className="celebracion-equipo">{equipo.nombre}</span>
      </span>
    </div>
  );
}
