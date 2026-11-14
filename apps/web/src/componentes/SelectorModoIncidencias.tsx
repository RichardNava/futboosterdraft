/**
 * «Incidencias: Automático / Control total» (spec 012, FR-020, FR-024; contracts/ui.md): control segmentado con
 * botones (Tab llega a cada uno y Intro o espacio lo elige). Se usa en el carril de la 2D y en la pestaña Táctica de
 * Formación. Ronda 3: la explicación habla de «eventos trascendentales» (lesiones, expulsiones y goles) y va detrás del
 * icono de información; en la barra principal, la ayuda resumida de cada modo. Ronda 5: en la 2D, sin la etiqueta
 * visible «Incidencias» (queda como nombre del grupo), que dejaba sin sitio a «Control total»; en Táctica, con ella.
 */
import type { ModoIncidencias } from '@fbd/domain';
import { useId } from 'react';
import { Icono } from './Icono';
import { colocarJunto } from './NombreRecortado';

const OPCIONES: { modo: ModoIncidencias; texto: string; ayuda: string }[] = [
  { modo: 'automatico', texto: 'Automático', ayuda: 'Los eventos trascendentales se resuelven solos y el partido sigue.' },
  { modo: 'control_total', texto: 'Control total', ayuda: 'Cada evento trascendental detiene el partido para que decidas.' },
];

const DETALLE =
  'Los eventos trascendentales son los que pueden cambiar un partido: un gol, una lesión o una expulsión. ' +
  'En automático se resuelven solos (el entrenador hace los cambios necesarios) y el partido sigue. ' +
  'En control total, cada uno detiene el partido y se abre «Gestionar equipo» para que decidas tú. ' +
  'Solo en la simulación 2D; puedes cambiar de modo en cualquier momento.';

/** Elección entre «control total» y resolución automática de lesiones y expulsiones. */
export function SelectorModoIncidencias({
  modo,
  onCambio,
  desactivado = false,
  conEtiqueta = false,
}: {
  modo: ModoIncidencias;
  onCambio: (m: ModoIncidencias) => void;
  desactivado?: boolean;
  conEtiqueta?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <div className="selector-modo-incidencias">
      {conEtiqueta && (
        <span className="nota" aria-hidden="true">
          Incidencias
        </span>
      )}
      <div className="selector-modo-fila">
        <div className="segmentado" role="group" aria-label="Incidencias">
          {OPCIONES.map((o) => (
            <button key={o.modo} type="button" aria-pressed={o.modo === modo} disabled={desactivado} data-ayuda={o.ayuda} onClick={() => o.modo !== modo && onCambio(o.modo)}>
              {o.texto}
            </button>
          ))}
        </div>
        <button type="button" className="boton-ayuda" popoverTarget={`ayuda-${id}`} aria-label="Qué son los eventos trascendentales">
          <Icono nombre="informacion" />
        </button>
        <div
          id={`ayuda-${id}`}
          popover="auto"
          className="carta-descripcion"
          role="tooltip"
          onToggle={(e) => e.newState === 'open' && colocarJunto(e.currentTarget, e.currentTarget.previousElementSibling ?? e.currentTarget)}
        >
          {DETALLE}
        </div>
      </div>
    </div>
  );
}
