import { formatoFragmentos } from './DialogoPagoPrueba';

interface Props {
  cantidad: number;
  /** Antepone «+» a las cantidades positivas (compensaciones, recompensas). Las negativas siempre llevan «−». */
  signo?: boolean;
  /** Lado del icono en px: 16 en línea, 18 en la barra, 24 en los botones grandes. Nunca menos de 16. */
  tamano?: 16 | 18 | 24;
}

/**
 * Cantidad de fragmentos con su icono (spec 016, FR-030, FR-031; contracts/ui.md §1). El icono es decorativo: el
 * lector de pantalla lee «2.400 fragmentos».
 */
export function Fragmentos({ cantidad, signo = false, tamano = 16 }: Props) {
  return (
    <span className="fragmentos">
      <img
        className="fragmentos-icono"
        src="/iconos/fragmento-32.webp"
        srcSet="/iconos/fragmento-32.webp 1x, /iconos/fragmento-64.webp 2x"
        width={tamano}
        height={tamano}
        alt=""
        aria-hidden="true"
      />
      {signo && cantidad > 0 ? '+' : cantidad < 0 ? '−' : ''}
      {formatoFragmentos.format(Math.abs(cantidad))}
      <span className="solo-lectores"> fragmentos</span>
    </span>
  );
}
