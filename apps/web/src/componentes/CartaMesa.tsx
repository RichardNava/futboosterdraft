import { useRef, type PointerEvent } from 'react';
import { CartaJugador, type CartaResumen } from './CartaJugador';

interface Props {
  jugador: CartaResumen;
  seleccionada: boolean;
  onClick?: () => void;
  onDobleClick?: () => void;
  onVerFicha?: () => void;
}

/**
 * Carta sobre la mesa del draft (spec 004, FR-043, FR-047): la carta se inclina hacia el puntero con un reflejo
 * de foil que lo sigue, y al elegirla se alza con el resplandor lima. El hueco lleva la sombra y la luz porque la
 * carta recorta su propia forma (escudo achaflanado). Con puntero táctil o movimiento reducido no hay inclinación.
 */
export function CartaMesa({ jugador, seleccionada, onClick, onDobleClick, onVerFicha }: Props) {
  const hueco = useRef<HTMLDivElement>(null);

  const mover = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !onClick) return;
    const el = hueco.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--inclinacion-x', `${((0.5 - y) * 10).toFixed(2)}deg`);
    el.style.setProperty('--inclinacion-y', `${((x - 0.5) * 12).toFixed(2)}deg`);
    el.style.setProperty('--reflejo-x', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--reflejo-y', `${(y * 100).toFixed(1)}%`);
  };
  const salir = () => {
    const el = hueco.current;
    if (!el) return;
    for (const p of ['--inclinacion-x', '--inclinacion-y', '--reflejo-x', '--reflejo-y']) el.style.removeProperty(p);
  };

  return (
    <div
      ref={hueco}
      className={['carta-hueco', seleccionada ? 'elegida' : '', onClick ? 'elegible' : ''].filter(Boolean).join(' ')}
      data-nivel={jugador.nivel}
      onPointerMove={mover}
      onPointerLeave={salir}
    >
      <CartaJugador jugador={jugador} seleccionada={seleccionada} onClick={onClick} onDobleClick={onDobleClick} onVerFicha={onVerFicha} />
      <span className="carta-reflejo" aria-hidden="true" />
    </div>
  );
}
