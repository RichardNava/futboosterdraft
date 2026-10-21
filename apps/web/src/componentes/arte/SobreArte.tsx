import { useId } from 'react';

/**
 * Sobre de cartas ilustrado (spec 004, FR-044): lámina de foil verde noche con los bordes dentados del sellado,
 * franjas holográficas, una banda lima y el escudo. `rasgado` quita el borde superior (el sobre recién abierto).
 * Tiene la proporción de las cartas tal como se ven (≈ 5 : 9, `--proporcion-sobre`), no la de un cromo cuadrado.
 */
export function SobreArte({ className, rasgado = false }: { className?: string; rasgado?: boolean }) {
  const id = useId().replace(/:/g, '');
  // Borde superior (de izquierda a derecha): sellado dentado o rasgado irregular.
  let superior = 'M0 14';
  if (rasgado) superior = 'M0 46 L14 40 L22 47 L37 38 L49 45 L63 36 L78 44 L90 37 L104 46 L118 39 L131 45 L146 37 L158 44 L171 38 L186 46 L200 40';
  else for (let x = 0; x < 200; x += 10) superior += ` L${x + 5} 8 L${x + 10} 14`;
  // Borde inferior (de derecha a izquierda), dentado.
  let inferior = 'L200 346';
  for (let x = 200; x > 0; x -= 10) inferior += ` L${x - 5} 352 L${x - 10} 346`;
  const contorno = `${superior} ${inferior} Z`;
  return (
    <svg className={className} viewBox="0 0 200 360" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-foil`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f5a3d" />
          <stop offset="0.45" stopColor="#0d2a1d" />
          <stop offset="1" stopColor="#05110b" />
        </linearGradient>
        <linearGradient id={`${id}-holo`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#b7ff2c" stopOpacity="0" />
          <stop offset="0.3" stopColor="#7cf7d4" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#fff1c9" stopOpacity="0.5" />
          <stop offset="0.7" stopColor="#c7a2ff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#b7ff2c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-banda`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d4ff7a" />
          <stop offset="1" stopColor="#8fd41a" />
        </linearGradient>
        <clipPath id={`${id}-cuerpo`}>
          <path d={contorno} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-cuerpo)`}>
        <rect width="200" height="360" fill={`url(#${id}-foil)`} />
        {/* Franjas diagonales del foil y reflejo holográfico. */}
        <g opacity="0.16" stroke="#ffffff" strokeWidth="1">
          {Array.from({ length: 30 }, (_, i) => (
            <path key={i} d={`M${-200 + i * 16} 360 L${48 + i * 16} 0`} />
          ))}
        </g>
        <rect className="sobre-arte-holo" x="-60" y="0" width="320" height="360" fill={`url(#${id}-holo)`} />
        {/* Sellado: franjas oscuras arriba y abajo. */}
        {!rasgado && <rect y="0" width="200" height="30" fill="#04100a" opacity="0.55" />}
        <rect y="328" width="200" height="32" fill="#04100a" opacity="0.55" />
        {/* Banda lima con el escudo. */}
        <rect y="196" width="200" height="34" fill={`url(#${id}-banda)`} />
        <text x="100" y="220" textAnchor="middle" className="sobre-arte-banda">
          8 cartas
        </text>
        <g transform="translate(100 124)">
          <circle r="44" fill="#000000" opacity="0.28" />
          <path d="M-22 -40h44l9 9v34c0 20-19 31-31 36-12-5-31-16-31-36v-34z" fill="#0a1913" stroke="#b7ff2c" strokeWidth="3.5" />
          <g transform="translate(0 16)">
            <path d="M-10 -38h18l3 3v29h-21z" fill="#eef5f0" />
            <circle cx="0" cy="-22" r="7" fill="none" stroke="#0a1913" strokeWidth="2" />
            <path d="M0 -26l3.6 2.6-1.4 4.2h-4.4l-1.4-4.2z" fill="#0a1913" />
          </g>
        </g>
        <text x="100" y="278" textAnchor="middle" className="sobre-arte-nombre">
          Fútboosterdraft
        </text>
        <text x="100" y="298" textAnchor="middle" className="sobre-arte-sub">
          Sobre de jugadores
        </text>
      </g>
    </svg>
  );
}
