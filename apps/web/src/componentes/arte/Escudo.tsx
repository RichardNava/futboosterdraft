/**
 * Logo del juego (spec 007, FR-001 a FR-003): el escudo oficial de `public/marca/logo.svg`, el mismo del favicon.
 * Decorativo: el nombre del juego va siempre al lado.
 */
export function Escudo({ className, tamano = 36 }: { className?: string; tamano?: number }) {
  return <img src="/marca/logo.svg" alt="" width={tamano} height={tamano} className={className} />;
}
