import { useEffect, useRef, useState } from 'react';
import { reproducir } from '../sonido/sonido';
import { CartaJugador, type CartaResumen } from './CartaJugador';
import { iniciarParticulas, type SistemaParticulas } from './particulas';

/** Duraciones de la secuencia (spec 003, research R21); en el peor caso, ≤ 8 s (FR-011). */
export const DURACION_SOBRE_MS = 1400;
export const ESCALONADO_MS = 250;
export const SALIDA_MS = 350;
export const GIRO_MS = 300;
export const PAUSA_ESPECIAL_MS = 600;
export const FUNDIDO_MS = 300;
export const DURACION_MAXIMA_MS = 8000;

const especial = (c: CartaResumen) => c.nivel === 'Legendario' || c.nivel === 'GOAT';

const COLOR_PARTICULAS: Record<string, string> = { Legendario: '#c084fc', GOAT: '#ffd700' };

export interface PasoCarta {
  /** Cuándo sale la carta boca abajo hacia su sitio. */
  salida: number;
  /** Cuándo empieza a girar (los giros se solapan con las salidas siguientes). */
  giro: number;
}

/**
 * Calendario de la secuencia: el sobre, la salida escalonada de cada carta, su giro solapado y una pausa
 * extra tras cada especial. Las pausas se recortan para que el total, con el fundido, no pase de 8 s.
 */
export function calendarioApertura(cartas: readonly CartaResumen[]): { pasos: PasoCarta[]; fundido: number; total: number } {
  const especiales = cartas.filter(especial).length;
  const sinPausas = DURACION_SOBRE_MS + Math.max(0, cartas.length - 1) * ESCALONADO_MS + SALIDA_MS + GIRO_MS + FUNDIDO_MS;
  const pausa = especiales === 0 ? 0 : Math.min(PAUSA_ESPECIAL_MS, Math.floor((DURACION_MAXIMA_MS - 100 - sinPausas) / especiales));
  const pasos: PasoCarta[] = [];
  let t = DURACION_SOBRE_MS;
  let fin = t;
  for (const c of cartas) {
    pasos.push({ salida: t, giro: t + SALIDA_MS });
    fin = t + SALIDA_MS + GIRO_MS;
    t += ESCALONADO_MS;
    if (especial(c)) {
      t += pausa;
      fin += pausa;
    }
  }
  return { pasos, fundido: fin, total: fin + FUNDIDO_MS };
}

type Fase = 'sobre' | 'cartas' | 'fundido';
type EstadoCarta = 'oculta' | 'salida' | 'girada';

interface Props {
  cartas: readonly CartaResumen[];
  onTerminar: () => void;
}

/**
 * Apertura de un sobre propio (002/FR-006 a FR-010; spec 003, FR-011 a FR-015, research R21): el sobre brilla,
 * tiembla y se rasga con partículas; las 8 cartas salen boca abajo, escalonadas, hasta su sitio y giran
 * mostrando la carta completa; las Legendario y GOAT, con destello, partículas de su color y una pausa.
 * «Saltar» o un toque en cualquier punto revela todo al instante. Con movimiento reducido, solo un fundido.
 * Las cartas nunca dependen de las partículas: si el canvas falla o se desactiva, la secuencia sigue igual.
 */
export function AperturaSobre({ cartas, onTerminar }: Props) {
  const reducido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const [fase, setFase] = useState<Fase>(reducido ? 'fundido' : 'sobre');
  const [estados, setEstados] = useState<EstadoCarta[]>(() => cartas.map(() => 'oculta'));
  const lienzo = useRef<HTMLCanvasElement>(null);
  const sobre = useRef<HTMLDivElement>(null);
  const cartasDom = useRef<(HTMLDivElement | null)[]>([]);
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
      return () => t.forEach(clearTimeout);
    }
    let particulas: SistemaParticulas | null = null;
    const canvas = lienzo.current;
    if (canvas) {
      try {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particulas = iniciarParticulas(canvas);
      } catch {
        particulas = null;
      }
    }
    const centroDe = (el: Element | null | undefined): [number, number] => {
      const r = el?.getBoundingClientRect();
      return r ? [r.left + r.width / 2, r.top + r.height / 2] : [window.innerWidth / 2, window.innerHeight / 2];
    };
    const marcar = (i: number, e: EstadoCarta) => setEstados((prev) => prev.map((v, j) => (j === i ? e : v)));

    reproducir('apertura');
    t.push(
      setTimeout(() => {
        const [x, y] = centroDe(sobre.current);
        particulas?.emitir(x, y - 60, '#f5d76e', 60);
      }, DURACION_SOBRE_MS - 400),
    );
    t.push(setTimeout(() => setFase('cartas'), DURACION_SOBRE_MS));
    const { pasos, fundido, total } = calendarioApertura(cartas);
    pasos.forEach((p, i) => {
      t.push(
        setTimeout(() => {
          marcar(i, 'salida');
          reproducir('reparto');
        }, p.salida),
      );
      t.push(
        setTimeout(() => {
          marcar(i, 'girada');
          reproducir('volteo');
          const c = cartas[i];
          if (c && especial(c)) {
            reproducir('revelacion');
            const [x, y] = centroDe(cartasDom.current[i]);
            particulas?.emitir(x, y, COLOR_PARTICULAS[c.nivel] ?? '#ffd700', 50);
          }
        }, p.giro),
      );
    });
    t.push(setTimeout(() => setFase('fundido'), fundido));
    t.push(setTimeout(acabar, total));
    return () => {
      t.forEach(clearTimeout);
      particulas?.detener();
    };
  }, []);

  return (
    <div className={`apertura-sobre fase-${fase}`} role="dialog" aria-modal="true" aria-label="Apertura del sobre" onClick={acabar}>
      {!reducido && <canvas ref={lienzo} className="apertura-particulas" aria-hidden="true" />}
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
      {fase === 'sobre' && <div ref={sobre} className="sobre-cerrado" aria-hidden="true" />}
      {fase !== 'sobre' && (
        <div className="apertura-cartas" aria-hidden="true">
          {cartas.map((c, i) => (
            <div
              key={c.id}
              ref={(el) => {
                cartasDom.current[i] = el;
              }}
              className={`apertura-carta ${especial(c) ? 'especial' : ''} ${reducido ? 'girada' : estados[i]}`}
            >
              <div className="apertura-carta-dorso" />
              <div className="apertura-carta-frente">
                <CartaJugador jugador={c} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
