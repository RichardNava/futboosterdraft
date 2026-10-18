import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AperturaSobre } from '../componentes/AperturaSobre';
import { usePartidaActiva } from '../estado/partidaActiva';
import { BotonAvanzar } from '../componentes/BotonAvanzar';
import { CartaJugador, type CartaResumen } from '../componentes/CartaJugador';
import { FichaJugador } from '../componentes/FichaJugador';
import { useConexion, useCuentaAtras } from '../conexion/useConexion';
import { ETIQUETA_DEMARCACION } from '../textos/niveles';

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

  const confirmar = async () => {
    if (!conexion || !turno || elegida === null) return;
    setError(null);
    const clave = `${turno.ronda}-${turno.turno}`;
    try {
      const ack = await conexion.enviar({ t: 'draft.elegir', ronda: turno.ronda, turno: turno.turno, jugadorId: elegida });
      // Si el turno ya avanzó (fuimos los últimos en elegir), el ack llega después del sobre nuevo.
      if (turnoActual.current !== clave) return;
      if (ack.ok) setConfirmada(elegida);
      else setError(ack.error?.mensaje ?? 'No se pudo elegir');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const misPorDemarcacion = useMemo(() => {
    const grupos: Record<string, CartaResumen[]> = { POR: [], DEF: [], MED: [], DEL: [] };
    for (const j of turno?.misElecciones ?? []) grupos[j.demarcacion]!.push(j);
    return grupos;
  }, [turno]);

  if (terminado) {
    return (
      <main className="pantalla draft">
        <h1>Draft terminado</h1>
        <p>Ya tienes tu plantilla de 24 jugadores.</p>
        <div className="acciones">
          <BotonAvanzar situacion="fin_draft" onAvanzar={() => navegar(`/partidas/${partidaId}/alineacion`)} />
          <button type="button" className="secundario" onClick={() => navegar(`/partidas/${partidaId}/plantillas`)}>
            Ver las plantillas
          </button>
        </div>
      </main>
    );
  }
  if (!turno) return <p className="cargando">{conectada ? 'Esperando el primer sobre…' : 'Conectando…'}</p>;

  const pendientes = participantes.length - eligieron.length;
  const textoEspera =
    esperando && esperando.length > 0
      ? `Esperando a: ${esperando.map((p) => p.nombre).join(', ')}`
      : pendientes > 0
        ? `Esperando a ${pendientes} participante${pendientes > 1 ? 's' : ''}…`
        : 'Pasando el sobre…';

  return (
    <main className="pantalla draft">
      {apertura && <AperturaSobre cartas={apertura} onTerminar={() => setApertura(null)} />}
      <header className="draft-cabecera">
        <div>
          <h1>
            Sobre {turno.ronda} · Turno {turno.turno} de 8
          </h1>
          <p className="nota">
            Las cartas que dejes pasan a tu {turno.direccion === 'izquierda' ? 'izquierda ←' : 'derecha →'}
          </p>
        </div>
        <div className={`reloj ${restante !== null && restante <= 10 ? 'urgente' : ''}`} aria-live="polite">
          {restante ?? '–'} s
        </div>
      </header>
      {!conectada && <p className="aviso">Sin conexión. Reconectando… Si se acaba el tiempo, se elegirá por ti.</p>}
      {aviso && (
        <p className="aviso" role="status">
          {aviso}{' '}
          <button type="button" className="secundario" onClick={() => setAviso(null)}>
            Entendido
          </button>
        </p>
      )}

      <section aria-label="Sobre actual">
        <div className="rejilla-cartas">
          {turno.sobre.cartas.map((j) => (
            <CartaJugador
              key={j.id}
              jugador={j}
              seleccionada={(confirmada ?? elegida) === j.id}
              onClick={confirmada === null ? () => setElegida(j.id) : undefined}
              onVerFicha={() => setFicha(j.id)}
            />
          ))}
        </div>
        <div className="acciones">
          {confirmada === null ? (
            <button type="button" disabled={elegida === null} onClick={() => void confirmar()}>
              Confirmar elección
            </button>
          ) : (
            <p role="status">Elección confirmada. {textoEspera}</p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>

      <section aria-label="Mis elecciones" className="mis-elecciones">
        <h2>Mi plantilla ({turno.misElecciones.length}/24)</h2>
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
      </section>
      {ficha !== null && <FichaJugador jugadorId={ficha} onCerrar={() => setFicha(null)} />}
    </main>
  );
}
