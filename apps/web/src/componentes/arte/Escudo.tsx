import { useId } from 'react';

/**
 * Escudo del juego (spec 004, FR-044): un escudo con las esquinas superiores achaflanadas —la misma forma que las
 * cartas— y tres cartas en abanico con el balón en la central. Decorativo: el nombre del juego va siempre al lado.
 */
export function Escudo({ className, tamano = 36 }: { className?: string; tamano?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} width={tamano} height={(tamano * 72) / 64} viewBox="0 0 64 72" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-fondo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d4733" />
          <stop offset="1" stopColor="#07140e" />
        </linearGradient>
        <linearGradient id={`${id}-borde`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e2ff9e" />
          <stop offset="0.5" stopColor="#b7ff2c" />
          <stop offset="1" stopColor="#6fae0c" />
        </linearGradient>
        <linearGradient id={`${id}-carta`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#cfdcd4" />
        </linearGradient>
      </defs>
      <path d="M9 1.5h46l7.5 7.5v30c0 17.5-15.5 26.5-30.5 31.5C17 65.5 1.5 56.5 1.5 39V9z" fill={`url(#${id}-fondo)`} stroke={`url(#${id}-borde)`} strokeWidth="3" />
      <path d="M12 6h40l5 5v6H7v-6z" fill="#ffffff" opacity="0.07" />
      <g transform="translate(32 50)">
        <g transform="rotate(-22)">
          <path d="M-8 -34h16v26h-16z" fill="#2f6b4c" stroke="#b7ff2c" strokeWidth="1.4" strokeLinejoin="round" />
        </g>
        <g transform="rotate(22)">
          <path d="M-8 -34h16v26h-16z" fill="#2f6b4c" stroke="#b7ff2c" strokeWidth="1.4" strokeLinejoin="round" />
        </g>
        <path d="M-9.5 -37.5h16.5l2.5 2.5v27h-19z" fill={`url(#${id}-carta)`} stroke="#07140e" strokeWidth="1.2" />
        <circle cx="0" cy="-22" r="6.2" fill="none" stroke="#07140e" strokeWidth="1.6" />
        <path d="M0 -25.4l3.2 2.3-1.2 3.7h-4l-1.2-3.7z" fill="#07140e" />
      </g>
    </svg>
  );
}
