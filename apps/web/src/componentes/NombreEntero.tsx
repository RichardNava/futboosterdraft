import { useLayoutEffect, useRef } from 'react';

/**
 * Nombre de equipo dentro de un titular que nunca se parte (ni por el guion de «Invitado-6161»): si no cabe en una
 * línea del titular, se reduce su letra hasta que quepa (004/T074, decisión del 2026-11-20).
 */
export function NombreEntero({ texto }: { texto: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const nombre = ref.current;
    const titular = nombre?.parentElement;
    if (!nombre || !titular) return;
    const ajustar = () => {
      nombre.style.fontSize = '';
      const sobra = nombre.getBoundingClientRect().width / titular.clientWidth;
      if (sobra > 1) nombre.style.fontSize = `${(1 / sobra).toFixed(3)}em`;
    };
    ajustar();
    void document.fonts?.ready.then(ajustar);
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, [texto]);
  return (
    <span ref={ref} className="nombre-entero">
      {texto}
    </span>
  );
}
