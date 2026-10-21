/**
 * Diálogo accesible con teclado (spec 004, FR-030): al abrirse, el foco entra en el diálogo; Tab y Mayús+Tab no
 * salen de él; Escape lo cierra (si se pasa `alEscape`) y, al cerrarse, el foco vuelve a donde estaba.
 */
import { useEffect, useRef, type RefObject } from 'react';

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useAtraparFoco(ref: RefObject<HTMLElement | null>, alEscape?: () => void): void {
  const escape = useRef(alEscape);
  escape.current = alEscape;

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const enfocables = () => Array.from(dialogo.querySelectorAll<HTMLElement>(ENFOCABLES)).filter((el) => el.getClientRects().length > 0);
    if (!dialogo.contains(document.activeElement)) (enfocables()[0] ?? dialogo).focus();

    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && escape.current) {
        e.preventDefault();
        e.stopPropagation();
        escape.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const xs = enfocables();
      if (xs.length === 0) return;
      const primero = xs[0]!;
      const ultimo = xs[xs.length - 1]!;
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    dialogo.addEventListener('keydown', alTecla);
    return () => {
      dialogo.removeEventListener('keydown', alTecla);
      if (previo?.isConnected) previo.focus();
    };
  }, [ref]);
}
