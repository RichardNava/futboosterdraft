export type Modalidad = 'rapida' | '2d';

const OPCIONES: { valor: Modalidad; etiqueta: string; detalle: string }[] = [
  { valor: 'rapida', etiqueta: 'Simulación rápida', detalle: 'Resumen por partes, con cambios en el descanso.' },
  { valor: '2d', etiqueta: 'Simulación 2D', detalle: 'El partido en el campo, a la velocidad que elijas.' },
];

/**
 * Selector del modo de simulación de un partido (spec 003, FR-032 a FR-035; research R19): dos opciones
 * exclusivas, preseleccionadas con la última modalidad usada. Solo aparece antes de empezar el partido.
 */
export function SelectorModo({ valor, onCambiar, nombre = 'modalidad' }: { valor: Modalidad; onCambiar: (m: Modalidad) => void; nombre?: string }) {
  return (
    <fieldset className="selector-modo" data-testid="selector-modo">
      <legend>¿Cómo quieres ver el partido?</legend>
      {OPCIONES.map((o) => (
        <label key={o.valor} className={valor === o.valor ? 'elegida' : ''}>
          <input type="radio" name={nombre} value={o.valor} checked={valor === o.valor} onChange={() => onCambiar(o.valor)} />
          <span>
            <strong>{o.etiqueta}</strong>
            <span className="nota"> {o.detalle}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
