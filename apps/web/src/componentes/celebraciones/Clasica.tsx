import { Insignia } from './Insignia';
import type { PropsJuego } from './tipos';

/** La del juego: «¡GOL!» enorme que entra con un golpe, sobre un velo con el color del equipo. */
export function Clasica({ equipo, goleador }: PropsJuego) {
  return (
    <div className="celebracion celebracion-clasica">
      <span className="celebracion-velo" />
      <span className="celebracion-titulo">¡GOL!</span>
      <span className="celebracion-pie">
        <Insignia equipo={equipo} />
        <span className="celebracion-goleador">{goleador}</span>
      </span>
    </div>
  );
}
