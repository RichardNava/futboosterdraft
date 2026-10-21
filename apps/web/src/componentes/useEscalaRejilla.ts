import { useLayoutEffect, type RefObject } from 'react';

interface Opciones {
  /** Escala máxima (por defecto, 1,2). */
  maxima?: number;
  /** Escala mínima (por defecto, 0,5). */
  minima?: number;
  /** Por debajo de este ancho de ventana no se escala (carrusel en móvil). */
  anchoMinimo?: number;
  /** Cambia cuando cambia el contenido (p. ej. el número de cartas), para volver a medir. */
  clave?: unknown;
}

/**
 * Escala una rejilla para que quepa entera en su contenedor (spec 004, FR-046; research R16): mide el tamaño natural
 * de la rejilla con `zoom: 1` y aplica `zoom = min(ancho disponible / ancho natural, alto disponible / alto natural)`.
 * Así las cartas del sobre se ven todas a la vez, sin desplazarse, a su tamaño máximo posible. Se vuelve a medir
 * al cambiar el tamaño del contenedor, el contenido o al terminar de cargar las tipografías.
 */
export function useEscalaRejilla(contenedor: RefObject<HTMLElement | null>, rejilla: RefObject<HTMLElement | null>, opciones: Opciones = {}) {
  const { maxima = 1.2, minima = 0.5, anchoMinimo = 720, clave } = opciones;
  useLayoutEffect(() => {
    const caja = contenedor.current;
    const el = rejilla.current;
    if (!caja || !el) return;
    let vigente = true;
    const medir = () => {
      if (!vigente) return;
      if (window.innerWidth < anchoMinimo) {
        el.style.zoom = '';
        el.style.removeProperty('--escala-rejilla');
        return;
      }
      el.style.zoom = '1';
      const natural = el.getBoundingClientRect();
      const estilo = getComputedStyle(caja);
      const ancho = caja.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
      const alto = caja.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
      if (natural.width === 0 || natural.height === 0 || ancho <= 0 || alto <= 0) return;
      const escala = Math.max(minima, Math.min(maxima, ancho / natural.width, alto / natural.height));
      const z = Math.floor(escala * 1000) / 1000;
      el.style.zoom = String(z);
      // Para compensar el grosor del foco y otros trazos dentro de la rejilla escalada.
      el.style.setProperty('--escala-rejilla', String(z));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(caja);
    void document.fonts?.ready.then(medir);
    return () => {
      vigente = false;
      observador.disconnect();
    };
  }, [contenedor, rejilla, maxima, minima, anchoMinimo, clave]);
}
