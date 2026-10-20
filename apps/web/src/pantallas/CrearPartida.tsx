import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api, ErrorApi } from '../api/cliente';
import { useSesion } from '../estado/sesion';
import { DESCRIPCION_DIFICULTAD, ETIQUETA_DIFICULTAD, ETIQUETA_NIVEL_NPC, type Dificultad, type NivelNPC } from '../textos/niveles';

type Modo = 'liga' | 'playoff' | 'mixto';

const PARTICIPANTES: Record<Modo, number[]> = { liga: [4, 5, 6, 7, 8], playoff: [4, 8, 16], mixto: [8] };

/** Formulario de creación de partida (T052; FR-001). */
export function CrearPartida() {
  const usuario = useSesion((s) => s.usuario);
  const navegar = useNavigate();
  const esInvitado = usuario?.tipo === 'invitado';
  const [modo, setModo] = useState<Modo>('liga');
  const [numParticipantes, setNumParticipantes] = useState(4);
  const [plazo, setPlazo] = useState(24);
  const [npc, setNpc] = useState<NivelNPC[]>([]);
  const [dificultad, setDificultad] = useState<Dificultad>('normal');
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
          ...(!esInvitado ? { plazoJornadaHoras: plazo } : {}),
          npc: npc.slice(0, maxNpc).map((nivel) => ({ nivel })),
          dificultad,
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
          <legend>Ritmo del torneo</legend>
          <p className="nota">
            Solo el draft se juega a la vez. Si eres la única persona, cada jornada empieza cuando tú quieras; con más
            personas, cada uno juega sus partidos cuando quiere dentro del plazo de la jornada.
          </p>
          {esInvitado ? (
            <p className="nota">Regístrate para jugar torneos con otras personas.</p>
          ) : (
            <label>
              Plazo por jornada con varias personas (horas)
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
          <fieldset>
            <legend>Dificultad</legend>
            <p className="nota">Decide el nivel de los NPC que rellenan plazas; los que añadas tú conservan su nivel.</p>
            {(Object.keys(ETIQUETA_DIFICULTAD) as Dificultad[]).map((d) => (
              <label key={d} className="opcion">
                <input type="radio" name="dificultad" checked={dificultad === d} onChange={() => setDificultad(d)} />
                {ETIQUETA_DIFICULTAD[d]} <span className="nota">({DESCRIPCION_DIFICULTAD[d]})</span>
              </label>
            ))}
          </fieldset>
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
