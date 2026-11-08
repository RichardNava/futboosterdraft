/**
 * «Incidencias: Automático / Control total» (spec 012, FR-020, FR-024; contracts/ui.md): control segmentado con
 * botones (Tab llega a cada uno y Intro o espacio lo elige). Se usa en el carril de la 2D, en la rápida y en la
 * pestaña Táctica de Formación.
 */
import type { ModoIncidencias } from '@fbd/domain';

const OPCIONES: { modo: ModoIncidencias; texto: string }[] = [
  { modo: 'automatico', texto: 'Automático' },
  { modo: 'control_total', texto: 'Control total' },
];

export function SelectorModoIncidencias({ modo, onCambio, desactivado = false }: { modo: ModoIncidencias; onCambio: (m: ModoIncidencias) => void; desactivado?: boolean }) {
  return (
    <div className="selector-modo-incidencias">
      <span className="nota" id="etiqueta-modo-incidencias">
        Incidencias
      </span>
      <div className="segmentado" role="group" aria-labelledby="etiqueta-modo-incidencias">
        {OPCIONES.map((o) => (
          <button key={o.modo} type="button" aria-pressed={o.modo === modo} disabled={desactivado} onClick={() => o.modo !== modo && onCambio(o.modo)}>
            {o.texto}
          </button>
        ))}
      </div>
      <span className="nota">
        {modo === 'control_total' ? 'Una lesión o expulsión de tu equipo detiene el partido para que decidas.' : 'Las lesiones y expulsiones se resuelven solas.'}
      </span>
    </div>
  );
}
