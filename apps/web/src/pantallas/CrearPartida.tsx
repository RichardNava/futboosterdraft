import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api, ErrorApi } from '../api/cliente';
import { Aviso } from '../componentes/Aviso';
import { Icono } from '../componentes/Icono';
import { SobreArte } from '../componentes/arte/SobreArte';
import { useSesion } from '../estado/sesion';
import { DESCRIPCION_DIFICULTAD, ETIQUETA_DIFICULTAD, ETIQUETA_NIVEL_NPC, type Dificultad, type NivelNPC } from '../textos/niveles';

type Modo = 'liga' | 'playoff' | 'mixto' | 'duelos';

const PARTICIPANTES: Record<Modo, number[]> = { liga: [4, 5, 6, 7, 8], playoff: [4, 8, 16], mixto: [8], duelos: [4, 8, 16] };

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

  const plazoInvalido = !esInvitado && (!Number.isInteger(plazo) || plazo < 1 || plazo > 336);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando || plazoInvalido) return;
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
      setError(err instanceof ErrorApi ? err.message : 'No se ha podido crear la partida. Comprueba la conexión y vuelve a intentarlo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="pantalla crear-partida">
      <header className="cabecera-pantalla">
        <h1>Nueva partida</h1>
        <p className="entradilla">Elige el formato del torneo, cuántos equipos juegan y el nivel de los rivales.</p>
      </header>
      <div className="crear-partida-rejilla">
        <form className="formulario ancho crear-formulario" onSubmit={(e) => void enviar(e)}>
          <fieldset className="losetas">
            <legend>Modo de juego</legend>
            {(['liga', 'playoff', 'mixto', 'duelos'] as const).map((m) => (
              <label key={m} className="loseta">
                <input type="radio" name="modo" checked={modo === m} onChange={() => cambiarModo(m)} />
                <Icono nombre={ICONO_MODO[m]} tamano={26} className="loseta-icono" />
                <span className="loseta-texto">
                  <strong>{ETIQUETA_MODO[m]}</strong>{' '}
                  <span className="nota">{DETALLE_MODO[m]}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Equipos</legend>
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
          </fieldset>

          <fieldset>
            <legend>Rivales controlados por la IA</legend>
            {esInvitado ? (
              <p className="nota">Como invitado, las {maxNpc} plazas restantes serán NPC. Puedes elegir sus niveles.</p>
            ) : (
              <p className="nota">Las plazas que no ocupen personas al empezar se rellenarán con NPC al azar.</p>
            )}
            <fieldset className="losetas compactas">
              <legend>Dificultad</legend>
              {(Object.keys(ETIQUETA_DIFICULTAD) as Dificultad[]).map((d) => (
                <label key={d} className="loseta">
                  <input type="radio" name="dificultad" checked={dificultad === d} onChange={() => setDificultad(d)} />
                  <span className="loseta-texto">
                    <strong>{ETIQUETA_DIFICULTAD[d]}</strong> <span className="nota">({DESCRIPCION_DIFICULTAD[d]})</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="nota">Decide el nivel de los NPC que rellenan plazas; los que añadas tú conservan su nivel. El relleno automático nunca usa el nivel PRO: solo tú, como anfitrión, puedes elegirlo.</p>
            {npc.length > 0 && (
              <ul className="lista-npc">
                {npc.map((nivel, i) => (
                  <li key={i}>
                    <span className="lista-npc-numero" aria-hidden="true">
                      {i + 1}
                    </span>
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
            )}
            <button type="button" className="secundario" disabled={npc.length >= maxNpc} onClick={() => setNpc([...npc, 'intermedio'])}>
              Añadir NPC
            </button>
          </fieldset>

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
                <input
                  type="number"
                  min={1}
                  max={336}
                  value={plazo}
                  onChange={(e) => setPlazo(Number(e.target.value))}
                  aria-invalid={plazoInvalido || undefined}
                  aria-describedby="plazo-ayuda"
                />
                <span id="plazo-ayuda" className={plazoInvalido ? 'error ayuda-campo' : 'nota ayuda-campo'}>
                  {plazoInvalido ? 'El plazo debe estar entre 1 y 336 horas (dos semanas).' : 'Entre 1 y 336 horas.'}
                </span>
              </label>
            )}
          </fieldset>

          {error && (
            <Aviso tipo="error">
              <p>{error}</p>
            </Aviso>
          )}
          <div className="barra-principal barra-formulario">
            <span className="barra-principal-estado" id="motivo-crear">
              {plazoInvalido ? 'Corrige el plazo por jornada para crear la partida.' : null}
            </span>
            <div className="barra-principal-botones">
              <button
                type="submit"
                className="boton-principal"
                data-principal=""
                aria-disabled={enviando || plazoInvalido || undefined}
                aria-describedby={plazoInvalido ? 'motivo-crear' : undefined}
                aria-busy={enviando || undefined}
              >
                Crear partida
              </button>
            </div>
          </div>
        </form>

        {/* Resumen del torneo que se va a crear, con el sobre ilustrado. */}
        <aside className="crear-resumen" aria-label="Resumen de la partida">
          <SobreArte className="crear-resumen-sobre" />
          <dl className="crear-resumen-datos">
            <div>
              <dt>Modo</dt>
              <dd>{ETIQUETA_MODO[modo]}</dd>
            </div>
            <div>
              <dt>Equipos</dt>
              <dd>{numParticipantes}</dd>
            </div>
            <div>
              <dt>Dificultad</dt>
              <dd>{ETIQUETA_DIFICULTAD[dificultad]}</dd>
            </div>
            <div>
              <dt>Draft</dt>
              <dd>3 sobres de 8 cartas</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}

const ETIQUETA_MODO = { liga: 'Liga', playoff: 'Playoff', mixto: 'Mixto', duelos: 'Duelo de jugadores' } as const;

/** Icono de cada modo (spec 005, FR-060): todos tienen el suyo, con el mismo trazo. */
const ICONO_MODO = { liga: 'partidas', playoff: 'trofeo', mixto: 'escudo', duelos: 'duelo' } as const;

const DETALLE_MODO = {
  liga: 'Ida y vuelta: todos contra todos.',
  playoff: 'Eliminatorias hasta la final.',
  mixto: 'Liga de 8 y después semifinales y final.',
  duelos: 'Eliminatorias por duelos entre jugadores, puesto por puesto.',
} as const;
