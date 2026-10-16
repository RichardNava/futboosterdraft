import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api, ErrorApi } from '../api/cliente';
import { useSesion } from '../estado/sesion';
import { ETIQUETA_NIVEL_NPC, type NivelNPC } from '../textos/niveles';

type Modo = 'liga' | 'playoff' | 'mixto';

const PARTICIPANTES: Record<Modo, number[]> = { liga: [4, 5, 6, 7, 8], playoff: [4, 8, 16], mixto: [8] };

/** Formulario de creación de partida (T052; FR-001). */
export function CrearPartida() {
  const usuario = useSesion((s) => s.usuario);
  const navegar = useNavigate();
  const esInvitado = usuario?.tipo === 'invitado';
  const [modo, setModo] = useState<Modo>('liga');
  const [numParticipantes, setNumParticipantes] = useState(4);
  const [tipoSimulacion, setTipoSimulacion] = useState<'rapida' | '2d'>('rapida');
  const [ritmo, setRitmo] = useState<'directo' | 'asincrono'>('directo');
  const [plazo, setPlazo] = useState(24);
  const [npc, setNpc] = useState<NivelNPC[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cambiarModo = (m: Modo) => {
    setModo(m);
    if (!PARTICIPANTES[m].includes(numParticipantes)) setNumParticipantes(PARTICIPANTES[m][0]!);
  };

  // Un invitado juega solo contra la IA: todas las demás plazas son NPC.
  const maxNpc = numParticipantes - 1;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const partida = await api<{ id: string }>('/api/partidas', {
        idempotente: true,
        cuerpo: {
          modo,
          numParticipantes,
          tipoSimulacion,
          ritmo: esInvitado ? 'directo' : ritmo,
          ...(ritmo === 'asincrono' && !esInvitado ? { plazoJornadaHoras: plazo } : {}),
          npc: npc.slice(0, maxNpc).map((nivel) => ({ nivel })),
          ...(esInvitado ? { plazasHumanas: 1 } : {}),
        },
      });
      navegar(`/partidas/${partida.id}/sala`);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo crear la partida');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="pantalla">
      <h1>Nueva partida</h1>
      <form className="formulario ancho" onSubmit={(e) => void enviar(e)}>
        <fieldset>
          <legend>Modo de juego</legend>
          {(['liga', 'playoff', 'mixto'] as const).map((m) => (
            <label key={m} className="opcion">
              <input type="radio" name="modo" checked={modo === m} onChange={() => cambiarModo(m)} />
              {m === 'liga' ? 'Liga (ida y vuelta)' : m === 'playoff' ? 'Playoff (eliminatorias)' : 'Mixto (liga de 8 + semifinales y final)'}
            </label>
          ))}
        </fieldset>

        <label>
          Participantes
          <select value={numParticipantes} onChange={(e) => setNumParticipantes(Number(e.target.value))}>
            {PARTICIPANTES[modo].map((n) => (
              <option key={n} value={n}>
                {n}
                {n === 16 ? ' (dos drafts de 8)' : ''}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>Simulación de los partidos</legend>
          <label className="opcion">
            <input type="radio" checked={tipoSimulacion === 'rapida'} onChange={() => setTipoSimulacion('rapida')} />
            Rápida (resumen al descanso y al final)
          </label>
          <label className="opcion">
            <input type="radio" checked={tipoSimulacion === '2d'} onChange={() => setTipoSimulacion('2d')} />
            2D en tiempo real
          </label>
        </fieldset>

        <fieldset>
          <legend>Ritmo del torneo</legend>
          <label className="opcion">
            <input type="radio" checked={ritmo === 'directo' || esInvitado} onChange={() => setRitmo('directo')} />
            En directo (todas las jornadas seguidas)
          </label>
          <label className="opcion">
            <input
              type="radio"
              disabled={esInvitado}
              checked={ritmo === 'asincrono' && !esInvitado}
              onChange={() => setRitmo('asincrono')}
            />
            Asíncrono (una jornada cada plazo)
          </label>
          {esInvitado && <p className="nota">Regístrate para jugar torneos asíncronos o con otras personas.</p>}
          {ritmo === 'asincrono' && !esInvitado && (
            <label>
              Plazo por jornada (horas)
              <input type="number" min={1} max={336} value={plazo} onChange={(e) => setPlazo(Number(e.target.value))} />
            </label>
          )}
        </fieldset>

        <fieldset>
          <legend>Rivales controlados por la IA</legend>
          {esInvitado ? (
            <p className="nota">Como invitado, las {maxNpc} plazas restantes serán NPC. Puedes elegir sus niveles.</p>
          ) : (
            <p className="nota">Las plazas que no ocupen personas al empezar se rellenarán con NPC al azar.</p>
          )}
          <p className="nota">El relleno automático nunca usa el nivel PRO: solo tú, como anfitrión, puedes elegirlo.</p>
          <ul className="lista-npc">
            {npc.map((nivel, i) => (
              <li key={i}>
                <select
                  aria-label={`Nivel del NPC ${i + 1}`}
                  value={nivel}
                  onChange={(e) => setNpc(npc.map((n, j) => (j === i ? (e.target.value as NivelNPC) : n)))}
                >
                  {(Object.keys(ETIQUETA_NIVEL_NPC) as NivelNPC[]).map((n) => (
                    <option key={n} value={n}>
                      {ETIQUETA_NIVEL_NPC[n]}
                    </option>
                  ))}
                </select>
                <button type="button" className="secundario" onClick={() => setNpc(npc.filter((_, j) => j !== i))}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="secundario" disabled={npc.length >= maxNpc} onClick={() => setNpc([...npc, 'intermedio'])}>
            Añadir NPC
          </button>
        </fieldset>

        <button type="submit" disabled={enviando}>
          Crear partida
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
