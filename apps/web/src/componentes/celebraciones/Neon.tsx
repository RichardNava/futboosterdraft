import { Particulas, TituloLetras } from './efectos';
import { Insignia } from './Insignia';
import type { PropsJuego } from './tipos';

/** Neón: se dibuja el marco, el letrero parpadea al encenderse y suelta chispas; luego late con el color del equipo. */
export function Neon({ equipo, goleador }: PropsJuego) {
  return (
    <div className="celebracion celebracion-neon">
      <span className="celebracion-lineas" />
      <span className="celebracion-marco-neon" />
      <Particulas clase="chispa" cantidad={30} />
      <TituloLetras />
      <span className="celebracion-pie">
        <Insignia equipo={equipo} />
        <span className="celebracion-goleador">{goleador}</span>
      </span>
    </div>
  );
}
