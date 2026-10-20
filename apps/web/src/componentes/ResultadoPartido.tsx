import { useNavigate } from 'react-router';
import { BarraPrincipal } from './BarraPrincipal';
import { Estadisticas } from './Estadisticas';
import { ResumenEventos, type EventoVista } from './ResumenEventos';

export type MarcadorFinal = { local: number; visitante: number; penaltis?: { local: number; visitante: number } };

interface Props {
  partidaId: string;
  local: { nombre: string; color?: string };
  visitante: { nombre: string; color?: string };
  marcador: MarcadorFinal;
  /** Eventos relevantes del partido (con su minuto). */
  eventos: EventoVista[];
  estadisticas: unknown;
  nombre: (id: number) => string;
  /** Hubo prórroga (el marcador lo indica). */
  prorroga?: boolean;
}

/**
 * Pantalla de resultado de un partido (spec 003, FR-024 a FR-026; research R18): el mismo componente al terminar
 * un partido rápido, al finalizar un 2D y al acabar una reproducción. Marcador (con prórroga y penaltis), eventos
 * relevantes con su minuto, estadísticas y el botón principal «Siguiente».
 */
export function ResultadoPartido({ partidaId, local, visitante, marcador, eventos, estadisticas, nombre, prorroga }: Props) {
  const navegar = useNavigate();
  const nombresEquipo = { local: local.nombre, visitante: visitante.nombre };
  return (
    <main className="pantalla partido resultado-partido" data-testid="resultado-partido">
      <header className="marcador" aria-live="polite">
        <div className="equipo-marcador">
          {local.color && <span className="chapa" style={{ background: local.color }} aria-hidden="true" />} <strong>{local.nombre}</strong>
        </div>
        <div className="resultado">
          <span className="goles" data-testid="resultado-marcador">
            {marcador.local} – {marcador.visitante}
          </span>
          {marcador.penaltis && (
            <span className="penaltis">
              ({marcador.penaltis.local} – {marcador.penaltis.visitante} en penaltis)
            </span>
          )}
          <span className="fase">{prorroga || marcador.penaltis ? 'Final (tras la prórroga)' : 'Final'}</span>
        </div>
        <div className="equipo-marcador derecha">
          <strong>{visitante.nombre}</strong> {visitante.color && <span className="chapa" style={{ background: visitante.color }} aria-hidden="true" />}
        </div>
      </header>

      <section aria-label="Resumen del partido" data-testid="resultado-eventos">
        <h2>Resumen del partido</h2>
        <ResumenEventos eventos={eventos} nombre={nombre} nombresEquipo={nombresEquipo} />
      </section>

      {estadisticas !== null && estadisticas !== undefined && (
        <section aria-label="Estadísticas" data-testid="resultado-estadisticas">
          <h2>Estadísticas</h2>
          <Estadisticas datos={estadisticas as never} nombres={nombresEquipo} />
        </section>
      )}

      <BarraPrincipal
        principal={{ etiqueta: 'Siguiente', onClick: () => navegar(`/partidas/${partidaId}/torneo`) }}
        secundarios={[{ etiqueta: 'Volver a mi equipo', a: `/partidas/${partidaId}/alineacion` }]}
      />
    </main>
  );
}
