import { useId } from 'react';
import { colorDorsal, firmaPatron, patronDiseno, principal, type Equipacion } from '@fbd/domain';
import { contornoSobreLienzo } from './colores';

interface Props {
  equipacion: Equipacion;
  /** Dorsal de muestra. */
  dorsal?: number;
  tamano?: number;
  etiqueta?: string;
}

/** Silueta de la camiseta en un cuadro de 100 × 100. */
const SILUETA = 'M30 6 L42 2 Q50 10 58 2 L70 6 L96 22 L86 40 L76 34 L76 96 L24 96 L24 34 L14 40 L4 22 Z';

/**
 * Camiseta en SVG (spec 003, FR-045, FR-046; research R24): las regiones de `patronDiseno` recortadas con la
 * silueta, el dorsal en el color de contraste y `data-patron` con la firma del patrón, la misma que lleva la chapa
 * de la 2D (SC-022). Si el color principal se confunde con el lienzo, la silueta lleva contorno claro (spec 004, FR-034).
 */
export function Camiseta({ equipacion, dorsal = 10, tamano = 72, etiqueta }: Props) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      className={contornoSobreLienzo(principal(equipacion)) ? 'camiseta con-contorno' : 'camiseta'}
      width={tamano}
      height={tamano}
      viewBox="0 0 100 100"
      role="img"
      aria-label={etiqueta ?? 'Camiseta'}
      data-patron={firmaPatron(equipacion)}
    >
      <defs>
        <clipPath id={`silueta-${id}`}>
          <path d={SILUETA} />
        </clipPath>
      </defs>
      <g clipPath={`url(#silueta-${id})`}>
        {patronDiseno(equipacion).map((r, i) => (
          <polygon key={i} points={r.puntos.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')} fill={r.color} />
        ))}
      </g>
      <path className="camiseta-silueta" d={SILUETA} fill="none" strokeWidth="2" />
      <text
        x="50"
        y="66"
        textAnchor="middle"
        fontSize="28"
        fontWeight="800"
        fill={colorDorsal(equipacion)}
        stroke={equipacion.colores[0]}
        strokeWidth="3"
        paintOrder="stroke"
      >
        {dorsal}
      </text>
    </svg>
  );
}
