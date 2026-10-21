import type { Demarcacion } from '@fbd/domain';

/**
 * Silueta de jugador (FR-001; spec 004, FR-043): busto con camiseta de cuello en pico, la misma figura para todos y
 * un emblema por demarcación en el pecho (guantes, escudo, círculo central o estrella). Toma el color del marco
 * de la carta (`currentColor`); el emblema va en el color de la superficie.
 */
export function SiluetaJugador({ demarcacion, className }: { demarcacion: Demarcacion; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {/* Cabeza y cuello */}
      <path d="M50 8c10.5 0 17 7.6 17 18.5 0 12.4-7.4 22-17 22s-17-9.6-17-22C33 15.6 39.5 8 50 8z" fill="currentColor" />
      <path d="M33.6 22c1-9 7.6-15 16.4-15s15.4 6 16.4 15c-4-4.4-9.6-6.2-16.4-6.2S37.6 17.6 33.6 22z" fill="currentColor" opacity="0.65" />
      <path d="M43 44h14l1.5 12h-17z" fill="currentColor" />
      {/* Torso con camiseta */}
      <path d="M8 100c0-21 9-33 24-38.5l10-3.5 8 9 8-9 10 3.5C83 67 92 79 92 100z" fill="currentColor" />
      <path d="M42 58l8 9 8-9" fill="none" stroke="var(--carta-superficie, #fff)" strokeWidth="2.6" strokeLinejoin="round" opacity="0.75" />
      <path d="M22 100V80M78 100V80" stroke="var(--carta-superficie, #fff)" strokeWidth="1.6" opacity="0.3" />
      {demarcacion === 'POR' && (
        <>
          <rect x="35" y="76" width="11" height="13" rx="4" fill="var(--carta-superficie, #fff)" opacity="0.85" />
          <rect x="54" y="76" width="11" height="13" rx="4" fill="var(--carta-superficie, #fff)" opacity="0.85" />
        </>
      )}
      {demarcacion === 'DEF' && <path d="M40 73h20v10c0 6-5 10-10 12-5-2-10-6-10-12z" fill="var(--carta-superficie, #fff)" opacity="0.85" />}
      {demarcacion === 'MED' && <circle cx="50" cy="83" r="8.5" fill="none" stroke="var(--carta-superficie, #fff)" strokeWidth="3.4" opacity="0.85" />}
      {demarcacion === 'DEL' && <path d="M50 72l3.6 7.6 8.2 1-6 5.7 1.6 8.2L50 90.4l-7.4 4.1 1.6-8.2-6-5.7 8.2-1z" fill="var(--carta-superficie, #fff)" opacity="0.9" />}
    </svg>
  );
}
