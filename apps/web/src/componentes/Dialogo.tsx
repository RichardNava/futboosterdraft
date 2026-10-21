/**
 * Diálogo modal sobre un velo (spec 004, data-model §2): panel con esquinas de 6 px, foco atrapado y Escape
 * (FR-030). `alPulsarFondo` cierra al pulsar fuera, si el diálogo lo permite.
 */
import { useRef, type ReactNode } from 'react';
import { useAtraparFoco } from './useAtraparFoco';

interface Props {
  children: ReactNode;
  rol?: 'dialog' | 'alertdialog';
  /** Id del título del diálogo. */
  etiquetadoPor?: string;
  /** Nombre accesible si no hay título visible. */
  etiqueta?: string;
  alEscape?: () => void;
  alPulsarFondo?: () => void;
}

export function Dialogo({ children, rol = 'dialog', etiquetadoPor, etiqueta, alEscape, alPulsarFondo }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useAtraparFoco(ref, alEscape);
  return (
    <div className="modal-fondo" role="presentation" onClick={alPulsarFondo}>
      <div
        ref={ref}
        className="modal"
        role={rol}
        aria-modal="true"
        aria-labelledby={etiquetadoPor}
        aria-label={etiqueta}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
