/**
 * Media del once en Formación (spec 004, FR-060): diez estrellas que se rellenan de forma gradual con la media
 * (70 → 7 estrellas; 88 → 8 llenas y la novena al 80 %) y, a su derecha y más grande, la cifra dentro de una
 * estrella. La media es la de los titulares colocados, con la penalización por jugar fuera de su posición: la misma
 * media efectiva que muestra cada ficha del campo. Se recalcula en cada cambio del once.
 */
import { statsEfectivos, type Jugador, type ParametrosEquilibrado, type ResultadoColocacion } from '@fbd/domain';
import type { CSSProperties } from 'react';
import type { CartaResumen } from './CartaJugador';

const ESTRELLAS = 10;

/** Media efectiva de los titulares en su posición efectiva; `null` sin titulares. */
export function mediaEquipo(colocacion: ResultadoColocacion, jugadores: ReadonlyMap<number, CartaResumen>, parametros: ParametrosEquilibrado): number | null {
  const medias = colocacion.titulares.flatMap((t) => {
    const j = jugadores.get(t.jugadorId);
    if (!j) return [];
    return [statsEfectivos(j as unknown as Jugador, { posicionesAdmitidas: [t.posicionEfectiva as Jugador['posicion'][number]] }, parametros).media];
  });
  return medias.length === 0 ? null : medias.reduce((a, b) => a + b, 0) / medias.length;
}

/** Relleno (0–1) de cada una de las diez estrellas: una estrella por cada 10 puntos de media. */
export function rellenoEstrellas(media: number): number[] {
  return Array.from({ length: ESTRELLAS }, (_, i) => Math.max(0, Math.min(1, media / 10 - i)));
}

/** Estrella de cinco puntas sobre 24 × 24. */
const TRAZO_ESTRELLA = 'M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7l-6.4 3.5L7 14.1l-5.3-5 7.2-.9z';

function Estrella({ relleno }: { relleno: number }) {
  return (
    <span className="estrella" style={{ '--relleno': relleno } as CSSProperties}>
      <svg viewBox="0 0 24 24" className="estrella-vacia" focusable="false">
        <path d={TRAZO_ESTRELLA} />
      </svg>
      <svg viewBox="0 0 24 24" className="estrella-llena" focusable="false">
        <path d={TRAZO_ESTRELLA} />
      </svg>
    </span>
  );
}

export function MediaEquipo({ media }: { media: number | null }) {
  const valor = media ?? 0;
  const cifra = media === null ? '–' : String(Math.round(media));
  return (
    <div className="media-equipo" data-testid="media-equipo">
      <p className="solo-lectores" aria-live="polite">
        {media === null ? 'Sin titulares: no hay media del equipo.' : `Media del equipo: ${cifra} de 100.`}
      </p>
      <span className="media-equipo-estrellas" aria-hidden="true">
        {rellenoEstrellas(valor).map((r, i) => (
          <Estrella key={i} relleno={r} />
        ))}
      </span>
      <span className="media-equipo-cifra" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="media-equipo-marco" focusable="false">
          <path d={TRAZO_ESTRELLA} />
        </svg>
        <span className="media-equipo-valor">{cifra}</span>
      </span>
    </div>
  );
}
