import { Insignia } from './Insignia';
import type { PropsJuego } from './tipos';

/** Neón: el letrero parpadea al encenderse y brilla con el color del equipo. */
export function Neon({ equipo, goleador }: PropsJuego) {
  return (
    <div className="celebracion celebracion-neon">
      <span className="celebracion-titulo">¡GOL!</span>
      <span className="celebracion-pie">
        <Insignia equipo={equipo} />
        <span className="celebracion-goleador">{goleador}</span>
      </span>
    </div>
  );
}
