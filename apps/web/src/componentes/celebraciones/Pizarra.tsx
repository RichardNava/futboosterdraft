import { Particulas } from './efectos';
import { Insignia } from './Insignia';
import type { PropsJuego } from './tipos';

/** Pizarra: entra la pizarra, el entrenador escribe «¡GOL!» con tiza, lo rodea con una flecha y cae polvo de tiza. */
export function Pizarra({ equipo, goleador }: PropsJuego) {
  return (
    <div className="celebracion celebracion-pizarra">
      <span className="celebracion-tablero">
        <span className="celebracion-titulo">¡GOL!</span>
        <svg className="celebracion-trazos" viewBox="0 0 300 120" aria-hidden="true" preserveAspectRatio="none">
          <path className="celebracion-subrayado" pathLength={1} d="M20 104 C 90 96, 200 112, 280 100" />
          <path className="celebracion-flecha" pathLength={1} d="M286 18 C 250 6, 220 30, 232 58 M232 58 l -14 -6 M232 58 l 4 -15" />
        </svg>
        <span className="celebracion-pie">
          <Insignia equipo={equipo} />
          <span className="celebracion-goleador">{goleador}</span>
        </span>
        <Particulas clase="tiza" cantidad={26} />
      </span>
    </div>
  );
}
