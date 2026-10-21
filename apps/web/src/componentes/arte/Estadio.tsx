import { useId } from 'react';

/**
 * Estadio de noche visto desde el césped (spec 004, FR-041, FR-044): gradas en silueta con la trama del público,
 * cuatro torres de focos con su halo y el borde del campo. Se usa a sangre al pie de la portada y de las
 * pantallas finales. Decorativo.
 */
export function Estadio({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const torres = [90, 330, 870, 1110];
  return (
    <svg className={className} viewBox="0 0 1200 320" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff1c9" stopOpacity="0.9" />
          <stop offset="0.25" stopColor="#fff1c9" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff1c9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-haz`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1c9" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff1c9" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-grada`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#132c21" />
          <stop offset="1" stopColor="#081610" />
        </linearGradient>
        <linearGradient id={`${id}-cesped`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f6a37" />
          <stop offset="1" stopColor="#0b2a17" />
        </linearGradient>
        <pattern id={`${id}-publico`} width="7" height="6" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#eef5f0" opacity="0.13" />
          <circle cx="5.5" cy="5" r="1" fill="#b7ff2c" opacity="0.07" />
        </pattern>
      </defs>
      {/* Haces de luz de los focos hacia el campo. */}
      {torres.map((x) => (
        <path key={`haz-${x}`} d={`M${x - 26} 46 L${x < 600 ? x + 420 : x - 160} 320 L${x < 600 ? x + 160 : x - 420} 320 L${x + 26} 46z`} fill={`url(#${id}-haz)`} />
      ))}
      {/* Gradas: dos anillos en silueta. */}
      <path d="M0 150 C220 120 420 112 600 112 C780 112 980 120 1200 150 V320 H0z" fill={`url(#${id}-grada)`} />
      <path d="M0 150 C220 120 420 112 600 112 C780 112 980 120 1200 150 V250 H0z" fill={`url(#${id}-publico)`} />
      <path d="M0 200 C230 178 420 172 600 172 C780 172 970 178 1200 200" fill="none" stroke="#000000" strokeOpacity="0.45" strokeWidth="6" />
      <path d="M0 150 C220 120 420 112 600 112 C780 112 980 120 1200 150" fill="none" stroke="#eef5f0" strokeOpacity="0.12" strokeWidth="2" />
      {/* Torres de focos */}
      {torres.map((x) => (
        <g key={`torre-${x}`}>
          <path d={`M${x - 3} 60 L${x - 8} 190 L${x + 8} 190 L${x + 3} 60z`} fill="#081610" />
          <rect x={x - 26} y={34} width="52" height="26" rx="3" fill="#0d2219" stroke="#eef5f0" strokeOpacity="0.2" />
          {[0, 1, 2, 3].map((c) =>
            [0, 1].map((f) => <rect key={`${c}-${f}`} x={x - 22 + c * 11.5} y={38 + f * 10.5} width="9" height="8" rx="1.5" fill="#fff8e6" />),
          )}
          <circle cx={x} cy={47} r="90" fill={`url(#${id}-halo)`} />
        </g>
      ))}
      {/* Borde del césped con la línea de cal. */}
      <path d="M0 262 C300 248 900 248 1200 262 V320 H0z" fill={`url(#${id}-cesped)`} />
      <path d="M0 270 C300 257 900 257 1200 270" fill="none" stroke="#eef5f0" strokeOpacity="0.5" strokeWidth="2" />
    </svg>
  );
}
