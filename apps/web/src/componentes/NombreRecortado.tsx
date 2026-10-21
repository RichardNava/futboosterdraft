/**
 * Nombre que no cabe (spec 004, Edge Cases; research R9; contracts/ui.md §10): se recorta con puntos suspensivos y,
 * solo si de verdad está recortado, muestra el texto completo en una etiqueta emergente (`popover="manual"`):
 * - con el ratón, al señalarlo 400 ms;
 * - con el teclado, al enfocar el control que lo contiene (la carta, el enlace, la fila);
 * - con el dedo, al mantenerlo pulsado 500 ms (se cancela si el dedo se mueve más de 10 px). Esa pulsación no
 *   cuenta como elección: el `click` siguiente se anula en fase de captura, y no se abre el menú del navegador.
 * El texto completo está siempre en el DOM, así que los lectores de pantalla lo leen entero.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, type ElementType, type PointerEvent } from 'react';

export interface PunteroBasico {
  pointerType: string;
  clientX: number;
  clientY: number;
}

export interface DetectorPulsacion {
  bajar(e: PunteroBasico): void;
  mover(e: PunteroBasico): void;
  subir(): void;
  /** `true` (una sola vez) si la pulsación larga se disparó y el clic que la sigue no debe contar. */
  anularClic(): boolean;
}

/** Lógica pura de la pulsación larga táctil (probada en tests/unit/nombreRecortado.test.ts). */
export function crearDetectorPulsacion(opciones: { retardoMs: number; toleranciaPx: number; alDisparar: () => void }): DetectorPulsacion {
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  let origen: { x: number; y: number } | null = null;
  let anular = false;
  const parar = () => {
    if (temporizador !== null) clearTimeout(temporizador);
    temporizador = null;
  };
  return {
    bajar(e) {
      if (e.pointerType !== 'touch') return;
      parar();
      anular = false;
      origen = { x: e.clientX, y: e.clientY };
      temporizador = setTimeout(() => {
        temporizador = null;
        anular = true;
        opciones.alDisparar();
      }, opciones.retardoMs);
    },
    mover(e) {
      if (!origen || temporizador === null) return;
      if (Math.hypot(e.clientX - origen.x, e.clientY - origen.y) > opciones.toleranciaPx) {
        parar();
        origen = null;
      }
    },
    subir() {
      parar();
      origen = null;
    },
    anularClic() {
      if (!anular) return false;
      anular = false;
      return true;
    },
  };
}

const RETARDO_RATON_MS = 400;
const RETARDO_TACTIL_MS = 500;
const TOLERANCIA_PX = 10;
const VISIBLE_TRAS_TOQUE_MS = 2500;
const CONTROL = 'a, button, [role="button"], [role="tab"], summary, [tabindex]:not([tabindex="-1"]):not(.tabla-desplazable)';

interface Props {
  texto: string;
  /** Elemento que se pinta (por defecto, `span`). */
  como?: ElementType;
  /** Líneas antes de recortar (1 o 2). */
  lineas?: 1 | 2;
  className?: string;
}

export function NombreRecortado({ texto, como: Elemento = 'span', lineas = 1, className }: Props) {
  const id = useId().replace(/:/g, '');
  const ref = useRef<HTMLElement>(null);
  const etiqueta = useRef<HTMLSpanElement>(null);
  const [recortado, setRecortado] = useState(false);
  const recortadoRef = useRef(false);
  recortadoRef.current = recortado;
  const temporizador = useRef<number | undefined>(undefined);

  // ¿Está recortado de verdad? Se vuelve a medir cuando cambia el tamaño.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setRecortado(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [texto, lineas]);

  const mostrar = () => {
    const el = ref.current;
    const pop = etiqueta.current;
    if (!el || !pop || !recortadoRef.current) return;
    try {
      if (!pop.matches(':popover-open')) pop.showPopover();
    } catch {
      return;
    }
    const r = el.getBoundingClientRect();
    const margen = 8;
    const ancho = pop.offsetWidth;
    const alto = pop.offsetHeight;
    const izquierda = Math.min(Math.max(margen, r.left), window.innerWidth - ancho - margen);
    const arriba = r.bottom + 4 + alto > window.innerHeight - margen ? r.top - alto - 4 : r.bottom + 4;
    pop.style.left = `${izquierda}px`;
    pop.style.top = `${Math.max(margen, arriba)}px`;
  };
  const ocultar = () => {
    window.clearTimeout(temporizador.current);
    try {
      etiqueta.current?.hidePopover();
    } catch {
      // Ya estaba oculta.
    }
  };

  const [detector] = useState(() =>
    crearDetectorPulsacion({
      retardoMs: RETARDO_TACTIL_MS,
      toleranciaPx: TOLERANCIA_PX,
      alDisparar: () => {
        // El clic que sigue a la pulsación larga no elige la carta ni la fila (fase de captura), esté o no recortado.
        const anular = (e: Event) => {
          if (!detector.anularClic()) return;
          e.preventDefault();
          e.stopPropagation();
        };
        window.addEventListener('click', anular, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener('click', anular, { capture: true }), 1000);
        if (!recortadoRef.current) return;
        mostrar();
        temporizador.current = window.setTimeout(ocultar, VISIBLE_TRAS_TOQUE_MS);
      },
    }),
  );

  // Teclado: la etiqueta aparece al enfocar el control que contiene el nombre.
  useEffect(() => {
    const control = ref.current?.parentElement?.closest<HTMLElement>(CONTROL);
    if (!control) return;
    const alEnfocar = () => control.matches(':focus-visible') && mostrar();
    control.addEventListener('focus', alEnfocar);
    control.addEventListener('blur', ocultar);
    return () => {
      control.removeEventListener('focus', alEnfocar);
      control.removeEventListener('blur', ocultar);
    };
  });

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  const alEntrar = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(mostrar, RETARDO_RATON_MS);
  };
  const alSalir = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') ocultar();
  };

  const clases = ['nombre-recortado', lineas === 2 ? 'dos-lineas' : '', className].filter(Boolean).join(' ');
  return (
    <>
      <Elemento
        ref={ref}
        className={clases}
        aria-describedby={recortado ? `nombre-${id}` : undefined}
        onPointerEnter={alEntrar}
        onPointerLeave={alSalir}
        onPointerDown={(e: PointerEvent) => detector.bajar(e)}
        onPointerMove={(e: PointerEvent) => detector.mover(e)}
        onPointerUp={() => detector.subir()}
        onPointerCancel={() => detector.subir()}
        onContextMenu={(e: Event) => e.preventDefault()}
      >
        {texto}
      </Elemento>
      <span ref={etiqueta} id={`nombre-${id}`} popover="manual" className="etiqueta-nombre" role="tooltip">
        {texto}
      </span>
    </>
  );
}
