/**
 * Fondo de la pantalla de duelos (spec 005, ronda 2): un ring de boxeo en perspectiva con el lienzo pintado como un
 * campo (línea de medio campo y círculo central) y balones de fútbol alrededor, para no perder la referencia del
 * juego. Decorativo: toma el color del texto y la pantalla le baja la opacidad.
 */

/** Alturas de las tres cuerdas: en los postes de delante y en los de detrás. */
const CUERDAS = [
  [360, 220],
  [320, 190],
  [280, 160],
] as const;
/** Postes: x, base y alto de cada uno (delante a los lados y detrás). */
const POSTES = [
  [70, 400, 262],
  [730, 400, 262],
  [190, 250, 145],
  [610, 250, 145],
] as const;

/** Balón de fútbol: pentágono central y costuras hacia el borde. */
function Balon({ x, y, r }: { x: number; y: number; r: number }) {
  const vertices = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, x + Math.cos(a) * r, y + Math.sin(a) * r] as const;
  });
  return (
    <g>
      <circle cx={x} cy={y} r={r} />
      <polygon points={vertices.map(([px, py]) => `${px},${py}`).join(' ')} fill="currentColor" />
      {vertices.map(([px, py, bx, by], i) => (
        <line key={i} x1={px} y1={py} x2={bx} y2={by} />
      ))}
    </g>
  );
}

export function RingDuelo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true" focusable="false">
      {/* Lienzo del ring, pintado como un campo. */}
      <polygon points="70,400 730,400 610,250 190,250" fill="currentColor" fillOpacity={0.12} />
      <path d="M400 250V400" />
      <ellipse cx={400} cy={325} rx={95} ry={36} />
      <circle cx={400} cy={325} r={4} fill="currentColor" />
      <path d="M70 400l20 22h620l20-22" strokeOpacity={0.6} />

      {/* Postes con sus protectores. */}
      {POSTES.map(([x, base, alto]) => (
        <g key={`${x}-${base}`}>
          <path d={`M${x} ${base}V${alto}`} strokeWidth={6} />
          <rect x={x - 7} y={alto - 4} width={14} height={22} rx={4} fill="currentColor" />
        </g>
      ))}

      {/* Cuerdas: detrás, a los lados y delante. */}
      {CUERDAS.map(([delante, detras]) => (
        <g key={delante}>
          <path d={`M190 ${detras}H610`} />
          <path d={`M70 ${delante}L190 ${detras}M730 ${delante}L610 ${detras}`} />
          <path d={`M70 ${delante}H730`} strokeOpacity={0.7} />
        </g>
      ))}

      {/* Balones alrededor del ring. */}
      <Balon x={90} y={120} r={26} />
      <Balon x={712} y={96} r={20} />
      <Balon x={300} y={62} r={13} />
      <Balon x={512} y={50} r={16} />
      <Balon x={34} y={300} r={15} />
      <Balon x={768} y={292} r={17} />
    </svg>
  );
}
