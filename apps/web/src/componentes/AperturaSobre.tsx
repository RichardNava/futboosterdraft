import { useEffect, useRef, useState } from 'react';
import { reproducir } from '../sonido/sonido';
import { CartaJugador, type CartaResumen } from './CartaJugador';

/** Duraciones de la animación (research R17); en total, como mucho unos 4,5 s (≤ 6 s, FR-007). */
export const DURACION_SOBRE_MS = 1200;
export const ESCALONADO_MS = 120;
export const REPARTO_MS = 1500;
export const VOLTEO_MS = 500;
export const PAUSA_ESPECIAL_MS = 400;
export const FUNDIDO_MS = 300;

const especial = (c: CartaResumen) => c.nivel === 'Legendario' || c.nivel === 'GOAT';

type Fase = 'sobre' | 'reparto' | 'volteo' | 'fundido';

interface Props {
  cartas: readonly CartaResumen[];
  onTerminar: () => void;
}

/**
 * Apertura de un sobre propio (FR-006 a FR-010; research R17): el sobre tiembla y se rasga, las 8 cartas se
 * reparten boca abajo, escalonadas, y se voltean; las Legendario y GOAT con un destello y una pausa.
 * «Saltar» o un toque en cualquier punto revela todo al instante. Con movimiento reducido, un fundido.
 * No resta tiempo de elección: el turno ya trae el margen.
 */
export function AperturaSobre({ cartas, onTerminar }: Props) {
  const reducido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const [fase, setFase] = useState<Fase>(reducido ? 'fundido' : 'sobre');
  const terminar = useRef(onTerminar);
  terminar.current = onTerminar;
  const hecho = useRef(false);
  const acabar = () => {
    if (hecho.current) return;
    hecho.current = true;
    terminar.current();
  };

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    if (reducido) {
      t.push(setTimeout(acabar, FUNDIDO_MS));
    } else {
      reproducir('rasgado');
      t.push(setTimeout(() => setFase('reparto'), DURACION_SOBRE_MS));
      cartas.forEach((_, i) => t.push(setTimeout(() => reproducir('reparto'), DURACION_SOBRE_MS + i * ESCALONADO_MS)));
      const inicioVolteo = DURACION_SOBRE_MS + REPARTO_MS;
      t.push(
        setTimeout(() => {
          setFase('volteo');
          reproducir('volteo');
          if (cartas.some(especial)) setTimeout(() => reproducir('revelacion'), VOLTEO_MS / 2);
        }, inicioVolteo),
      );
      const total = inicioVolteo + VOLTEO_MS + (cartas.some(especial) ? PAUSA_ESPECIAL_MS : 0) + 300;
      t.push(setTimeout(acabar, total));
    }
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <div className={`apertura-sobre fase-${fase}`} role="dialog" aria-modal="true" aria-label="Apertura del sobre" onClick={acabar}>
      <button
        type="button"
        className="secundario saltar"
        onClick={(e) => {
          e.stopPropagation();
          acabar();
        }}
        autoFocus
      >
        Saltar
      </button>
      {fase === 'sobre' && <div className="sobre-cerrado" aria-hidden="true" />}
      {fase !== 'sobre' && (
        <div className="apertura-cartas" aria-hidden="true">
          {cartas.map((c, i) => (
            <div key={c.id} className={`apertura-carta ${especial(c) ? 'especial' : ''}`} style={{ animationDelay: `${i * ESCALONADO_MS}ms` }}>
              <div className="apertura-carta-dorso" />
              <div className="apertura-carta-frente">
                <CartaJugador jugador={c} compacta />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
