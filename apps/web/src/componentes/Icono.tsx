/**
 * Iconos SVG en línea (spec 004, research R7). Toman el color del texto (`currentColor`) y sustituyen a los emojis
 * de la barra, los avisos y los eventos. Sin `etiqueta` son decorativos (`aria-hidden`); con ella, `role="img"`.
 */
import type { ReactNode } from 'react';

export type NombreIcono =
  | 'gol'
  | 'amarilla'
  | 'roja'
  | 'cambio'
  | 'lesion'
  | 'informacion'
  | 'exito'
  | 'advertencia'
  | 'error'
  | 'menu'
  | 'cerrar'
  | 'sonido'
  | 'sinSonido'
  | 'inicio'
  | 'partidas'
  | 'nueva'
  | 'perfil'
  | 'trofeo'
  | 'flecha'
  | 'cartas'
  | 'escudo'
  | 'balon'
  | 'rayo'
  | 'campo';

const TRAZOS: Record<NombreIcono, ReactNode> = {
  gol: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5l4.3 3.1-1.6 5H9.3l-1.6-5z" fill="currentColor" stroke="none" />
      <path d="M12 3v4.5M20.6 9.3l-4.3 1.3M17.3 19.4l-2.6-3.8M6.7 19.4l2.6-3.8M3.4 9.3l4.3 1.3" />
    </>
  ),
  amarilla: <rect x="7" y="4" width="10" height="16" rx="1.5" fill="currentColor" stroke="none" />,
  roja: (
    <>
      <rect x="7" y="4" width="10" height="16" rx="1.5" />
      <path d="M7 20L17 4" />
    </>
  ),
  cambio: <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />,
  lesion: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M12 7v10M7 12h10" />
    </>
  ),
  informacion: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </>
  ),
  exito: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16 9.8" />
    </>
  ),
  advertencia: (
    <>
      <path d="M12 3.5L21.5 20h-19z" />
      <path d="M12 10v4.5M12 17v.5" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  sonido: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4.5 4.5 0 010 6M18 6.5a8 8 0 010 11" />
    </>
  ),
  sinSonido: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
    </>
  ),
  inicio: <path d="M4 11l8-6.5 8 6.5V20h-5.5v-5.5h-5V20H4z" />,
  partidas: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  nueva: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  perfil: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0114 0" />
    </>
  ),
  flecha: <path d="M19 12H5M11 6l-6 6 6 6" />,
  cartas: (
    <>
      <rect x="8" y="4" width="12" height="16" rx="2" />
      <path d="M5 7.5L4 18a2 2 0 002 2.2l2 .2" />
    </>
  ),
  escudo: <path d="M7 3h10l3 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />,
  balon: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5l4.3 3.1-1.6 5H9.3l-1.6-5z" />
    </>
  ),
  rayo: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  campo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M12 5v14" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M3 9.5h2.5v5H3M21 9.5h-2.5v5H21" />
    </>
  ),
  trofeo: <path d="M8 4h8v5a4 4 0 01-8 0zM8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M9 20h6v-3H9z" />,
};

interface Props {
  nombre: NombreIcono;
  /** Texto alternativo; si falta, el icono es decorativo y lo acompaña un texto visible. */
  etiqueta?: string;
  /** Lado en píxeles (por defecto, 1 em). */
  tamano?: number;
  className?: string;
}

export function Icono({ nombre, etiqueta, tamano, className }: Props) {
  const lado = tamano ?? '1em';
  return (
    <svg
      className={['icono', className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      width={lado}
      height={lado}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...(etiqueta ? { role: 'img', 'aria-label': etiqueta } : { 'aria-hidden': true })}
    >
      {TRAZOS[nombre]}
    </svg>
  );
}
