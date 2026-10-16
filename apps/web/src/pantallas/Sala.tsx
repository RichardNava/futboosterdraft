import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, ErrorApi } from '../api/cliente';
import { useConexion, useCuentaAtras } from '../conexion/useConexion';
import { useSesion } from '../estado/sesion';
import { ETIQUETA_NIVEL_NPC, etiquetaNPC, type NivelNPC } from '../textos/niveles';

interface ParticipanteSala {
  id: string;
  nombre: string;
  tipo: 'humano' | 'npc';
  nivelNPC: string | null;
  conectado: boolean;
  esAnfitrion: boolean;
}

interface Sala {
  participantes: ParticipanteSala[];
  plazasLibres: number;
  venceBusquedaEn: string | null;
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
  const [copiado, setCopiado] = useState(false);
  /** null = aún no se sabe; false = el usuario no participa y puede unirse. */
  const [participa, setParticipa] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ miParticipanteId: string | null }>(`/api/partidas/${partidaId}`)
      .then((p) => setParticipa(p.miParticipanteId !== null))
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
    await navigator.clipboard.writeText(`${location.origin}/partidas/${partidaId}/sala`);
    setCopiado(true);
  };

  const unirse = async () => {
    setError(null);
    try {
      await api(`/api/partidas/${partidaId}/unirse`, { metodo: 'POST', idempotente: true });
      setParticipa(true);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo unir a la partida');
    }
  };

  if (participa === false) {
    return (
      <main className="pantalla">
        <h1>Unirse a la partida</h1>
        {usuario?.tipo === 'invitado' ? (
          <p>Necesitas una cuenta registrada para jugar con otras personas.</p>
        ) : (
          <button type="button" onClick={() => void unirse()}>
            Unirse
          </button>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </main>
    );
  }

  if (!sala) return <p className="cargando">{error ?? (conectada ? 'Cargando sala…' : 'Conectando…')}</p>;

  return (
    <main className="pantalla">
      <h1>Sala</h1>
      {restante !== null && (
        <p>
          El draft empezará en <strong>{Math.floor(restante / 60)}:{String(restante % 60).padStart(2, '0')}</strong>
          {sala.plazasLibres > 0 && ` · ${sala.plazasLibres} plazas libres se rellenarán con NPC`}
        </p>
      )}
      <ul className="lista-participantes">
        {sala.participantes.map((p) => (
          <li key={p.id}>
            <span className={`punto ${p.conectado ? 'conectado' : ''}`} aria-label={p.conectado ? 'Conectado' : 'Desconectado'} />
            <strong>{p.nombre}</strong>
            {p.esAnfitrion && <span className="etiqueta">Anfitrión</span>}
            {p.tipo === 'npc' && <span className={`etiqueta nivel-npc ${p.nivelNPC ?? ''}`}>{etiquetaNPC(p.nivelNPC)}</span>}
          </li>
        ))}
        {Array.from({ length: sala.plazasLibres }, (_, i) => (
          <li key={`libre-${i}`} className="libre">
            Plaza libre
          </li>
        ))}
      </ul>

      {esAnfitrion && (
        <div className="acciones">
          {sala.plazasLibres > 0 && (
            <>
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
            </>
          )}
          <button type="button" onClick={() => void accion('iniciar')}>
            Iniciar draft
          </button>
        </div>
      )}
      {usuario?.tipo === 'registrado' && (
        <p>
          <button type="button" className="secundario" onClick={() => void copiarEnlace()}>
            {copiado ? 'Enlace copiado' : 'Copiar enlace para invitar'}
          </button>
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
