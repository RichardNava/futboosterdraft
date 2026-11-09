import type { CSSProperties } from 'react';
import { TituloLetras } from './efectos';
import { Insignia } from './Insignia';
import type { PropsJuego } from './tipos';

/** Dónde estalla cada fuego (en % del ancho y del alto) y cuándo (fracción de la duración); el color, en celebraciones.css. */
const FUEGOS = [
  { x: 22, y: 28, t: 0.02 },
  { x: 76, y: 24, t: 0.08 },
  { x: 50, y: 16, t: 0.16 },
  { x: 14, y: 52, t: 0.24 },
  { x: 86, y: 50, t: 0.3 },
  { x: 34, y: 18, t: 0.38 },
  { x: 66, y: 40, t: 0.45 },
];
const CHISPAS = 16;

/**
 * Fuegos artificiales (de pago en la tienda, spec 012, ronda 4): sobre un cielo de noche suben cohetes que estallan en
 * palmeras de colores (una, del color del equipo) y el «¡GOL!» se ilumina con cada estallido.
 */
export function Fuegos({ equipo, goleador }: PropsJuego) {
  return (
    <div className="celebracion celebracion-fuegos">
      {FUEGOS.map((f, i) => (
        <span
          key={i}
          className="fuego"
          aria-hidden="true"
          style={{ '--x': `${f.x}%`, '--y': `${f.y}%`, '--t': f.t } as CSSProperties}
        >
          <span className="fuego-cohete" />
          <span className="fuego-destello" />
          {Array.from({ length: CHISPAS }, (_, k) => (
            <span key={k} className="fuego-chispa" style={{ '--angulo': `${(360 / CHISPAS) * k + i * 11}deg` } as CSSProperties} />
          ))}
        </span>
      ))}
      <TituloLetras />
      <span className="celebracion-pie">
        <Insignia equipo={equipo} />
        <span className="celebracion-goleador">{goleador}</span>
      </span>
    </div>
  );
}
