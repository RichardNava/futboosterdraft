/**
 * Sobre de cartas (spec 007, FR-017 a FR-020): `public/cartas/sobre.svg`, con la proporción `--proporcion-sobre`.
 * `rasgado` quita el sellado superior con un borde irregular (el sobre recién abierto).
 *
 * Spec 011 (US2; contracts/ui.md §2): con `diseno`, el sobre cosmético `/cosmeticos/sobres/<id>.webp` (o `-mini`)
 * con su propia rasgadura. Si la imagen falla, vuelve al sobre original.
 */
import { useState } from 'react';
import { rasgaduraDe } from './rasgadura';

interface Props {
  diseno?: string;
  rasgado?: boolean;
  className?: string;
  mini?: boolean;
}

export const urlSobre = (id: string, mini = false): string => `/cosmeticos/sobres/${id}${mini ? '-mini' : ''}.webp`;

export function SobreArte({ diseno, rasgado = false, className, mini = false }: Props) {
  const [fallo, setFallo] = useState<string | null>(null);
  const cosmetico = diseno && diseno !== 'sobre-original' && fallo !== diseno ? diseno : null;
  const clases = ['sobre-arte', rasgado ? 'rasgado' : '', className].filter(Boolean).join(' ');
  if (!cosmetico) return <img src="/cartas/sobre.svg" alt="" className={clases} />;
  return (
    <img
      src={urlSobre(cosmetico, mini)}
      alt=""
      className={clases}
      style={rasgado ? { clipPath: rasgaduraDe(cosmetico) } : undefined}
      onError={() => setFallo(cosmetico)}
    />
  );
}
