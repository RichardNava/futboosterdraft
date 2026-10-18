import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { jugadoresDe, Lienzo2D, type Superposicion } from '../campo2d/Lienzo2D';
import { RelojReproduccion, VELOCIDADES, type EstadoReloj, type Velocidad } from '../campo2d/relojReproduccion';
import { datosVacios, incorporarTramo, type TramoRecibido } from '../campo2d/tramos';
import { BotonAvanzar } from '../componentes/BotonAvanzar';
import { AvisoDorsales } from '../componentes/AvisoDorsales';
import { BotonFinalizar } from '../componentes/BotonFinalizar';
import { Estadisticas } from '../componentes/Estadisticas';
import { estadoJugadores, PanelCambios } from '../componentes/PanelCambios';
import { ResumenEventos, type EventoVista } from '../componentes/ResumenEventos';
import { useConexion } from '../conexion/useConexion';
import { ETIQUETA_FASE, type Inicio, type Marcador } from './PartidoRapido';

interface Tramo extends TramoRecibido {
  eventos: (TramoRecibido['eventos'][number] & EventoVista)[];
  marcador: Marcador;
  minuto?: string;
}

/** Suma minutos al último número de un minuto mostrable ("67'" → "69'", "45+2'" → "45+3'"). */
function sumarMinutos(minuto: string, n: number): string {
  if (n <= 0) return minuto;
  return minuto.replace(/(\d+)'$/, (_, m: string) => `${Number(m) + n}'`);
}

const AVISO: Partial<Record<EstadoReloj, string>> = {
  gol: '¡GOL!',
  descanso: 'Descanso',
  pre_prorroga: 'Final del tiempo reglamentario: habrá prórroga',
  cargando: 'Cargando…',
  fin: 'Final del partido',
};

const movimientoReducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Partido 2D en directo contra un NPC (FR-021 a FR-025b; research R6): el campo con los jugadores, las
 * velocidades x2, x4 y x8 (solo del cliente; se recuerda la última), las pausas anunciadas («¡GOL!»,
 * descanso y antes de la prórroga con «Seguir», «Cargando…»), los cambios en cualquier momento («Se
 * aplicará en el minuto N») y el feed de eventos hasta el minuto que se está viendo.
 */
export function Partido2D() {
  const { partidaId, partidoId } = useParams();
  const navegar = useNavigate();
  const [inicio, setInicio] = useState<Inicio | null>(null);
  const [tramos, setTramos] = useState<Tramo[]>([]);
  const [tick, setTick] = useState(0);
  const [estadoReloj, setEstadoReloj] = useState<EstadoReloj>('cargando');
  const [fin, setFin] = useState<{ marcador: Marcador; eventos: EventoVista[]; estadisticas: unknown } | null>(null);
  const [pendientes, setPendientes] = useState(0);
  const [aplicacion, setAplicacion] = useState<{ tick: number; minuto: string } | null>(null);
  const [avisoRival, setAvisoRival] = useState<string | null>(null);
  const [miId, setMiId] = useState<string | null>(null);
  // Tras «Finalizar partido» se ven los eventos según llegan y el resumen en cuanto llega el final.
  const [finalizando, setFinalizando] = useState(false);
  const datos = useRef(datosVacios());
  const enviarReproduccion = useRef<(tick: number, velocidad: Velocidad) => void>(() => undefined);
  const [reloj] = useState(() => new RelojReproduccion({ informar: (t, v) => enviarReproduccion.current(t, v) }));
  const [velocidad, setVelocidad] = useState<Velocidad>(reloj.velocidad);
  const sinRotulos = useMemo(movimientoReducido, []);

  const recibirTramo = useCallback(
    (t: Tramo) => {
      setTramos((ts) => (ts.some((x) => x.desdeTick === t.desdeTick && x.hastaTick === t.hastaTick) ? ts : [...ts, t]));
      incorporarTramo(datos.current, reloj, t);
    },
    [reloj],
  );

  const { conexion, estado, conectada } = useConexion(partidaId, (m) => {
    if (m.partidoId !== undefined && m.partidoId !== partidoId) return;
    switch (m.t) {
      case 'partido.inicio':
        setInicio(m as unknown as Inicio);
        break;
      case 'partido.tramo':
        recibirTramo(m as unknown as Tramo);
        break;
      case 'partido.decision_aplicada':
        if (m.participanteId === miId) {
          setPendientes((n) => Math.max(0, n - 1));
          setAplicacion({ tick: m.aplicadaEnTick as number, minuto: (m.minuto as string | undefined) ?? '' });
        } else {
          setAvisoRival(m.tipo === 'sustitucion' ? 'Tu rival ha hecho una sustitución.' : 'Tu rival ha hecho un cambio táctico.');
        }
        break;
      case 'partido.fin':
        setFin({ marcador: m.marcador as Marcador, eventos: m.eventos as EventoVista[], estadisticas: m.estadisticas });
        break;
    }
  });

  // El reloj informa al servidor de por dónde va y a qué velocidad (búfer de anticipación, research R6).
  useEffect(() => {
    enviarReproduccion.current = (t, v) => {
      if (conexion && partidoId) conexion.enviarSinAck({ t: 'partido.reproduccion', partidoId, tick: t, velocidad: v });
    };
  }, [conexion, partidoId]);

  // Instantánea al conectar o reconectar: tramos ya simulados y el último tick informado.
  useEffect(() => {
    if (!estado || estado.fase !== 'torneo') return;
    setMiId(estado.vista.partida.miParticipanteId);
    const p = estado.vista.partido;
    if (!p || p.inicio.partidoId !== partidoId || !p.dosD) return;
    setInicio(p.inicio);
    const ts = p.dosD.tramos as Tramo[];
    setTramos(ts);
    datos.current = datosVacios();
    for (const t of ts) incorporarTramo(datos.current, reloj, t);
    reloj.situar(Math.max(reloj.tick, p.dosD.ultimoTickInformado ?? 0));
  }, [estado, partidoId, reloj]);

  const alAvanzar = useCallback(
    (t: number) => {
      setTick(t);
      setEstadoReloj(reloj.estado);
    },
    [reloj],
  );

  // Lo que se ve depende del tick que se está reproduciendo, no de lo ya simulado.
  const eventosVistos = useMemo(() => tramos.flatMap((t) => t.eventos).filter((e) => finalizando || e.tick <= tick), [tramos, tick, finalizando]);
  const tramoActual = tramos.find((t) => t.hastaTick >= tick) ?? tramos.at(-1);
  const anterior = tramoActual ? tramos[tramos.indexOf(tramoActual) - 1] : undefined;
  const minuto = sumarMinutos(anterior?.minuto ?? "1'", Math.floor((tick - (tramoActual?.desdeTick ?? 0)) / 60));
  const goles = (lado: 'local' | 'visitante') => eventosVistos.filter((e) => e.tipo === 'gol' && e.equipo === lado).length;
  const alFinal = fin !== null && (estadoReloj === 'fin' || finalizando);
  const tanda = eventosVistos.filter((e) => e.tipo === 'tanda_lanzamiento').at(-1);
  const penaltis = tanda ? (tanda.datos.marcador as { local: number; visitante: number }) : null;
  const marcador: Marcador = alFinal ? fin.marcador : { local: goles('local'), visitante: goles('visitante') };
  const fase = alFinal ? 'finalizado' : (tramoActual?.fase ?? 'primera_parte');
  const aviso = (alFinal || estadoReloj !== 'fin' ? AVISO[estadoReloj] : null) ?? null;

  const superposicion = useRef<Superposicion>({ marcador, minuto, aviso });
  superposicion.current = { marcador, minuto, aviso: estadoReloj === 'cargando' && tramos.length === 0 ? null : aviso };

  const jugadores = useMemo(() => (inicio ? jugadoresDe(inicio) : new Map()), [inicio]);

  if (!inicio) return <p className="cargando">{conectada ? 'Esperando el inicio del partido…' : 'Conectando…'}</p>;

  const miLado = miId === inicio.local.id ? 'local' : miId === inicio.visitante.id ? 'visitante' : null;
  const nombresEquipo = { local: inicio.local.nombre, visitante: inicio.visitante.nombre };
  const nombre = (id: number) => {
    const j = jugadores.get(id);
    return j ? `${j.dorsal ? `${j.dorsal}. ` : ''}${j.nombre}` : String(id);
  };
  // Los cambios se validan contra lo ya simulado en el servidor, no contra lo que se está viendo.
  const todosLosEventos = tramos.flatMap((t) => t.eventos);
  const enPausa = estadoReloj === 'descanso' || estadoReloj === 'pre_prorroga';

  const elegirVelocidad = (v: Velocidad) => {
    reloj.velocidad = v;
    setVelocidad(v);
  };

  const seguir = () => {
    reloj.continuar();
    setEstadoReloj(reloj.estado);
    // Si el servidor ya ha reanudado (venció la ventana), no pasa nada.
    void conexion?.enviar({ t: 'partido.seguir', partidoId: inicio.partidoId }).catch(() => undefined);
  };

  const enviarDecision = async (tipo: 'sustitucion' | 'formacion' | 'tactica', datosDecision: Record<string, unknown>) => {
    if (!conexion) throw new Error('Sin conexión');
    const ack = await conexion.enviar({ t: 'partido.decision', partidoId: inicio.partidoId, tipo, datos: datosDecision });
    if (ack.ok) {
      setPendientes((n) => n + 1);
      setAplicacion(null);
    }
    return ack;
  };

  const finalizar = async () => {
    if (!conexion) throw new Error('Sin conexión');
    setFinalizando(true);
    const ack = await conexion.enviar({ t: 'partido.finalizar', partidoId: inicio.partidoId });
    if (!ack.ok) setFinalizando(false);
    return ack;
  };

  const avisoCambios =
    pendientes > 0
      ? 'Cambio confirmado: se aplicará en la próxima interrupción del juego.'
      : aplicacion && aplicacion.minuto
        ? tick < aplicacion.tick
          ? `Se aplicará en el minuto ${aplicacion.minuto}.`
          : `Tu cambio se aplicó en el minuto ${aplicacion.minuto}.`
        : 'Los cambios se aplican en la siguiente interrupción del juego.';

  return (
    <main className="pantalla partido partido-2d">
      <h1 className="solo-lectores">
        {inicio.local.nombre} contra {inicio.visitante.nombre}
      </h1>
      <Lienzo2D
        inicio={inicio}
        reloj={reloj}
        datos={datos}
        superposicion={superposicion}
        alAvanzar={alAvanzar}
        sinRotulos={sinRotulos}
        etiqueta={`${inicio.local.nombre} ${marcador.local}, ${inicio.visitante.nombre} ${marcador.visitante}. Minuto ${minuto}. ${ETIQUETA_FASE[fase] ?? fase}.`}
      />
      <p className="marcador-2d" aria-live="polite">
        <span>
          {inicio.local.nombre} {marcador.local} – {marcador.visitante} {inicio.visitante.nombre}
        </span>
        <span className="nota">
          {minuto} · {aviso ?? ETIQUETA_FASE[fase] ?? fase}
        </span>
      </p>
      <AvisoDorsales inicio={inicio} miId={miId} />
      {penaltis && (
        <p className="nota" aria-live="polite">
          Penaltis: {(alFinal ? marcador.penaltis : penaltis)?.local} – {(alFinal ? marcador.penaltis : penaltis)?.visitante}
        </p>
      )}

      <div className="velocidades" role="group" aria-label="Velocidad de reproducción">
        {VELOCIDADES.map((v) => (
          <button key={v} type="button" className={v === velocidad ? '' : 'secundario'} aria-pressed={v === velocidad} onClick={() => elegirVelocidad(v)}>
            x{v}
          </button>
        ))}
        {enPausa && !alFinal && (
          <button type="button" onClick={seguir}>
            Seguir
          </button>
        )}
      </div>
      {!alFinal && <BotonFinalizar finalizar={finalizar} desactivado={finalizando} />}

      {miLado && !alFinal && (
        <PanelCambios
          alineacion={inicio.alineaciones[miLado]}
          enCampo={estadoJugadores(inicio.alineaciones[miLado], todosLosEventos, miLado).enCampo}
          noDisponibles={estadoJugadores(inicio.alineaciones[miLado], todosLosEventos, miLado).fuera}
          enviar={enviarDecision}
          aviso={avisoCambios}
        />
      )}

      {avisoRival && !alFinal && (
        <p className="nota" role="status">
          {avisoRival}
        </p>
      )}

      <section aria-label="Eventos del partido">
        <h2>{alFinal ? 'Resumen del partido' : 'Lo que ha pasado'}</h2>
        <ResumenEventos eventos={alFinal ? fin.eventos : eventosVistos} nombre={nombre} nombresEquipo={nombresEquipo} />
      </section>

      {alFinal && (
        <>
          {fin.estadisticas !== undefined && fin.estadisticas !== null && (
            <section aria-label="Estadísticas">
              <h2>Estadísticas</h2>
              <Estadisticas datos={fin.estadisticas as never} nombres={nombresEquipo} />
            </section>
          )}
          <p className="acciones">
            <BotonAvanzar situacion="fin_partido" onAvanzar={() => navegar(`/partidas/${partidaId}/torneo`)} />
            <Link className="boton secundario" to={`/partidas/${partidaId}/alineacion`}>
              Volver a mi equipo
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
