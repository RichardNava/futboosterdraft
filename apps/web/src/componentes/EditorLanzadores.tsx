import type { Lanzadores } from '@fbd/domain';
import type { CartaResumen } from './CartaJugador';

interface Props {
  lanzadores: Lanzadores;
  /** Titulares (los lanzadores tienen que estar en el campo). */
  titulares: CartaResumen[];
  nombre: (id: number) => string;
  onCambiar: (l: Lanzadores) => void;
  /** Sin título propio cuando va dentro de una sección plegable con su resumen. */
  conTitulo?: boolean;
}

/** Lanzadores de penaltis, faltas y córners y orden de la tanda (FR-029a), en «Formación» y en la gestión del equipo. */
export function EditorLanzadores({ lanzadores, titulares, nombre, onCambiar, conTitulo = true }: Props) {
  const opciones = titulares.map((j) => (
    <option key={j.id} value={j.id}>
      {nombre(j.id)}
    </option>
  ));
  return (
    <section aria-label="Lanzadores" className="lanzadores">
      {conTitulo && <h2>Lanzadores</h2>}
      {(
        [
          ['penaltis', 'Penaltis'],
          ['faltas', 'Faltas directas'],
          ['corners', 'Córners'],
        ] as const
      ).map(([tipo, texto]) => (
        <label key={tipo}>
          {texto}{' '}
          <select value={lanzadores[tipo]} onChange={(e) => onCambiar({ ...lanzadores, [tipo]: Number(e.target.value) })}>
            {opciones}
          </select>
        </label>
      ))}
      <fieldset>
        <legend>Orden de la tanda de penaltis</legend>
        {lanzadores.tanda.map((id, i) => (
          <label key={i}>
            {i + 1}.{' '}
            <select
              value={id}
              onChange={(e) => {
                const nuevo = Number(e.target.value);
                const tanda = [...lanzadores.tanda];
                const previo = tanda.indexOf(nuevo);
                if (previo >= 0) tanda[previo] = tanda[i]!;
                tanda[i] = nuevo;
                onCambiar({ ...lanzadores, tanda });
              }}
            >
              {opciones}
            </select>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
