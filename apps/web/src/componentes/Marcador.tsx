/**
 * Marcador de cartel (spec 004, FR-016, FR-034; contracts/ui.md §4): goles en `--cartel-marcador` con cifras
 * tabulares; cada equipo con la chapa del color principal de su equipación (con contorno si se confunde con el
 * lienzo) y el nombre recortado si no cabe; los penaltis, debajo. Lo usan el partido rápido, el resultado y la
 * reproducción; la franja del partido 2D tiene su versión compacta, con `GoleadoresFranja` (ronda 4, FR-053).
 */
import { contornoSobreLienzo } from './colores';
import type { CSSProperties } from 'react';
import type { Goleador } from './goleadores';
import { NombreRecortado } from './NombreRecortado';

export interface EquipoMarcador {
  nombre: string;
  /** Color principal de la equipación. */
  color?: string;
}

export interface MarcadorGoles {
  local: number;
  visitante: number;
  penaltis?: { local: number; visitante: number };
}

/** Chapa del color de la equipación. */
export function Chapa({ color }: { color?: string }) {
  if (!color) return null;
  return <span className={contornoSobreLienzo(color) ? 'chapa con-contorno' : 'chapa'} style={{ background: color }} aria-hidden="true" />;
}

interface Props {
  local: EquipoMarcador;
  visitante: EquipoMarcador;
  marcador: MarcadorGoles;
  /** «Descanso», «Final»… */
  fase: string;
  /** `data-testid` de los goles. */
  testIdGoles?: string;
  /** Goleadores de cada equipo con sus minutos, en pequeño bajo el nombre (FR-048). */
  goleadores?: Record<'local' | 'visitante', Goleador[]>;
}

/** «Pérez 12', 67' (pen.) · Ramos (p. p.) 40'» en letra pequeña. */
export function ListaGoleadores({ goleadores, etiqueta }: { goleadores: Goleador[]; etiqueta: string }) {
  if (goleadores.length === 0) return null;
  return (
    <ul className="lista-goleadores" aria-label={etiqueta}>
      {goleadores.map((g) => (
        <li key={g.clave}>
          {g.nombre}
          {g.propia && ' (p. p.)'} <span className="minutos">{g.goles.join(', ')}</span>
        </li>
      ))}
    </ul>
  );
}

/** Goleadores en la franja del 2D (ronda 4, FR-053): una fila bajo los equipos, cada lado con su chapa. */
export function GoleadoresFranja({
  local,
  visitante,
  goleadores,
}: {
  local: EquipoMarcador;
  visitante: EquipoMarcador;
  goleadores: Record<'local' | 'visitante', Goleador[]>;
}) {
  if (goleadores.local.length + goleadores.visitante.length === 0) return null;
  return (
    <span className="goleadores-2d">
      {(['local', 'visitante'] as const).map((lado) => {
        const equipo = lado === 'local' ? local : visitante;
        if (goleadores[lado].length === 0) return null;
        return (
          <span key={lado} className="goleadores-2d-lado">
            <Chapa color={equipo.color} />
            <ListaGoleadores goleadores={goleadores[lado]} etiqueta={`Goles de ${equipo.nombre}`} />
          </span>
        );
      })}
    </span>
  );
}

export function Marcador({ local, visitante, marcador, fase, testIdGoles, goleadores }: Props) {
  return (
    <header className="marcador" aria-live="polite">
      <div className="equipo-marcador" style={{ '--color-equipo': local.color } as CSSProperties}>
        <Chapa color={local.color} />
        <div className="equipo-marcador-texto">
          <NombreRecortado texto={local.nombre} como="strong" />
          {goleadores && <ListaGoleadores goleadores={goleadores.local} etiqueta={`Goles de ${local.nombre}`} />}
        </div>
      </div>
      <div className="resultado">
        <span className="goles" data-testid={testIdGoles}>
          {marcador.local} – {marcador.visitante}
        </span>
        {marcador.penaltis && (
          <span className="penaltis">
            {marcador.penaltis.local}-{marcador.penaltis.visitante} en los penaltis
          </span>
        )}
        <span className="fase">{fase}</span>
      </div>
      <div className="equipo-marcador derecha" style={{ '--color-equipo': visitante.color } as CSSProperties}>
        <div className="equipo-marcador-texto">
          <NombreRecortado texto={visitante.nombre} como="strong" />
          {goleadores && <ListaGoleadores goleadores={goleadores.visitante} etiqueta={`Goles de ${visitante.nombre}`} />}
        </div>
        <Chapa color={visitante.color} />
      </div>
    </header>
  );
}
