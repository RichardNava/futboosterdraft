import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, ErrorApi } from '../api/cliente';
import { TarjetaPreparacion, usePreparacionPartido } from '../componentes/AvisoPartido';
import { BarraPrincipal } from '../componentes/BarraPrincipal';
import { CartaJugador, type CartaResumen } from '../componentes/CartaJugador';
import { DistintivoBaja, type BajaVista } from '../componentes/DistintivoBaja';
import { FichaJugador } from '../componentes/FichaJugador';
import { ETIQUETA_DEMARCACION, etiquetaNPC } from '../textos/niveles';

interface PlantillaParticipante {
  participanteId: string;
  nombre: string;
  tipo: 'humano' | 'npc';
  nivelNPC: string | null;
  jugadores: CartaResumen[];
  bajas: BajaVista[];
}

const DEMARCACIONES = ['POR', 'DEF', 'MED', 'DEL'] as const;

/** Plantillas de todos los participantes, visibles al terminar el draft (T055; FR-054a). */
export function Plantillas() {
  const { partidaId } = useParams();
  const [plantillas, setPlantillas] = useState<PlantillaParticipante[] | null>(null);
  const [miId, setMiId] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ficha, setFicha] = useState<number | null>(null);
  const preparacion = usePreparacionPartido(partidaId ?? '');

  useEffect(() => {
    Promise.all([
      api<PlantillaParticipante[]>(`/api/partidas/${partidaId}/plantillas`),
      api<{ miParticipanteId: string | null }>(`/api/partidas/${partidaId}`),
    ])
      .then(([ps, partida]) => {
        setPlantillas(ps);
        setMiId(partida.miParticipanteId);
        setSeleccion(partida.miParticipanteId ?? ps[0]?.participanteId ?? null);
      })
      .catch((e: unknown) => setError(e instanceof ErrorApi ? e.message : 'No se pudieron cargar las plantillas'));
  }, [partidaId]);

  if (error) return <p className="error pantalla">{error}</p>;
  if (!plantillas) return <p className="cargando">Cargando plantillas…</p>;
  const actual = plantillas.find((p) => p.participanteId === seleccion);

  return (
    <main className="pantalla">
      <header className="cabecera-fila">
        <h1>Plantillas</h1>
        <span className="acciones">
          <Link className="boton" to={`/partidas/${partidaId}/alineacion`}>
            Preparar alineación
          </Link>
          <Link className="boton secundario" to={`/partidas/${partidaId}/torneo`}>
            Torneo
          </Link>
        </span>
      </header>
      {preparacion && <TarjetaPreparacion preparacion={preparacion} />}
      <div className="pestanas" role="tablist">
        {plantillas.map((p) => (
          <button
            key={p.participanteId}
            type="button"
            role="tab"
            aria-selected={p.participanteId === seleccion}
            className={p.participanteId === seleccion ? '' : 'secundario'}
            onClick={() => setSeleccion(p.participanteId)}
          >
            {p.nombre}
            {p.participanteId === miId ? ' (tú)' : p.nivelNPC ? ` · ${etiquetaNPC(p.nivelNPC)}` : ''}
          </button>
        ))}
      </div>
      {actual && (
        <div className="columnas-demarcacion">
          {DEMARCACIONES.map((d) => {
            const jugadores = actual.jugadores.filter((j) => j.demarcacion === d).sort((a, b) => b.media - a.media);
            return (
              <div key={d}>
                <h3>
                  {ETIQUETA_DEMARCACION[d]} ({jugadores.length})
                </h3>
                {jugadores.map((j) => {
                  const baja = actual.bajas?.find((b) => b.jugadorId === j.id);
                  return (
                    <div key={j.id}>
                      <CartaJugador jugador={j} compacta onVerFicha={() => setFicha(j.id)} />
                      {baja && <DistintivoBaja baja={baja} />}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
      {ficha !== null && <FichaJugador jugadorId={ficha} onCerrar={() => setFicha(null)} />}
      {/* Al final de la pantalla, para que `position: sticky` la mantenga a la vista (FR-006). */}
      {preparacion && <BarraPrincipal principal={preparacion.accion} />}
    </main>
  );
}
