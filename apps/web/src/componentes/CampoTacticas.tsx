import { ANCHO_CAMPO, LARGO_CAMPO, ZONA_PORTERIA, zonaEn, type ResultadoColocacion } from '@fbd/domain';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { CartaResumen } from './CartaJugador';

interface Props {
  /** Resultado de `calcularColocacion` con los puntos actuales (posición efectiva y zona de cada titular). */
  colocacion: ResultadoColocacion;
  jugadores: Map<number, CartaResumen>;
  dorsales: Record<number, number> | null;
  colores: { principal: string; secundario: string };
  onMover: (jugadorId: number, x: number, y: number) => void;
}

const PASO = 10;
const PASO_LARGO = 50;

/** Acota un punto: el portero, dentro de su zona; los de campo, fuera de ella (FR-034a). */
function acotar(x: number, y: number, esPortero: boolean): { x: number; y: number } {
  const r = ZONA_PORTERIA.rect;
  let cx = Math.round(Math.min(LARGO_CAMPO, Math.max(0, x)));
  let cy = Math.round(Math.min(ANCHO_CAMPO, Math.max(0, y)));
  if (esPortero) {
    cx = Math.min(r.x1 - 1, Math.max(r.x0, cx));
    cy = Math.min(r.y1 - 1, Math.max(r.y0, cy));
  } else if (cx < r.x1 && cy >= r.y0 && cy < r.y1) {
    cx = r.x1;
  }
  return { x: cx, y: cy };
}

/**
 * Campo de tácticas con colocación libre (FR-034; contracts/ui.md): cualquier titular de campo se arrastra a
 * cualquier punto fuera de la zona de portería, y el portero solo dentro de ella. Mientras se arrastra se
 * resalta la zona bajo el puntero con su código. Alternativa con teclado: seleccionar con Intro o Espacio,
 * mover con las flechas (Mayúsculas para pasos largos), Intro para dejarlo y Escape para cancelar.
 *
 * Se dibuja en vertical, con la propia portería abajo: x (0–1000) hacia arriba e y (0–640) de izquierda a
 * derecha.
 */
export function CampoTacticas({ colocacion, jugadores, dorsales, colores, onMover }: Props) {
  const campo = useRef<HTMLDivElement>(null);
  const [arrastre, setArrastreEstado] = useState<{ jugadorId: number; x: number; y: number } | null>(null);
  // El arrastre en curso también en una referencia: al soltar se lee el último punto aunque React aún no
  // haya pintado los movimientos anteriores.
  const arrastreRef = useRef<{ jugadorId: number; x: number; y: number } | null>(null);
  const setArrastre = (a: { jugadorId: number; x: number; y: number } | null) => {
    arrastreRef.current = a;
    setArrastreEstado(a);
  };
  const [teclado, setTeclado] = useState<{ jugadorId: number; origen: { x: number; y: number } } | null>(null);

  const puntoDe = (e: PointerEvent): { x: number; y: number } | null => {
    const r = campo.current?.getBoundingClientRect();
    if (!r || r.width === 0) return null;
    return { x: ((r.bottom - e.clientY) / r.height) * LARGO_CAMPO, y: ((e.clientX - r.left) / r.width) * ANCHO_CAMPO };
  };

  const zonaResaltada = arrastre ? zonaEn(arrastre.x, arrastre.y) : null;

  return (
    <div
      ref={campo}
      className="campo campo-tacticas"
      aria-label="Colocación de los titulares"
      onPointerMove={(e) => {
        const actual = arrastreRef.current;
        if (!actual) return;
        const p = puntoDe(e);
        if (!p) return;
        const t = colocacion.titulares.find((x) => x.jugadorId === actual.jugadorId)!;
        setArrastre({ jugadorId: actual.jugadorId, ...acotar(p.x, p.y, t.casillaId === 'POR') });
      }}
      onPointerUp={() => {
        const actual = arrastreRef.current;
        if (actual) onMover(actual.jugadorId, actual.x, actual.y);
        setArrastre(null);
      }}
      onPointerCancel={() => setArrastre(null)}
    >
      {zonaResaltada && (
        <div
          className="zona-resaltada"
          style={{
            left: `${(zonaResaltada.rect.y0 / ANCHO_CAMPO) * 100}%`,
            width: `${((zonaResaltada.rect.y1 - zonaResaltada.rect.y0) / ANCHO_CAMPO) * 100}%`,
            bottom: `${(zonaResaltada.rect.x0 / LARGO_CAMPO) * 100}%`,
            height: `${((zonaResaltada.rect.x1 - zonaResaltada.rect.x0) / LARGO_CAMPO) * 100}%`,
          }}
          aria-hidden="true"
        >
          <span>{zonaResaltada.posicionesAdmitidas.join('/')}</span>
        </div>
      )}
      {colocacion.titulares.map((t) => {
        const j = jugadores.get(t.jugadorId);
        const enArrastre = arrastre?.jugadorId === t.jugadorId ? arrastre : null;
        const x = enArrastre?.x ?? t.x;
        const y = enArrastre?.y ?? t.y;
        const seleccionado = teclado?.jugadorId === t.jugadorId;
        const esPortero = t.casillaId === 'POR';
        const alTeclado = (e: KeyboardEvent) => {
          if (!seleccionado) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setTeclado({ jugadorId: t.jugadorId, origen: { x: t.x, y: t.y } });
            }
            return;
          }
          const paso = e.shiftKey ? PASO_LARGO : PASO;
          const mover: Record<string, [number, number]> = { ArrowUp: [paso, 0], ArrowDown: [-paso, 0], ArrowLeft: [0, -paso], ArrowRight: [0, paso] };
          if (mover[e.key]) {
            e.preventDefault();
            const [dx, dy] = mover[e.key]!;
            const p = acotar(t.x + dx, t.y + dy, esPortero);
            onMover(t.jugadorId, p.x, p.y);
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setTeclado(null);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onMover(t.jugadorId, teclado.origen.x, teclado.origen.y);
            setTeclado(null);
          }
        };
        const nombre = j ? `${j.nombre} ${j.apellidos}` : String(t.jugadorId);
        return (
          <button
            key={t.jugadorId}
            type="button"
            className={`ficha-tactica ${seleccionado ? 'seleccionada' : ''} ${enArrastre ? 'arrastrando' : ''}`}
            style={{ left: `${(y / ANCHO_CAMPO) * 100}%`, bottom: `${(x / LARGO_CAMPO) * 100}%` }}
            aria-pressed={seleccionado}
            aria-label={`${nombre}: ${t.posicionEfectiva}${seleccionado ? ', moviendo con las flechas' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              (e.currentTarget.parentElement as HTMLElement | null)?.setPointerCapture?.(e.pointerId);
              setArrastre({ jugadorId: t.jugadorId, x: t.x, y: t.y });
            }}
            onKeyDown={alTeclado}
          >
            <span className="chapa" style={{ background: colores.principal, color: colores.secundario }}>
              {j ? (dorsales?.[j.id] ?? '') : ''}
            </span>
            <span className="ficha-tactica-posicion">{t.posicionEfectiva}</span>
            <span className="ficha-tactica-nombre">{j?.apellidos.split(' ')[0] ?? ''}</span>
          </button>
        );
      })}
    </div>
  );
}
