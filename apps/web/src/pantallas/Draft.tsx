import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AperturaSobre } from '../componentes/AperturaSobre';
import { usePartidaActiva } from '../estado/partidaActiva';
import { BarraPrincipal } from '../componentes/BarraPrincipal';
import { BotonAvanzar } from '../componentes/BotonAvanzar';
import { CartaJugador, type CartaResumen } from '../componentes/CartaJugador';
import { FichaJugador } from '../componentes/FichaJugador';
import { useConexion, useCuentaAtras } from '../conexion/useConexion';
import { Aviso } from '../componentes/Aviso';
import { Icono } from '../componentes/Icono';
import { NombreRecortado } from '../componentes/NombreRecortado';
import { ETIQUETA_DEMARCACION } from '../textos/niveles';
import { PantallaCargando } from '../componentes/Esqueleto';
import { CartaMesa } from '../componentes/CartaMesa';
import { SobreArte } from '../componentes/arte/SobreArte';
import { useEscalaRejilla } from '../componentes/useEscalaRejilla';

interface Turno {
  ronda: number;
  turno: number;
  direccion: 'izquierda' | 'derecha';
  sobre: { id: string; cartas: CartaResumen[] };
  venceEn: string;
  misElecciones: CartaResumen[];
}

const DEMARCACIONES = ['POR', 'DEF', 'MED', 'DEL'] as const;

/** Pantalla de draft (T054; FR-007 a FR-013). */
export function Draft() {
  const { partidaId } = useParams();
  const navegar = useNavigate();
  const [turno, setTurno] = useState<Turno | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const [confirmada, setConfirmada] = useState<number | null>(null);
  const [eligieron, setEligieron] = useState<string[]>([]);
  /** Humanos que aún no han elegido en el turno (FR-013). */
  const [esperando, setEsperando] = useState<{ id: string; nombre: string }[] | null>(null);
  const [terminado, setTerminado] = useState(false);
  const [participantes, setParticipantes] = useState<{ id: string; nombre: string }[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ficha, setFicha] = useState<number | null>(null);
  /** Sobre propio recién abierto: animación de apertura (solo cuando el servidor la pide; FR-006). */
  const [apertura, setApertura] = useState<CartaResumen[] | null>(null);
  /** Turno mostrado ("ronda-turno"): el ack de una elección solo cuenta para el turno en que se envió. */
  const turnoActual = useRef<string | null>(null);
  /** Hay una elección en camino: el doble clic y el botón no envían dos veces (FR-056). */
  const enviando = useRef(false);

  const { conexion, estado, conectada } = useConexion(partidaId, (m) => {
    if (m.t === 'draft.turno') {
      turnoActual.current = `${String(m.ronda)}-${String(m.turno)}`;
      setTurno(m as unknown as Turno);
      setApertura(m.animacion === true ? (m as unknown as Turno).sobre.cartas : null);
      if (m.animacion === true) usePartidaActiva.getState().actualizar({ aperturaPendiente: null });
      setElegida(null);
      setConfirmada(null);
      setEligieron([]);
      setEsperando(null);
      setError(null);
    } else if (m.t === 'draft.progreso') {
      setEligieron((m.eligieron as string[]) ?? []);
      setEsperando((m.pendientes as { id: string; nombre: string }[] | undefined) ?? null);
    } else if (m.t === 'draft.eleccion_auto') {
      const j = m.jugador as CartaResumen;
      setAviso(`Se acabó el tiempo: se ha elegido automáticamente a ${j.nombre} ${j.apellidos} (${Math.round(j.media)}).`);
    } else if (m.t === 'draft.terminado') {
      setTerminado(true);
    } else if (m.t === 'error' && m.codigo === 'PARTIDA_ABANDONADA') {
      navegar('/');
    }
  });

  // Instantánea al conectar o reconectar.
  useEffect(() => {
    if (!estado) return;
    if (estado.fase === 'sala') {
      navegar(`/partidas/${partidaId}/sala`, { replace: true });
      return;
    }
    if (estado.fase !== 'draft') {
      // Si se estaba jugando el draft, se muestra su cierre con «Preparar equipo»; si no, a las plantillas.
      if (turnoActual.current !== null) setTerminado(true);
      else navegar(`/partidas/${partidaId}/plantillas`, { replace: true });
      return;
    }
    const d = estado.vista.draft;
    if (!d) return;
    setParticipantes(d.participantes);
    setEligieron(d.eligieron);
    setEsperando(d.pendientes ?? null);
    if (d.terminada) return;
    turnoActual.current = `${d.ronda}-${d.turno}`;
    // La apertura pedida mientras se pasaba de la sala al draft se muestra una vez, ahora.
    const pendiente = usePartidaActiva.getState().aperturaPendiente;
    if (pendiente && pendiente.partidaId === partidaId && pendiente.ronda === d.ronda && d.turno === 1) {
      usePartidaActiva.getState().actualizar({ aperturaPendiente: null });
      setApertura(d.sobre.cartas);
    }
    setTurno({ ronda: d.ronda, turno: d.turno, direccion: d.direccion, sobre: d.sobre, venceEn: d.venceEn, misElecciones: d.misElecciones });
    setConfirmada(d.eleccionActual?.id ?? null);
  }, [estado, navegar, partidaId]);

  const restante = useCuentaAtras(turno?.venceEn, conexion);

  const confirmar = async (jugadorId: number | null = elegida) => {
    if (!conexion || !turno || jugadorId === null || enviando.current) return;
    setError(null);
    const clave = `${turno.ronda}-${turno.turno}`;
    enviando.current = true;
    try {
      const ack = await conexion.enviar({ t: 'draft.elegir', ronda: turno.ronda, turno: turno.turno, jugadorId });
      // Si el turno ya avanzó (fuimos los últimos en elegir), el ack llega después del sobre nuevo.
      if (turnoActual.current !== clave) return;
      if (ack.ok) setConfirmada(jugadorId);
      else setError(ack.error?.mensaje ?? 'No se pudo elegir');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      enviando.current = false;
    }
  };

  // Doble clic: elige la carta y confirma a la vez, sin pasar por el botón (spec 004, FR-056).
  const elegirYConfirmar = (jugadorId: number) => {
    setElegida(jugadorId);
    void confirmar(jugadorId);
  };


  const misPorDemarcacion = useMemo(() => {
    const grupos: Record<string, CartaResumen[]> = { POR: [], DEF: [], MED: [], DEL: [] };
    for (const j of turno?.misElecciones ?? []) grupos[j.demarcacion]!.push(j);
    return grupos;
  }, [turno]);

  // Las cartas del sobre se escalan para caber sin desplazarse (spec 004, FR-046).
  const zona = useRef<HTMLElement>(null);
  const rejilla = useRef<HTMLDivElement>(null);
  useEscalaRejilla(zona, rejilla, { clave: `${turno?.ronda}-${turno?.turno}-${turno?.sobre.cartas.length}-${apertura ? 1 : 0}` });

  // Duración del turno: el mayor tiempo restante visto en él (45 s, o 53 s con la apertura del sobre).
  const duracion = useRef<{ clave: string; segundos: number }>({ clave: '', segundos: 0 });
  const claveTurno = turno ? `${turno.ronda}-${turno.turno}` : '';
  if (restante !== null) {
    if (duracion.current.clave !== claveTurno) duracion.current = { clave: claveTurno, segundos: restante };
    else duracion.current.segundos = Math.max(duracion.current.segundos, restante);
  }

  if (terminado) {
    return (
      <main className="pantalla draft-fin">
        <section className="draft-fin-escena" aria-labelledby="titulo-draft-fin">
          <SobreArte className="draft-fin-sobre" rasgado />
          <div className="draft-fin-texto">
            <h1 id="titulo-draft-fin" className="cartel">
              Draft terminado
            </h1>
            <p className="entradilla">Ya tienes tu plantilla de 24 jugadores. Elige el once y la táctica antes del primer partido.</p>
          </div>
        </section>
        <BotonAvanzar
          situacion="fin_draft"
          onAvanzar={() => navegar(`/partidas/${partidaId}/alineacion`)}
          secundarios={[{ etiqueta: 'Ver las plantillas', onClick: () => navegar(`/partidas/${partidaId}/plantillas`) }]}
        />
      </main>
    );
  }
  if (!turno) return <PantallaCargando forma="cartas" texto={conectada ? 'Esperando el primer sobre…' : 'Conectando…'} />;

  const pendientes = participantes.length - eligieron.length;
  const textoEspera =
    esperando && esperando.length > 0
      ? `Esperando a: ${esperando.map((p) => p.nombre).join(', ')}`
      : pendientes > 0
        ? `Esperando a ${pendientes} participante${pendientes > 1 ? 's' : ''}…`
        : 'Pasando el sobre…';

  const eleccion = (turno.ronda - 1) * 8 + turno.turno;
  const urgente = restante !== null && restante <= 10;
  const progreso = restante !== null && duracion.current.segundos > 0 ? Math.max(0, Math.min(1, restante / duracion.current.segundos)) : 1;
  const RADIO_RELOJ = 26;
  const vuelta = 2 * Math.PI * RADIO_RELOJ;

  return (
    <main className="pantalla draft">
      {apertura && <AperturaSobre cartas={apertura} onTerminar={() => setApertura(null)} />}

      {/* Las cartas dominan; el contexto va en un carril lateral (arriba y abajo en móvil). Spec 004, FR-018, FR-046. */}
      <div className="draft-mesa">
        {/* Mientras dura la apertura, las cartas no se ven por detrás (hallazgo H10); el sitio se conserva. */}
        <section
          ref={zona}
          className="draft-zona"
          aria-label="Sobre actual"
          data-desplazable=""
          style={apertura ? { visibility: 'hidden' } : undefined}
          aria-hidden={apertura ? true : undefined}
        >
          <div ref={rejilla} className="rejilla-cartas" data-cartas={turno.sobre.cartas.length}>
            {turno.sobre.cartas.map((j) => (
              <CartaMesa
                key={j.id}
                jugador={j}
                seleccionada={(confirmada ?? elegida) === j.id}
                onClick={confirmada === null ? () => setElegida(j.id) : undefined}
                onDobleClick={confirmada === null ? () => elegirYConfirmar(j.id) : undefined}
                onVerFicha={() => setFicha(j.id)}
              />
            ))}
          </div>
        </section>

        <aside className="draft-contexto" aria-label="Contexto del draft">
          <header className="draft-cabecera">
            <h1>
              <span className="draft-sobre">Sobre {turno.ronda}</span> <span className="draft-turno">· Turno {turno.turno} de 8</span>
            </h1>
            <p className="eleccion-cartel">Elección {eleccion} de 24</p>
          </header>

          <div className="draft-reloj-fila">
            <div className={`reloj ${urgente ? 'urgente' : ''}`} aria-live="polite">
              <svg className="reloj-anillo" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r={RADIO_RELOJ} className="reloj-pista" />
                <circle cx="32" cy="32" r={RADIO_RELOJ} className="reloj-avance" strokeDasharray={vuelta} strokeDashoffset={vuelta * (1 - progreso)} />
              </svg>
              <span className="reloj-cifra">
                {urgente && <Icono nombre="advertencia" etiqueta="Quedan pocos segundos" />}
                {restante ?? '–'}
                <span className="reloj-unidad"> s</span>
              </span>
            </div>
            <p className="draft-paso">
              <span className={`draft-flecha ${turno.direccion}`} aria-hidden="true">
                <Icono nombre="flecha" tamano={22} />
              </span>
              <span>
                Las cartas que dejes pasan a tu <strong>{turno.direccion === 'izquierda' ? 'izquierda' : 'derecha'}</strong>
              </span>
            </p>
          </div>

          {aviso && (
            <Aviso
              tipo="informacion"
              acciones={
                <button type="button" className="secundario" onClick={() => setAviso(null)}>
                  Entendido
                </button>
              }
            >
              <p>{aviso}</p>
            </Aviso>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {!conectada && <p className="nota">Sin conexión. Si se acaba el tiempo, se elegirá por ti.</p>}

          {/* La mesa: los asientos con el nombre de cada equipo y quién ha elegido ya (spec 003, FR-044). */}
          <section className="draft-bloque" aria-labelledby="titulo-mesa">
            <h2 id="titulo-mesa">Mesa</h2>
            <ol className="mesa-draft">
              {participantes.map((p) => (
                <li key={p.id} className={eligieron.includes(p.id) ? 'eligio' : ''}>
                  <span className="mesa-estado" aria-hidden="true">
                    {eligieron.includes(p.id) ? <Icono nombre="exito" /> : <span className="mesa-pensando" />}
                  </span>
                  <NombreRecortado texto={p.nombre} />
                  {eligieron.includes(p.id) && <span className="solo-lectores"> (ya ha elegido)</span>}
                </li>
              ))}
            </ol>
          </section>

          <section aria-label="Mis elecciones" className="draft-bloque mis-elecciones">
            <h2>Mi plantilla ({turno.misElecciones.length}/24)</h2>
            <ul className="plantilla-acumulada">
              {DEMARCACIONES.map((d) => (
                <li key={d} style={{ '--relleno': Math.min(1, misPorDemarcacion[d]!.length / 8) } as CSSProperties}>
                  <span>{ETIQUETA_DEMARCACION[d]}</span>
                  <span className="cifra">{misPorDemarcacion[d]!.length}</span>
                </li>
              ))}
            </ul>
            {turno.misElecciones.length > 0 && (
              <details className="seccion-plegable">
                <summary>Ver mis jugadores</summary>
                <div className="columnas-demarcacion">
                  {DEMARCACIONES.map((d) => (
                    <div key={d}>
                      <h3>
                        {ETIQUETA_DEMARCACION[d]} ({misPorDemarcacion[d]!.length})
                      </h3>
                      {misPorDemarcacion[d]!.map((j) => (
                        <CartaJugador key={j.id} jugador={j} compacta onVerFicha={() => setFicha(j.id)} />
                      ))}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>
        </aside>
      </div>
      {ficha !== null && <FichaJugador jugadorId={ficha} onCerrar={() => setFicha(null)} />}
      <BarraPrincipal
        principal={confirmada === null ? { etiqueta: 'Confirmar elección', onClick: () => confirmar(), motivoDesactivado: elegida === null ? 'Elige una carta del sobre' : null } : null}
        estado={confirmada !== null ? <span role="status">Elección confirmada. {textoEspera}</span> : undefined}
      />
    </main>
  );
}
