import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { CartaJugador, type CartaResumen } from './CartaJugador';

/** Retardo de intención con ratón y duración de la pulsación larga en táctil (research R15). */
export const RETARDO_RATON_MS = 150;
export const PULSACION_LARGA_MS = 400;
const TOLERANCIA_PX = 8;
const MARGEN_PX = 8;

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Posición de la carta ampliada (research R15): a la derecha, a la izquierda, arriba o abajo de la ficha, en el
 * primer lado en que cabe entera sin taparla; si no cabe en ninguno, acotada al viewport. Siempre dentro del
 * viewport con un margen de 8 px.
 */
export function posicionarVista(ancla: Rect, carta: { width: number; height: number }, viewport: { width: number; height: number }, margen = MARGEN_PX): { left: number; top: number } {
  const centroX = ancla.left + ancla.width / 2 - carta.width / 2;
  const centroY = ancla.top + ancla.height / 2 - carta.height / 2;
  const acotarX = (x: number) => Math.min(viewport.width - margen - carta.width, Math.max(margen, x));
  const acotarY = (y: number) => Math.min(viewport.height - margen - carta.height, Math.max(margen, y));
  const opciones = [
    { left: ancla.left + ancla.width + margen, top: acotarY(centroY) },
    { left: ancla.left - margen - carta.width, top: acotarY(centroY) },
    { left: acotarX(centroX), top: ancla.top - margen - carta.height },
    { left: acotarX(centroX), top: ancla.top + ancla.height + margen },
  ];
  const cabe = (o: { left: number; top: number }) =>
    o.left >= margen && o.top >= margen && o.left + carta.width <= viewport.width - margen && o.top + carta.height <= viewport.height - margen;
  return opciones.find(cabe) ?? { left: acotarX(opciones[0]!.left), top: acotarY(centroY) };
}

interface Props {
  jugador: CartaResumen | undefined;
  /** Mientras se arrastra una ficha no se muestra ninguna carta. */
  arrastrando?: boolean;
  dorsal?: number;
  children: ReactNode;
}

/**
 * Vista ampliada de la carta (FR-004, FR-005; contracts/ui.md): la carta completa al pasar el ratón (tras 150 ms),
 * al mantener pulsado en táctil (400 ms sin moverse más de 8 px) o al recibir el foco. Va en un elemento
 * `popover="manual"` (capa superior) colocado por `posicionarVista`.
 */
export function VistaCarta({ jugador, arrastrando = false, dorsal, children }: Props) {
  const ancla = useRef<HTMLSpanElement>(null);
  const capa = useRef<HTMLDivElement>(null);
  const temporizador = useRef<number | undefined>(undefined);
  const inicioToque = useRef<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(false);

  const cancelar = () => window.clearTimeout(temporizador.current);
  const ocultar = useCallback(() => {
    cancelar();
    inicioToque.current = null;
    setVisible(false);
  }, []);
  const mostrarTras = (ms: number) => {
    cancelar();
    temporizador.current = window.setTimeout(() => setVisible(true), ms);
  };

  useEffect(() => {
    if (arrastrando) ocultar();
  }, [arrastrando, ocultar]);
  useEffect(() => () => cancelar(), []);

  // Mostrar en la capa superior y colocar, una vez montada la carta (su tamaño ya se conoce).
  useEffect(() => {
    const el = capa.current;
    const a = ancla.current;
    if (!visible || !el || !a) return;
    try {
      if (!el.matches(':popover-open')) el.showPopover?.();
    } catch {
      // Sin soporte de popover: la capa es fija y ya está por encima.
    }
    // El ancla no tiene caja propia (`display: contents`): se mide la ficha que envuelve.
    const r = (a.firstElementChild ?? a).getBoundingClientRect();
    const t = el.getBoundingClientRect();
    const pos = posicionarVista(r, { width: t.width, height: t.height }, { width: window.innerWidth, height: window.innerHeight });
    el.style.left = `${pos.left}px`;
    el.style.top = `${pos.top}px`;
    el.style.visibility = 'visible';
  }, [visible]);

  if (!jugador) return <>{children}</>;
  return (
    <span
      ref={ancla}
      className="vista-carta-ancla"
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse' && !arrastrando) mostrarTras(RETARDO_RATON_MS);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') ocultar();
      }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' || arrastrando) return;
        inicioToque.current = { x: e.clientX, y: e.clientY };
        mostrarTras(PULSACION_LARGA_MS);
      }}
      onPointerMove={(e) => {
        const i = inicioToque.current;
        if (i && Math.hypot(e.clientX - i.x, e.clientY - i.y) > TOLERANCIA_PX) ocultar();
      }}
      onPointerUp={(e) => {
        if (e.pointerType !== 'mouse') ocultar();
      }}
      onPointerCancel={ocultar}
      onFocus={() => !arrastrando && setVisible(true)}
      onBlur={ocultar}
      onContextMenu={(e) => {
        // En táctil, la pulsación larga no abre el menú contextual del navegador.
        if (inicioToque.current) e.preventDefault();
      }}
    >
      {children}
      {visible && (
        <div ref={capa} popover="manual" className="vista-carta" role="tooltip" data-testid="vista-carta" style={{ visibility: 'hidden' }}>
          <CartaJugador jugador={jugador} dorsal={dorsal} />
        </div>
      )}
    </span>
  );
}
