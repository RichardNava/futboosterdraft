/**
 * Estado de carga con la forma del contenido (spec 004, FR-024; research R12): filas de tabla, rejilla de cartas o
 * campo. El pulso es solo de opacidad y se apaga con movimiento reducido.
 */
import { useConectandoLargo } from '../estado/conexionServidor';

type FormaEsqueleto = 'filas' | 'cartas' | 'campo';

/** Marcador de carga con la forma del contenido (filas, cartas o campo). */
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

/**
 * Pantalla entera mientras carga: el esqueleto dentro de la columna de la pantalla. `diferida` (spec 016, ronda 3): el
 * esqueleto solo aparece si la espera se alarga, para que una carga corta (abrir un partido) no dé un pestañeo.
 */
export function PantallaCargando({ forma, texto, diferida = false }: { forma: FormaEsqueleto; texto?: string; diferida?: boolean }) {
  // Spec 013 (FR-023): el aviso visible lo pinta el `Marco`; aquí, el texto para lectores de pantalla.
  const conectando = useConectandoLargo();
  return (
    <main className={diferida ? 'pantalla cargando-diferida' : 'pantalla'}>
      <Esqueleto forma={forma} texto={conectando ? 'Conectando con el servidor…' : texto} />
    </main>
  );
}
