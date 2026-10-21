import { useNavigate } from 'react-router';
import { BarraPrincipal } from './BarraPrincipal';
import { Estadisticas } from './Estadisticas';
import { goleadoresDe } from './goleadores';
import { Marcador } from './Marcador';
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
 * relevantes con su minuto y estadísticas, en dos columnas desde 1024 px (FR-052), y el botón principal «Siguiente». Bajo cada equipo, sus goleadores con el
 * minuto (spec 004, FR-048).
 */
export function ResultadoPartido({ partidaId, local, visitante, marcador, eventos, estadisticas, nombre, prorroga }: Props) {
  const navegar = useNavigate();
  const nombresEquipo = { local: local.nombre, visitante: visitante.nombre };
  return (
    <main className="pantalla partido resultado-partido" data-testid="resultado-partido">
      <Marcador
        local={local}
        visitante={visitante}
        marcador={marcador}
        fase={prorroga || marcador.penaltis ? 'Final (tras la prórroga)' : 'Final'}
        testIdGoles="resultado-marcador"
        goleadores={goleadoresDe(eventos, nombre)}
      />

      {/* Resumen a la izquierda y estadísticas a la derecha desde 1024 px (ronda 4, FR-052). */}
      <div className="resultado-cuerpo">
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
      </div>

      <BarraPrincipal
        principal={{ etiqueta: 'Siguiente', onClick: () => navegar(`/partidas/${partidaId}/torneo`) }}
        secundarios={[{ etiqueta: 'Volver a mi equipo', a: `/partidas/${partidaId}/alineacion` }]}
      />
    </main>
  );
}
