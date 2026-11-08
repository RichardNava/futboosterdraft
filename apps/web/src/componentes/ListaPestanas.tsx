import { alTeclaPestanas } from './pestanas';

/** Pestañas de la mesa del equipo (Formación y «Gestionar equipo», spec 012 FR-015), con teclado (spec 004, FR-030). */
export function ListaPestanas<T extends string>({
  pestanas,
  activa,
  onElegir,
  etiqueta,
}: {
  pestanas: readonly { id: T; texto: string }[];
  activa: T;
  onElegir: (id: T) => void;
  etiqueta: string;
}) {
  return (
    <div className="pestanas" role="tablist" aria-label={etiqueta} onKeyDown={alTeclaPestanas}>
      {pestanas.map((p) => (
        <button
          key={p.id}
          id={`pestana-${p.id}`}
          type="button"
          role="tab"
          aria-selected={activa === p.id}
          aria-controls={`panel-${p.id}`}
          tabIndex={activa === p.id ? 0 : -1}
          onClick={() => onElegir(p.id)}
        >
          {p.texto}
        </button>
      ))}
    </div>
  );
}
