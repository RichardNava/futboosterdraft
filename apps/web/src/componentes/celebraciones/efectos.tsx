/**
 * Piezas compartidas de las celebraciones de juego (spec 012, ronda 2): el título letra a letra, partículas
 * (confeti, serpentinas, chispas, polvo de tiza, flashes) y ondas de choque. Solo CSS: cada pieza lleva sus valores en
 * variables (`--x`, `--y`, `--giro`, `--retraso`…) y las animaciones de `base.css` las leen. Los valores salen de un
 * sorteo fijo por índice, así que la misma celebración se ve igual cada vez.
 */
import type { CSSProperties } from 'react';

/** Número «aleatorio» fijo en [0, 1) para la pieza `i` y la variante `k`. */
const azar = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** «¡GOL!» con cada letra en su `span` (entran de una en una). */
export function TituloLetras({ texto = '¡GOL!' }: { texto?: string }) {
  return (
    <span className="celebracion-titulo" aria-hidden="true">
      {[...texto].map((letra, i) => (
        <span key={i} className="celebracion-letra" style={{ '--i': i } as CSSProperties}>
          {letra}
        </span>
      ))}
    </span>
  );
}

type ClaseParticula = 'confeti' | 'serpentina' | 'chispa' | 'tiza' | 'flash';

/**
 * Partículas de una clase. `confeti` y `chispa` salen disparadas desde el centro y caen; `serpentina` y `tiza` caen
 * desde arriba; `flash` son destellos fijos repartidos por la grada.
 */
export function Particulas({ clase, cantidad }: { clase: ClaseParticula; cantidad: number }) {
  return (
    <span className={`celebracion-particulas particulas-${clase}`} aria-hidden="true">
      {Array.from({ length: cantidad }, (_, i) => {
        const angulo = azar(i, 1) * Math.PI * 2;
        const fuerza = 0.45 + azar(i, 2) * 0.55;
        const estilo = {
          '--x': `${(Math.cos(angulo) * fuerza * 50).toFixed(1)}cqw`,
          '--y': `${(Math.sin(angulo) * fuerza * 42 - 12).toFixed(1)}cqh`,
          '--inicio': `${(azar(i, 3) * 100).toFixed(1)}%`,
          '--giro': `${Math.round((azar(i, 4) - 0.5) * 1440)}deg`,
          '--retraso': azar(i, 5).toFixed(3),
          '--escala': (0.6 + azar(i, 6) * 0.8).toFixed(2),
          '--tono': i % 3,
        } as CSSProperties;
        return <span key={i} className="particula" style={estilo} />;
      })}
    </span>
  );
}

/** Ondas de choque que se abren desde el centro en el momento del gol. */
export function Ondas({ cantidad = 2 }: { cantidad?: number }) {
  return (
    <span className="celebracion-ondas" aria-hidden="true">
      {Array.from({ length: cantidad }, (_, i) => (
        <span key={i} className="celebracion-onda" style={{ '--i': i } as CSSProperties} />
      ))}
    </span>
  );
}
