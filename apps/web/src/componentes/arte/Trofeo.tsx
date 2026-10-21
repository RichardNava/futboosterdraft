import { useId } from 'react';

/** Trofeo del campeón (spec 004, FR-044): copa de oro con asas, estrella y peana oscura. Decorativo. */
export function Trofeo({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 200 250" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-oro`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a5d0b" />
          <stop offset="0.22" stopColor="#f3c552" />
          <stop offset="0.42" stopColor="#fff2c2" />
          <stop offset="0.62" stopColor="#f3c552" />
          <stop offset="1" stopColor="#7d5406" />
        </linearGradient>
        <linearGradient id={`${id}-peana`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f3b2e" />
          <stop offset="1" stopColor="#07140e" />
        </linearGradient>
      </defs>
      {/* Asas */}
      <path d="M52 34c-30 0-36 18-34 32 3 22 26 34 44 40" fill="none" stroke={`url(#${id}-oro)`} strokeWidth="9" strokeLinecap="round" />
      <path d="M148 34c30 0 36 18 34 32-3 22-26 34-44 40" fill="none" stroke={`url(#${id}-oro)`} strokeWidth="9" strokeLinecap="round" />
      {/* Copa */}
      <path d="M46 22h108c0 58-18 92-54 104-36-12-54-46-54-104z" fill={`url(#${id}-oro)`} />
      <path d="M46 22h108v10H46z" fill="#fff2c2" opacity="0.55" />
      <path d="M100 52l7.6 15.4 17 2.5-12.3 12 2.9 16.9L100 90.8l-15.2 8 2.9-16.9-12.3-12 17-2.5z" fill="#7d5406" opacity="0.55" />
      {/* Pie */}
      <path d="M90 124h20l4 30H86z" fill={`url(#${id}-oro)`} />
      <path d="M70 154h60c4 0 7 3 7 7v6H63v-6c0-4 3-7 7-7z" fill={`url(#${id}-oro)`} />
      {/* Peana */}
      <path d="M56 167h88l8 52H48z" fill={`url(#${id}-peana)`} stroke="#f3c552" strokeOpacity="0.5" strokeWidth="1.5" />
      <rect x="74" y="184" width="52" height="16" rx="2" fill="#f3c552" opacity="0.85" />
      <rect x="40" y="219" width="120" height="12" rx="3" fill="#07140e" stroke="#f3c552" strokeOpacity="0.35" />
    </svg>
  );
}
