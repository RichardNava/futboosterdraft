import { BarraPrincipal } from '../componentes/BarraPrincipal';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, ErrorApi } from '../api/cliente';
import { useConexion, useCuentaAtras } from '../conexion/useConexion';
import { useSesion } from '../estado/sesion';
import { CampoNombreEquipo } from '../componentes/CampoNombreEquipo';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { Insignia } from '../componentes/Insignia';
import { NombreRecortado } from '../componentes/NombreRecortado';
import { mostrarAviso } from '../estado/avisos';
import { DESCRIPCION_DIFICULTAD, ETIQUETA_DIFICULTAD, ETIQUETA_NIVEL_NPC, etiquetaNPC, type Dificultad, type NivelNPC } from '../textos/niveles';
import { PantallaCargando } from '../componentes/Esqueleto';
import { Aviso } from '../componentes/Aviso';
import { SobreArte } from '../componentes/arte/SobreArte';
import { ConfigDuelos } from '../componentes/ConfigDuelos';
import type { ConfigDuelos as Duelos } from '@fbd/domain';

interface ParticipanteSala {
  id: string;
  nombre: string;
  tipo: 'humano' | 'npc';
  nivelNPC: string | null;
  conectado: boolean;
  esAnfitrion: boolean;
  nombreAjustado?: boolean;
}

interface Sala {
  participantes: ParticipanteSala[];
  plazasLibres: number;
  venceBusquedaEn: string | null;
  modo?: string;
  /** Modo Duelo de jugadores (spec 005): formación común y Estado de forma. */
  duelos?: Duelos | null;
}

/** Sala de espera (T053): participantes, búsqueda y acciones del anfitrión. */
export function Sala() {
  const { partidaId } = useParams();
  const navegar = useNavigate();
  const usuario = useSesion((s) => s.usuario);
  const [sala, setSala] = useState<Sala | null>(null);
  const [anfitrionId, setAnfitrionId] = useState<string | null>(null);
  const [nivel, setNivel] = useState('intermedio');
  const [error, setError] = useState<string | null>(null);
  /** null = aún no se sabe; false = el usuario no participa y puede unirse. */
  const [participa, setParticipa] = useState<boolean | null>(null);
  const [yo, setYo] = useState<string | null>(null);
  const [dificultad, setDificultad] = useState<Dificultad | null>(null);

  useEffect(() => {
    api<{ miParticipanteId: string | null; dificultad?: Dificultad }>(`/api/partidas/${partidaId}`)
      .then((p) => {
        setParticipa(p.miParticipanteId !== null);
        setYo(p.miParticipanteId);
        setDificultad(p.dificultad ?? null);
      })
      .catch((e: unknown) => setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar la partida'));
  }, [partidaId]);

  const { conexion, estado, conectada } = useConexion(participa ? partidaId : undefined, (m) => {
    if (m.t === 'sala.actualizada') setSala(m as unknown as Sala);
  });

  useEffect(() => {
    if (!estado) return;
    if (estado.fase === 'sala') {
      setSala(estado.vista.sala);
      setAnfitrionId(estado.vista.partida.anfitrionId);
    } else if (estado.fase === 'draft') navegar(`/partidas/${partidaId}/draft`, { replace: true });
    else navegar(`/partidas/${partidaId}/plantillas`, { replace: true });
  }, [estado, navegar, partidaId]);

  const restante = useCuentaAtras(sala?.venceBusquedaEn, conexion);
  // Sin más humanos en la sala (spec 004, contracts/ui.md §7).
  const soloYo = sala !== null && sala.participantes.filter((p) => p.tipo === 'humano').length <= 1;
  const esAnfitrion = usuario?.id === anfitrionId;

  const accion = async (ruta: string, cuerpo?: unknown) => {
    setError(null);
    try {
      await api(`/api/partidas/${partidaId}/${ruta}`, { metodo: 'POST', cuerpo, idempotente: true });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo completar la acción');
    }
  };

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/partidas/${partidaId}/sala`);
      mostrarAviso('exito', 'Enlace copiado');
    } catch {
      mostrarAviso('error', 'No se ha podido copiar el enlace. Cópialo desde la barra de direcciones.');
    }
  };

  const unirse = async () => {
    setError(null);
    try {
      const r = await api<{ miParticipanteId: string | null }>(`/api/partidas/${partidaId}/unirse`, { metodo: 'POST', idempotente: true });
      setYo(r.miParticipanteId);
      setParticipa(true);
      mostrarAviso('exito', 'Te has unido a la partida');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No te has podido unir a la partida. Vuelve a intentarlo.');
    }
  };

  if (participa === false) {
    return (
      <main className="pantalla">
        <h1>Unirse a la partida</h1>
        {usuario?.tipo === 'invitado' ? (
          <p>Necesitas una cuenta registrada para jugar con otras personas.</p>
        ) : (
          <BarraPrincipal principal={{ etiqueta: 'Unirme', onClick: unirse }} />
        )}
        {error && (
          <Aviso tipo="error">
            <p>{error}</p>
          </Aviso>
        )}
      </main>
    );
  }

  if (!sala) {
    if (error)
      return (
        <main className="pantalla">
          <Aviso tipo="error">
            <p>{error}</p>
          </Aviso>
        </main>
      );
    return <PantallaCargando forma="filas" texto={conectada ? 'Cargando la sala…' : 'Conectando…'} />;
  }

  return (
    <main className="pantalla sala">
      <header className="cabecera-pantalla sala-cabecera">
        <div>
          <h1>Sala</h1>
          {dificultad && (
            <p className="nota" data-testid="dificultad">
              Dificultad: <strong>{ETIQUETA_DIFICULTAD[dificultad]}</strong>. {DESCRIPCION_DIFICULTAD[dificultad]}
            </p>
          )}
        </div>
        {restante !== null && (
          <p className="sala-cuenta" aria-live="off">
            <span className="sala-cuenta-etiqueta">El draft empezará en</span>
            <strong className="cifra-cartel">
              {Math.floor(restante / 60)}:{String(restante % 60).padStart(2, '0')}
            </strong>
            {sala.plazasLibres > 0 && <span className="nota">{sala.plazasLibres} plazas libres se rellenarán con NPC</span>}
          </p>
        )}
      </header>

      <div className="sala-rejilla">
        <section className="sala-mesa" aria-labelledby="titulo-mesa-sala">
          <h2 id="titulo-mesa-sala">Mesa del draft</h2>
          {soloYo && (
            <EstadoVacio
              mensaje="Solo estás tú. Puedes empezar contra la IA o esperar a que alguien se una con el enlace."
              accion={
                usuario?.tipo === 'registrado' && (
                  <button type="button" className="secundario" onClick={() => void copiarEnlace()}>
                    Copiar enlace
                  </button>
                )
              }
            />
          )}
          <ul className="lista-participantes" aria-label="Participantes">
            {sala.participantes.map((p, i) => (
              <li key={p.id} className={p.id === yo ? 'propio' : undefined}>
                <span className="asiento" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="iniciales" aria-hidden="true">
                  {iniciales(p.nombre)}
                </span>
                <span className="participante-datos">
                  <NombreRecortado texto={p.nombre} como="strong" />
                  <span className="participante-insignias">
                    <span className={`punto ${p.conectado ? 'conectado' : ''}`} role="img" aria-label={p.conectado ? 'Conectado' : 'Desconectado'} />
                    {p.esAnfitrion && <Insignia texto="Anfitrión" suave />}
                    {p.tipo === 'npc' && <span className={`etiqueta nivel-npc ${p.nivelNPC ?? ''}`}>{etiquetaNPC(p.nivelNPC)}</span>}
                  </span>
                </span>
              </li>
            ))}
            {Array.from({ length: sala.plazasLibres }, (_, i) => (
              <li key={`libre-${i}`} className="libre">
                <span className="asiento" aria-hidden="true">
                  {sala.participantes.length + i + 1}
                </span>
                Plaza libre
              </li>
            ))}
          </ul>
          {esAnfitrion && sala.plazasLibres > 0 && (
            <div className="acciones">
              <select aria-label="Nivel del NPC" value={nivel} onChange={(e) => setNivel(e.target.value)}>
                {(Object.keys(ETIQUETA_NIVEL_NPC) as NivelNPC[]).map((n) => (
                  <option key={n} value={n}>
                    {ETIQUETA_NIVEL_NPC[n]}
                  </option>
                ))}
              </select>
              <button type="button" className="secundario" onClick={() => void accion('npc', { nivel })}>
                Añadir NPC
              </button>
            </div>
          )}
          {usuario?.tipo === 'registrado' && !soloYo && (
            <p>
              <button type="button" className="secundario" onClick={() => void copiarEnlace()}>
                Copiar enlace
              </button>
            </p>
          )}
        </section>

        {sala.modo === 'duelos' && sala.duelos && <ConfigDuelos partidaId={partidaId!} duelos={sala.duelos} editable={esAnfitrion} />}
        <div className="sala-lateral panel">
          {(() => {
            const mio = sala.participantes.find((p) => p.id === yo);
            if (!mio) return null;
            return (
              <CampoNombreEquipo
                partidaId={partidaId!}
                actual={mio.nombre}
                otros={sala.participantes.filter((p) => p.id !== yo).map((p) => p.nombre)}
                ajustado={mio.nombreAjustado}
              />
            );
          })()}
          <SobreArte className="sala-sobre" />
          <p className="nota">Cada participante abre un sobre de 8 cartas por ronda, se queda una y pasa el resto. Tres rondas: 24 jugadores.</p>
        </div>
      </div>
      {error && (
        <Aviso tipo="error">
          <p>{error}</p>
        </Aviso>
      )}
      <BarraPrincipal
        principal={esAnfitrion ? { etiqueta: 'Empezar', onClick: () => accion('iniciar') } : null}
        estado={esAnfitrion ? 'Empieza el draft cuando quieras; las plazas libres se rellenan con NPC.' : 'Esperando a que el anfitrión empiece el draft…'}
      />
    </main>
  );
}

/** Iniciales de un nombre de equipo para su distintivo («Sporting Faro» → «SF»). */
function iniciales(nombre: string): string {
  const palabras = nombre.split(/\s+/).filter((p) => p.length > 0 && !/^(de|del|la|el|los|las)$/i.test(p));
  return (palabras.length > 1 ? palabras[0]![0]! + palabras[1]![0]! : (palabras[0] ?? '?').slice(0, 2)).toLocaleUpperCase('es');
}
