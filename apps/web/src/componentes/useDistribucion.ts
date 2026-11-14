/**
 * Distribución de la mesa del equipo (retoques de la spec 011; spec 012, FR-015): el campo en horizontal por defecto
 * en pantallas anchas, o el vertical de siempre; la elección se recuerda en este navegador y vale para «Formación» y
 * «Gestionar equipo». En pantallas estrechas, siempre vertical.
 */
import { useEffect, useState } from 'react';

const CLAVE_DISTRIBUCION = 'fbd:formacion-distribucion';
const PANTALLA_ANCHA = '(min-width: 1024px)';

/** Orientación del campo (horizontal o vertical) elegida por la persona o la que cabe en la pantalla. */
export function useDistribucion() {
  const [elegida, setElegida] = useState<'horizontal' | 'vertical'>(() => {
    try {
      return localStorage.getItem(CLAVE_DISTRIBUCION) === 'vertical' ? 'vertical' : 'horizontal';
    } catch {
      return 'horizontal';
    }
  });
  const [ancha, setAncha] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(PANTALLA_ANCHA).matches === true);
  useEffect(() => {
    const m = window.matchMedia?.(PANTALLA_ANCHA);
    if (!m) return;
    const alCambiar = () => setAncha(m.matches);
    m.addEventListener('change', alCambiar);
    return () => m.removeEventListener('change', alCambiar);
  }, []);
  const elegir = (d: 'horizontal' | 'vertical') => {
    setElegida(d);
    try {
      localStorage.setItem(CLAVE_DISTRIBUCION, d);
    } catch {
      // Sin almacenamiento (modo privado): vale para esta visita.
    }
  };
  return { orientacion: ancha ? elegida : ('vertical' as const), elegida, ancha, elegir };
}
