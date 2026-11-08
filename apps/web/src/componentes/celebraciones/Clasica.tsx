import { Ondas, Particulas, TituloLetras } from './efectos';
import { Insignia } from './Insignia';
import type { PropsJuego } from './tipos';

/**
 * La del juego: destello, ondas de choque y rayos con el color del equipo; «¡GOL!» entra letra a letra de un golpe que
 * sacude la imagen, estalla el confeti y sube el goleador.
 */
export function Clasica({ equipo, goleador }: PropsJuego) {
  return (
    <div className="celebracion celebracion-clasica">
      <span className="celebracion-velo" />
      <span className="celebracion-rayos" />
      <span className="celebracion-destello" />
      <Ondas cantidad={3} />
      <Particulas clase="confeti" cantidad={48} />
      <span className="celebracion-sacudida">
        <TituloLetras />
        <span className="celebracion-pie">
          <Insignia equipo={equipo} />
          <span className="celebracion-goleador">{goleador}</span>
        </span>
      </span>
    </div>
  );
}
