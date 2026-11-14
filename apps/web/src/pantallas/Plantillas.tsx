import { enCache } from '../api/cache';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, ErrorApi } from '../api/cliente';
import { TarjetaPreparacion, usePreparacionPartido } from '../componentes/AvisoPartido';
import { BarraPrincipal } from '../componentes/BarraPrincipal';
import { CartaJugador, type CartaResumen } from '../componentes/CartaJugador';
import { DistintivoBaja, type BajaVista } from '../componentes/DistintivoBaja';
import { FichaJugador } from '../componentes/FichaJugador';
import { NombreRecortado } from '../componentes/NombreRecortado';
import { Chapa } from '../componentes/Marcador';
import { MediaEquipo, mediaMejorOnce } from '../componentes/MediaEquipo';
import { ETIQUETA_DEMARCACION, etiquetaNPC } from '../textos/niveles';
import { PantallaCargando } from '../componentes/Esqueleto';
import { PantallaError } from '../componentes/Aviso';
import { alTeclaPestanas } from '../componentes/pestanas';

interface PlantillaParticipante {
  participanteId: string;
  nombre: string;
  tipo: 'humano' | 'npc';
  nivelNPC: string | null;
  jugadores: CartaResumen[];
  bajas: BajaVista[];
  /** Spec 012 (FR-026): escudo o, sin él, el color de la equipación para la chapa de la pestaña. */
  nombreEquipo?: string;
  escudo?: string | null;
  color?: string | null;
}

/** Columnas de jugadores (spec 012, ronda 2): los porteros, arriba en la de los defensas. */
const COLUMNAS = [['POR', 'DEF'], ['MED'], ['DEL']] as const;

/** Plantillas de todos los participantes, visibles al terminar el draft (T055; FR-054a). */
export function Plantillas() {
  const { partidaId } = useParams();
  // Spec 014 (US6): lo que acaba de cargar el loader, sin esqueleto.
  const previas = enCache<PlantillaParticipante[]>(`/api/partidas/${partidaId}/plantillas`, { fresco: true });
  const partidaPrevia = enCache<{ miParticipanteId: string | null }>(`/api/partidas/${partidaId}`, { fresco: true });
  const conPrevias = previas !== undefined && partidaPrevia !== undefined;
  const [plantillas, setPlantillas] = useState<PlantillaParticipante[] | null>(conPrevias ? previas : null);
  const [miId, setMiId] = useState<string | null>(conPrevias ? partidaPrevia.miParticipanteId : null);
  const [seleccion, setSeleccion] = useState<string | null>(conPrevias ? (partidaPrevia.miParticipanteId ?? previas[0]?.participanteId ?? null) : null);
  const [error, setError] = useState<string | null>(null);
  const [ficha, setFicha] = useState<CartaResumen | null>(null);
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

  if (error) return <PantallaError mensaje={error} />;
  if (!plantillas) return <PantallaCargando forma="campo" texto="Cargando las plantillas…" />;
  const actual = plantillas.find((p) => p.participanteId === seleccion);

  return (
    <main className="pantalla">
      <header className="cabecera-fila">
        <h1>Plantillas</h1>
        <span className="acciones">
          <Link className="boton secundario" to={`/partidas/${partidaId}/alineacion`}>
            Preparar alineación
          </Link>
          <Link className="boton secundario" to={`/partidas/${partidaId}/torneo`}>
            Torneo
          </Link>
        </span>
      </header>
      {preparacion && <TarjetaPreparacion preparacion={preparacion} />}
      <div className="pestanas" role="tablist" aria-label="Plantillas de los equipos" onKeyDown={alTeclaPestanas}>
        {plantillas.map((p) => (
          <button
            key={p.participanteId}
            type="button"
            role="tab"
            aria-selected={p.participanteId === seleccion}
            tabIndex={p.participanteId === seleccion ? 0 : -1}
            onClick={() => setSeleccion(p.participanteId)}
          >
            <NombreRecortado texto={p.nombreEquipo ?? p.nombre} />
            {p.participanteId === miId ? ' (tú)' : p.nivelNPC ? ` · ${etiquetaNPC(p.nivelNPC)}` : ''}
          </button>
        ))}
      </div>
      {actual && (
        <div className="columnas-demarcacion columnas-plantilla">
          {/* Ficha del equipo fuera de las pestañas (spec 012, ronda 2): nombre, escudo y la media del mejor once. */}
          <section className="ficha-equipo-plantilla" aria-label="Equipo">
            <h2>{actual.nombreEquipo ?? actual.nombre}</h2>
            <span className="ficha-equipo-escudo">
              <Chapa color={actual.color ?? undefined} escudo={actual.escudo ?? null} nombre={actual.nombreEquipo ?? actual.nombre} grande />
            </span>
            <MediaEquipo media={mediaMejorOnce(actual.jugadores)} />
            <p className="nota">Media del mejor once</p>
          </section>
          {COLUMNAS.map((demarcaciones) => (
            <div key={demarcaciones.join('-')}>
              {demarcaciones.map((d) => {
                const jugadores = actual.jugadores.filter((j) => j.demarcacion === d).sort((a, b) => b.media - a.media);
                return (
                  <div key={d} className="grupo-demarcacion">
                    <h3>
                      {ETIQUETA_DEMARCACION[d]} ({jugadores.length})
                    </h3>
                    {jugadores.map((j) => {
                      const baja = actual.bajas?.find((b) => b.jugadorId === j.id);
                      return (
                        <div key={j.id}>
                          <CartaJugador jugador={j} compacta onVerFicha={() => setFicha(j)} />
                          {baja && <DistintivoBaja baja={baja} />}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {ficha !== null && <FichaJugador jugadorId={ficha.id} rasgos={ficha} onCerrar={() => setFicha(null)} />}
      {/* Al final de la pantalla, para que `position: sticky` la mantenga a la vista (FR-006). */}
      {preparacion && <BarraPrincipal principal={preparacion.accion} />}
    </main>
  );
}
