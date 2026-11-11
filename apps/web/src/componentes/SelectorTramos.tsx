import { useId, type CSSProperties } from 'react';

export interface Tramo<T extends string> {
  valor: T;
  etiqueta: string;
  descripcion: string;
  /** Texto corto bajo la marca (precio, «Con registro»…). */
  nota?: string;
  desactivado?: boolean;
}

interface Props<T extends string> {
  titulo: string;
  tramos: readonly Tramo<T>[];
  valor: T;
  onCambio: (valor: T) => void;
  className?: string;
}

/**
 * Deslizador por tramos (spec 013, ronda 2): sustituye a las losetas de Dificultad y Rareza en Nueva partida. Al moverlo,
 * la barra principal muestra el nombre del tramo en negrita y su descripción (`data-ayuda-titulo` y `data-ayuda`); en
 * estrecho, la descripción va debajo. Un tramo desactivado no se puede elegir: el deslizador vuelve al anterior.
 */
export function SelectorTramos<T extends string>({ titulo, tramos, valor, onCambio, className = '' }: Props<T>) {
  const id = useId();
  const indice = Math.max(0, tramos.findIndex((t) => t.valor === valor));
  const actual = tramos[indice]!;
  const ayuda = [actual.descripcion, actual.nota].filter(Boolean).join(' · ');
  const elegir = (i: number) => {
    const t = tramos[i];
    if (t && !t.desactivado) onCambio(t.valor);
  };
  return (
    <div
      className={`selector-tramos ${className}`}
      data-ayuda={ayuda}
      data-ayuda-titulo={actual.etiqueta}
      style={{ '--tramos': tramos.length, '--indice': indice } as CSSProperties}
    >
      <label htmlFor={id} className="selector-tramos-titulo">
        {titulo}: <strong>{actual.etiqueta}</strong>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={tramos.length - 1}
        step={1}
        value={indice}
        aria-valuetext={`${actual.etiqueta}. ${ayuda}`}
        onChange={(e) => elegir(Number(e.target.value))}
      />
      <ol className="selector-tramos-marcas" aria-hidden="true">
        {tramos.map((t, i) => (
          <li key={t.valor} style={{ '--i': i } as CSSProperties} data-actual={i === indice || undefined} data-desactivado={t.desactivado || undefined} onClick={() => elegir(i)}>
            <span>{t.etiqueta}</span>
            {t.nota && <small>{t.nota}</small>}
          </li>
        ))}
      </ol>
      <p className="nota ayuda-en-sitio">{ayuda}</p>
    </div>
  );
}
