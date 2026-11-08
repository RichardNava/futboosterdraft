import { Particulas, TituloLetras } from './efectos';
import { Insignia } from './Insignia';
import type { PropsJuego } from './tipos';

/**
 * Estadio: barren los focos, saltan los flashes de la grada y caen serpentinas; el «¡GOL!» dorado sube como en una
 * retransmisión y el rótulo del goleador entra con la franja del color del equipo.
 */
export function Estadio({ equipo, goleador }: PropsJuego) {
  return (
    <div className="celebracion celebracion-estadio">
      <span className="celebracion-foco celebracion-foco-izquierdo" />
      <span className="celebracion-foco celebracion-foco-derecho" />
      <Particulas clase="flash" cantidad={22} />
      <Particulas clase="serpentina" cantidad={36} />
      <TituloLetras />
      <span className="celebracion-rotulo">
        <span className="celebracion-rotulo-franja" />
        <Insignia equipo={equipo} />
        <span className="celebracion-rotulo-texto">
          <span className="celebracion-goleador">{goleador}</span>
          <span className="celebracion-equipo">{equipo.nombre}</span>
        </span>
      </span>
    </div>
  );
}
