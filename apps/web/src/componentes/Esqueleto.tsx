/**
 * Estado de carga con la forma del contenido (spec 004, FR-024; research R12): filas de tabla, rejilla de cartas o
 * campo. El pulso es solo de opacidad y se apaga con movimiento reducido.
 */
export type FormaEsqueleto = 'filas' | 'cartas' | 'campo';

export function Esqueleto({ forma, cantidad, texto = 'Cargando…' }: { forma: FormaEsqueleto; cantidad?: number; texto?: string }) {
  const n = cantidad ?? (forma === 'filas' ? 5 : forma === 'cartas' ? 8 : 1);
  return (
    <div className={`esqueleto esqueleto-${forma}`} aria-busy="true" role="status">
      <span className="solo-lectores">{texto}</span>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="esqueleto-bloque" aria-hidden="true" />
      ))}
    </div>
  );
}

/** Pantalla entera mientras carga: el esqueleto dentro de la columna de la pantalla. */
export function PantallaCargando({ forma, texto }: { forma: FormaEsqueleto; texto?: string }) {
  return (
    <main className="pantalla">
      <Esqueleto forma={forma} texto={texto} />
    </main>
  );
}
