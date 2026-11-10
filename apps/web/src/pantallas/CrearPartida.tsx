import type { RespuestaNivelesRareza } from '@fbd/protocol';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api, ErrorApi } from '../api/cliente';
import { Aviso } from '../componentes/Aviso';
import { BarraPrincipal } from '../componentes/BarraPrincipal';
import { Icono } from '../componentes/Icono';
import { SobreDecorativo } from '../componentes/SobreDecorativo';
import { useSesion } from '../estado/sesion';
import {
  DESCRIPCION_DIFICULTAD,
  DESCRIPCION_RAREZA,
  ETIQUETA_DIFICULTAD,
  ETIQUETA_NIVEL_NPC,
  ETIQUETA_RAREZA,
  type Dificultad,
  type NivelNPC,
  type NivelRareza,
} from '../textos/niveles';

type Modo = 'liga' | 'playoff' | 'mixto' | 'duelos';

const PARTICIPANTES: Record<Modo, number[]> = {
  liga: [4, 5, 6, 7, 8],
  playoff: [4, 8, 16],
  mixto: [8],
  duelos: [4, 8, 16],
};

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
  const [nivelRareza, setNivelRareza] = useState<NivelRareza>('moderado');
  const [niveles, setNiveles] = useState<RespuestaNivelesRareza | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Spec 013 (FR-033): una clave por envío del formulario, que se reutiliza si ese envío se repite tras un fallo de red.
  const clave = useRef<string | null>(null);

  useEffect(() => {
    api<RespuestaNivelesRareza>('/api/partidas/niveles-rareza').then(setNiveles).catch(() => setNiveles(null));
  }, []);
  const estadoNivel = (n: NivelRareza) => niveles?.niveles.find((x) => x.nivel === n);

  const cambiarModo = (m: Modo) => {
    setModo(m);
    if (!PARTICIPANTES[m].includes(numParticipantes)) setNumParticipantes(PARTICIPANTES[m][0]!);
  };

  // Un invitado juega solo contra la IA: todas las demás plazas son NPC.
  const maxNpc = numParticipantes - 1;

  const plazoInvalido = !esInvitado && (!Number.isInteger(plazo) || plazo < 1 || plazo > 336);

  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (enviando || plazoInvalido) return;
    setError(null);
    setEnviando(true);
    clave.current ??= crypto.randomUUID();
    try {
      const partida = await api<{ id: string }>('/api/partidas', {
        clave: clave.current,
        cuerpo: {
          modo,
          numParticipantes,
          ...(!esInvitado ? { plazoJornadaHoras: plazo } : {}),
          npc: npc.slice(0, maxNpc).map((nivel) => ({ nivel })),
          dificultad,
          nivelRareza,
          ...(esInvitado ? { plazasHumanas: 1 } : {}),
        },
      });
      clave.current = null;
      navegar(`/partidas/${partida.id}/sala`);
    } catch (err) {
      // Una respuesta del servidor es definitiva para esa clave: el siguiente envío lleva otra.
      if (err instanceof ErrorApi) clave.current = null;
      const d = err instanceof ErrorApi ? err.detalles : {};
      setError(
        err instanceof ErrorApi && err.codigo === 'SALDO_INSUFICIENTE'
          ? `Este nivel cuesta ${String(d.precio)} fragmentos y tienes ${String(d.saldo)}: te faltan ${String(d.faltan)}.`
          : err instanceof ErrorApi
            ? err.message
            : 'No se ha podido crear la partida. Comprueba la conexión y vuelve a intentarlo.',
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="pantalla crear-partida">
      <header className="cabecera-pantalla">
        <h1>Nueva partida</h1>
        <p className="entradilla">
          Elige el formato del torneo, cuántos equipos juegan y el nivel de los rivales.
        </p>
      </header>
      <div className="crear-partida-rejilla">
        {/* Spec 012, ronda 4: desde 720 px, las explicaciones van en la barra principal (`data-ayuda`) y caben sin desplazar; en estrecho (sin cursor), en su sitio. */}
        <form className="formulario crear-formulario" onSubmit={(e) => void enviar(e)}>
          <fieldset className="losetas crear-modo">
            <legend>Modo de juego</legend>
            {(['liga', 'playoff', 'mixto', 'duelos'] as const).map((m) => (
              <label key={m} className="loseta" data-ayuda={DETALLE_MODO[m]}>
                <input type="radio" name="modo" checked={modo === m} onChange={() => cambiarModo(m)} />
                <Icono nombre={ICONO_MODO[m]} tamano={26} className="loseta-icono" />
                <span className="loseta-texto">
                  <strong>{ETIQUETA_MODO[m]}</strong>{' '}
                  <span className="nota ayuda-en-sitio">{DETALLE_MODO[m]}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="crear-equipos" data-ayuda={AYUDA_EQUIPOS}>
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

          <fieldset className="crear-rivales" data-ayuda={AYUDA_RIVALES}>
            <legend>Rivales controlados por la IA</legend>
            <p className="nota ayuda-en-sitio">{AYUDA_RIVALES}</p>
            <fieldset className="losetas compactas">
              <legend>Dificultad</legend>
              {(Object.keys(ETIQUETA_DIFICULTAD) as Dificultad[]).map((d) => (
                <label key={d} className="loseta" data-ayuda={DESCRIPCION_DIFICULTAD[d]}>
                  <input
                    type="radio"
                    name="dificultad"
                    checked={dificultad === d}
                    onChange={() => setDificultad(d)}
                  />
                  <span className="loseta-texto">
                    <strong>{ETIQUETA_DIFICULTAD[d]}</strong>{' '}
                    <span className="nota ayuda-en-sitio">{DESCRIPCION_DIFICULTAD[d]}</span>
                  </span>
                </label>
              ))}
            </fieldset>
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
                      onChange={(e) =>
                        setNpc(npc.map((n, j) => (j === i ? (e.target.value as NivelNPC) : n)))
                      }
                    >
                      {(Object.keys(ETIQUETA_NIVEL_NPC) as NivelNPC[]).map((n) => (
                        <option key={n} value={n}>
                          {ETIQUETA_NIVEL_NPC[n]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="secundario"
                      onClick={() => setNpc(npc.filter((_, j) => j !== i))}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="secundario"
              disabled={npc.length >= maxNpc}
              data-ayuda={
                esInvitado
                  ? `Como invitado, las ${maxNpc} plazas restantes son NPC: aquí eliges sus niveles.`
                  : 'Añade un NPC con el nivel que elijas; las plazas que nadie ocupe al empezar se rellenan solas.'
              }
              onClick={() => setNpc([...npc, 'intermedio'])}
            >
              Añadir NPC
            </button>
          </fieldset>

          <fieldset className="losetas compactas crear-rareza" data-ayuda={AYUDA_RAREZA}>
            <legend>Rareza del draft</legend>
            {(Object.keys(ETIQUETA_RAREZA) as NivelRareza[]).map((n) => {
              const estado = estadoNivel(n);
              const precio = estado?.estado === 'pago' ? `${estado.coste} fragmentos` : estado?.estado === 'no_disponible' ? 'Solo con cuenta registrada' : 'Gratis';
              return (
                <label key={n} className="loseta" data-ayuda={`${DESCRIPCION_RAREZA[n]} ${precio}.`}>
                  <input
                    type="radio"
                    name="rareza"
                    checked={nivelRareza === n}
                    disabled={estado?.estado === 'no_disponible'}
                    onChange={() => setNivelRareza(n)}
                  />
                  <span className="loseta-texto">
                    <strong>{ETIQUETA_RAREZA[n]}</strong> <span className="rareza-precio">{precio}</span>{' '}
                    <span className="nota ayuda-en-sitio">{DESCRIPCION_RAREZA[n]}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <fieldset className="crear-ritmo" data-ayuda={AYUDA_RITMO}>
            <legend>Ritmo del torneo</legend>
            <p className="nota ayuda-en-sitio">{AYUDA_RITMO}</p>
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
                  {plazoInvalido
                    ? 'El plazo debe estar entre 1 y 336 horas (dos semanas).'
                    : 'Entre 1 y 336 horas.'}
                </span>
              </label>
            )}
          </fieldset>

          {error && (
            <Aviso tipo="error">
              <p>{error}</p>
            </Aviso>
          )}
        </form>

        {/* Resumen del torneo que se va a crear, con el sobre ilustrado. */}
        <aside className="crear-resumen" aria-label="Resumen de la partida">
          <SobreDecorativo className="crear-resumen-sobre" />
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
              <dt>Rareza</dt>
              <dd>{ETIQUETA_RAREZA[nivelRareza]}</dd>
            </div>
            <div>
              <dt>Draft</dt>
              <dd>3 sobres de 8 cartas</dd>
            </div>
          </dl>
        </aside>
      </div>
      <BarraPrincipal
        principal={{
          etiqueta: 'Crear partida',
          onClick: () => enviar(),
          motivoDesactivado: plazoInvalido ? 'Corrige el plazo por jornada para crear la partida.' : enviando ? 'Creando la partida…' : null,
          ayuda: 'Crea la partida y abre la sala, donde esperas a los demás o empiezas el draft.',
        }}
        estado={
          <span className="solo-ancho">Pasa el cursor por cada opción para ver aquí qué significa.</span>
        }
      />
    </main>
  );
}

const ETIQUETA_MODO = {
  liga: 'Liga',
  playoff: 'Playoff',
  mixto: 'Mixto',
  duelos: 'Duelo de jugadores',
} as const;

/** Icono de cada modo (spec 005, FR-060): todos tienen el suyo, con el mismo trazo. */
const ICONO_MODO = { liga: 'partidas', playoff: 'trofeo', mixto: 'escudo', duelos: 'duelo' } as const;

const DETALLE_MODO = {
  liga: 'Ida y vuelta: todos contra todos.',
  playoff: 'Eliminatorias hasta la final.',
  mixto: 'Liga de 8 y después semifinales y final.',
  duelos: 'Eliminatorias por duelos entre jugadores, puesto por puesto.',
} as const;

const AYUDA_EQUIPOS = 'Cuántos equipos juegan el torneo; con 16, el draft se hace en dos grupos de 8.';
const AYUDA_RIVALES =
  'Decide el nivel de los NPC que rellenan plazas; los que añadas tú conservan su nivel. El relleno automático nunca usa el nivel PRO: solo tú, como anfitrión, puedes elegirlo.';
const AYUDA_RAREZA =
  'Cuántas cartas de cada nivel lleva cada sobre del draft. Es igual para todos los equipos de la partida.';
const AYUDA_RITMO =
  'Solo el draft se juega a la vez. Si eres la única persona, cada jornada empieza cuando tú quieras; con más personas, cada uno juega sus partidos cuando quiere dentro del plazo de la jornada.';
