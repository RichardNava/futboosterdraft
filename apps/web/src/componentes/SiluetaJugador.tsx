import type { Demarcacion } from '@fbd/domain';

/**
 * Silueta genérica de jugador (FR-001; Assumption "Imagen de la carta"): la misma figura para todos, con un
 * detalle por demarcación. Las imágenes propias de cada jugador quedan para la fase de diseño visual.
 */
export function SiluetaJugador({ demarcacion, className }: { demarcacion: Demarcacion; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="30" r="17" fill="currentColor" />
      <path d="M18 98c0-24 14-40 32-40s32 16 32 40z" fill="currentColor" />
      {demarcacion === 'POR' && (
        <>
          <circle cx="20" cy="82" r="8" fill="currentColor" stroke="#fff" strokeWidth="3" />
          <circle cx="80" cy="82" r="8" fill="currentColor" stroke="#fff" strokeWidth="3" />
        </>
      )}
      {demarcacion === 'DEF' && <path d="M38 66h24v14c0 7-6 12-12 14-6-2-12-7-12-14z" fill="#fff" opacity="0.8" />}
      {demarcacion === 'MED' && <circle cx="50" cy="79" r="10" fill="none" stroke="#fff" strokeWidth="4" opacity="0.8" />}
      {demarcacion === 'DEL' && <path d="M50 64l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="#fff" opacity="0.85" />}
    </svg>
  );
}
