/**
 * Lista vacía (spec 004, FR-025; contracts/ui.md §7): explica qué falta y ofrece la acción para salir de ahí. Sin
 * ilustraciones.
 */
import type { ReactNode } from 'react';

export function EstadoVacio({ mensaje, accion }: { mensaje: string; accion?: ReactNode }) {
  return (
    <div className="panel estado-vacio">
      <p>{mensaje}</p>
      {accion}
    </div>
  );
}
