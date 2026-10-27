/**
 * Sobre de cartas oficial (spec 007, FR-017 a FR-020): `public/cartas/sobre.svg`, con la proporción
 * `--proporcion-sobre`. `rasgado` quita el sellado superior con un borde irregular (el sobre recién abierto).
 */
export function SobreArte({ className, rasgado = false }: { className?: string; rasgado?: boolean }) {
  const clases = ['sobre-arte', rasgado ? 'rasgado' : '', className].filter(Boolean).join(' ');
  return <img src="/cartas/sobre.svg" alt="" className={clases} />;
}
