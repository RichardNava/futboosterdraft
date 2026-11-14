/**
 * Sobre decorativo (spec 011, US2; contracts/ui.md §2): muestra el diseño actual de la cuenta sin avanzar el
 * carrusel. Sin sesión o sin aspecto cargado, el sobre original.
 */
import { useEffect } from 'react';
import { useAspecto } from '../estado/aspecto';
import { SobreArte } from './arte/SobreArte';

/** Sobre decorativo con el diseño actual de la cuenta. */
export function SobreDecorativo({ className, rasgado }: { className?: string; rasgado?: boolean }) {
  const diseno = useAspecto((s) => s.aspecto?.sobreActual);
  useEffect(() => {
    void useAspecto.getState().cargar();
  }, []);
  return <SobreArte className={className} rasgado={rasgado} diseno={diseno} />;
}
