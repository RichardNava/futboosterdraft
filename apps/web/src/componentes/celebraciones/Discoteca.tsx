import type { CSSProperties } from 'react';
import { TituloLetras } from './efectos';
import { Insignia } from './Insignia';
import type { PropsJuego } from './tipos';

/** Un muñequito que baila: cabeza, tronco, brazos y piernas que se mueven por CSS. */
function Bailarin({ i }: { i: number }) {
  return (
    <svg className="bailarin" viewBox="0 0 40 64" style={{ '--i': i } as CSSProperties} aria-hidden="true">
      <circle cx="20" cy="9" r="7" />
      <line x1="20" y1="16" x2="20" y2="38" />
      <line className="bailarin-brazo bailarin-brazo-i" x1="20" y1="21" x2="6" y2="12" />
      <line className="bailarin-brazo bailarin-brazo-d" x1="20" y1="21" x2="34" y2="12" />
      <line className="bailarin-pierna bailarin-pierna-i" x1="20" y1="38" x2="10" y2="60" />
      <line className="bailarin-pierna bailarin-pierna-d" x1="20" y1="38" x2="30" y2="60" />
    </svg>
  );
}

/**
 * Discoteca (de pago en la tienda, spec 012, ronda 4): baja la bola de espejos y gira soltando destellos, barren los
 * focos de colores, el «¡GOL!» cambia de color al ritmo y una fila de muñequitos baila delante.
 */
export function Discoteca({ equipo, goleador }: PropsJuego) {
  return (
    <div className="celebracion celebracion-discoteca">
      {/* Los colores de los focos, los destellos y los bailarines van en celebraciones.css (objetos de juego). */}
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} className="discoteca-foco" style={{ '--i': i } as CSSProperties} />
      ))}
      <span className="discoteca-bola" aria-hidden="true">
        <span className="discoteca-bola-facetas" />
      </span>
      <span className="discoteca-destellos" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} style={{ '--i': i } as CSSProperties} />
        ))}
      </span>
      <TituloLetras />
      <span className="celebracion-pie">
        <Insignia equipo={equipo} />
        <span className="celebracion-goleador">{goleador}</span>
      </span>
      <span className="discoteca-pista" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <Bailarin key={i} i={i} />
        ))}
      </span>
    </div>
  );
}
