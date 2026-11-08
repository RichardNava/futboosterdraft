import { Insignia } from './Insignia';
import type { PropsJuego } from './tipos';

/** Pizarra: el entrenador lo escribe con tiza y lo subraya. */
export function Pizarra({ equipo, goleador }: PropsJuego) {
  return (
    <div className="celebracion celebracion-pizarra">
      <span className="celebracion-tablero">
        <span className="celebracion-titulo">¡GOL!</span>
        <span className="celebracion-subrayado" />
        <span className="celebracion-pie">
          <Insignia equipo={equipo} />
          <span className="celebracion-goleador">{goleador}</span>
        </span>
      </span>
    </div>
  );
}
