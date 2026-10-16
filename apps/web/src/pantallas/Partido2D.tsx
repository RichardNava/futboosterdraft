import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { posicionesEn, type Fotograma } from '../campo2d/interpolacion';
import { ANCHO, dibujar, LARGO, type JugadorDibujo } from '../campo2d/renderizador';
import { RelojReproduccion } from '../campo2d/relojReproduccion';
import { Estadisticas } from '../componentes/Estadisticas';
import { estadoJugadores, PanelCambios } from '../componentes/PanelCambios';
import { ResumenEventos, type EventoVista } from '../componentes/ResumenEventos';
import { useConexion } from '../conexion/useConexion';
import { ETIQUETA_FASE, type Inicio, type Marcador } from './PartidoRapido';

const VELOCIDADES = [2, 4, 8, 16, 32] as const;
type Velocidad = (typeof VELOCIDADES)[number];

interface Tramo {
  desdeTick: number;
  hastaTick: number;
  eventos: EventoVista[];
  marcador: Marcador;
  estadisticas: unknown;
  fase: string;
  minuto?: string;
  fotogramas?: Fotograma[];
}

/** Suma minutos al último número de un minuto mostrable ("67'" → "69'", "45+2'" → "45+3'"). */
function sumarMinutos(minuto: string, n: number): string {
  if (n <= 0) return minuto;
  return minuto.replace(/(\d+)'$/, (_, m: string) => `${Number(m) + n}'`);
}

const AVISO_FASE: Record<string, string> = {
  descanso: 'Descanso',
  pre_prorroga: 'Final del tiempo reglamentario: habrá prórroga',
  penaltis: 'Tanda de penaltis',
};

/**
 * Partido en simulación 2D (T138; FR-048 a FR-050): el campo con los jugadores, la velocidad (x2 … x32,
 * se reproduce a la menor de los dos humanos), los cambios en cualquier momento (se aplican en la
 * siguiente interrupción) y el feed de eventos hasta el minuto que se está viendo.
 */
export function Partido2D() {
  const { partidaId, partidoId } = useParams();
  const [inicio, setInicio] = useState<Inicio | null>(null);
  const [tramos, setTramos] = useState<Tramo[]>([]);
  const [tick, setTick] = useState(0);
  const [velocidadEfectiva, setVelocidadEfectiva] = useState<Velocidad>(4);
  const [miVelocidad, setMiVelocidad] = useState<Velocidad>(4);
  const [fin, setFin] = useState<{ marcador: Marcador; eventos: EventoVista[]; estadisticas: unknown } | null>(null);
  const [pendientes, setPendientes] = useState(0);
  const [aplicado, setAplicado] = useState<string | null>(null);
  const [avisoRival, setAvisoRival] = useState<string | null>(null);
  const [miId, setMiId] = useState<string | null>(null);
  const fotogramas = useRef<Fotograma[]>([]);
  const reloj = useRef<RelojReproduccion | null>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  const recibirTramo = useCallback((t: Tramo) => {
    setTramos((ts) => (ts.some((x) => x.desdeTick === t.desdeTick) ? ts : [...ts, t]));
    if (t.fotogramas?.length) {
      const ultimo = fotogramas.current.at(-1)?.tick ?? -1;
      fotogramas.current.push(...t.fotogramas.filter((f) => f.tick > ultimo));
    }
    reloj.current?.ampliar(t.hastaTick);
  }, []);

  const { conexion, estado, conectada } = useConexion(partidaId, (m) => {
    if (m.partidoId !== undefined && m.partidoId !== partidoId) return;
    switch (m.t) {
      case 'partido.inicio':
        setInicio(m as unknown as Inicio);
        break;
      case 'partido.tramo':
        recibirTramo(m as unknown as Tramo);
        break;
      case 'partido.velocidad':
        setVelocidadEfectiva(m.velocidadEfectiva as Velocidad);
        break;
      case 'partido.decision_aplicada':
        if (m.participanteId === miId) {
          setPendientes((n) => Math.max(0, n - 1));
          setAplicado('Tu cambio ya se ha aplicado.');
        } else {
          setAvisoRival(m.tipo === 'sustitucion' ? 'Tu rival ha hecho una sustitución.' : 'Tu rival ha hecho un cambio táctico.');
        }
        break;
      case 'partido.fin':
        setFin({ marcador: m.marcador as Marcador, eventos: m.eventos as EventoVista[], estadisticas: m.estadisticas });
        break;
    }
  });

  // El reloj de reproducción informa al servidor de por dónde va.
  useEffect(() => {
    if (!conexion || !partidoId) return;
    reloj.current = new RelojReproduccion((t) => conexion.enviarSinAck({ t: 'partido.reproduccion', partidoId, tick: t }));
    return () => {
      reloj.current = null;
    };
  }, [conexion, partidoId]);

  useEffect(() => {
    if (reloj.current) reloj.current.velocidad = velocidadEfectiva;
  }, [velocidadEfectiva]);

  // Instantánea al conectar o reconectar: tramos ya simulados y velocidad; se sigue desde el último tramo.
  useEffect(() => {
    if (!estado || estado.fase !== 'torneo') return;
    setMiId(estado.vista.partida.miParticipanteId);
    const p = estado.vista.partido;
    if (!p || p.inicio.partidoId !== partidoId || !p.dosD) return;
    setInicio(p.inicio);
    const ts = p.dosD.tramos as Tramo[];
    setTramos(ts);
    fotogramas.current = [...(ts.at(-1)?.fotogramas ?? [])];
    setVelocidadEfectiva(p.dosD.velocidadEfectiva);
    setMiVelocidad(p.dosD.miVelocidad);
    const r = reloj.current;
    if (r) {
      r.ampliar(p.dosD.objetivoTick);
      r.situar(Math.max(r.tick, ts.at(-1)?.desdeTick ?? 0));
    }
  }, [estado, partidoId]);

  const jugadores = useMemo(() => {
    const mapa = new Map<number, JugadorDibujo>();
    if (!inicio) return mapa;
    for (const lado of ['local', 'visitante'] as const) {
      const a = inicio.alineaciones[lado];
      for (const j of [...a.titulares.map((t) => t.jugador), ...a.suplentes]) {
        mapa.set(j.id, { lado, dorsal: inicio.dorsales[j.id] ?? null, nombre: j.apellidos.split(' ')[0] ?? j.nombre });
      }
    }
    return mapa;
  }, [inicio]);

  // Lo que se ve depende del tick que se está reproduciendo, no de lo ya simulado.
  const eventosVistos = useMemo(() => tramos.flatMap((t) => t.eventos).filter((e) => e.tick <= tick), [tramos, tick]);
  const tramoActual = tramos.find((t) => t.hastaTick >= tick) ?? tramos.at(-1);
  const anterior = tramoActual ? tramos[tramos.indexOf(tramoActual) - 1] : undefined;
  const minuto = sumarMinutos(anterior?.minuto ?? "1'", Math.floor((tick - (tramoActual?.desdeTick ?? 0)) / 60));
  const goles = (lado: 'local' | 'visitante') => eventosVistos.filter((e) => e.tipo === 'gol' && e.equipo === lado).length;
  const alFinal = fin !== null && tick >= (tramos.at(-1)?.hastaTick ?? 0);
  const marcador: Marcador = alFinal ? fin.marcador : { local: goles('local'), visitante: goles('visitante') };
  const enEspera = tramoActual !== undefined && tick >= tramoActual.hastaTick && !alFinal;
  const fase = alFinal ? 'finalizado' : enEspera ? tramoActual.fase : (tramoActual?.fase ?? 'primera_parte');
  const aviso = alFinal ? 'Final del partido' : enEspera ? (AVISO_FASE[tramoActual.fase] ?? 'Esperando al rival…') : null;

  // Animación a 60 fps; el estado de React (feed y marcador) se actualiza 4 veces por segundo.
  const escena = useRef({ jugadores, inicio, marcador, minuto, aviso });
  escena.current = { jugadores, inicio, marcador, minuto, aviso };
  useEffect(() => {
    let id = 0;
    let ultimaActualizacion = 0;
    const dibujarCuadro = (ahora: number) => {
      const r = reloj.current;
      const canvas = lienzo.current;
      const { inicio: ini, ...resto } = escena.current;
      if (r && canvas && ini) {
        const t = r.paso(ahora);
        const posiciones = posicionesEn(fotogramas.current, t);
        const ctx = canvas.getContext('2d');
        const ancho = canvas.clientWidth;
        if (ctx && posiciones && ancho > 0) {
          const ratio = window.devicePixelRatio || 1;
          const alto = (ancho * ANCHO) / LARGO;
          if (canvas.width !== Math.round(ancho * ratio)) {
            canvas.width = Math.round(ancho * ratio);
            canvas.height = Math.round(alto * ratio);
          }
          ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
          dibujar(ctx, ancho, {
            posiciones,
            jugadores: resto.jugadores,
            equipaciones: ini.equipaciones,
            marcador: resto.marcador,
            nombres: { local: ini.local.nombre, visitante: ini.visitante.nombre },
            minuto: resto.minuto,
            aviso: resto.aviso,
          });
        }
        if (ahora - ultimaActualizacion > 250) {
          ultimaActualizacion = ahora;
          setTick(t);
        }
      }
      id = requestAnimationFrame(dibujarCuadro);
    };
    id = requestAnimationFrame(dibujarCuadro);
    const alVolver = () => reloj.current?.reanudar();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  if (!inicio) return <p className="cargando">{conectada ? 'Esperando el inicio del partido…' : 'Conectando…'}</p>;

  const miLado = miId === inicio.local.id ? 'local' : miId === inicio.visitante.id ? 'visitante' : null;
  const nombresEquipo = { local: inicio.local.nombre, visitante: inicio.visitante.nombre };
  const nombre = (id: number) => {
    const j = jugadores.get(id);
    return j ? `${j.dorsal ? `${j.dorsal}. ` : ''}${j.nombre}` : String(id);
  };
  // Los cambios se validan contra lo ya simulado en el servidor, no contra lo que se está viendo.
  const todosLosEventos = tramos.flatMap((t) => t.eventos);

  const elegirVelocidad = (v: Velocidad) => {
    setMiVelocidad(v);
    conexion?.enviarSinAck({ t: 'partido.velocidad', partidoId: inicio.partidoId, velocidad: v });
  };

  const enviarDecision = async (tipo: 'sustitucion' | 'formacion' | 'tactica', datos: Record<string, unknown>) => {
    if (!conexion) throw new Error('Sin conexión');
    const ack = await conexion.enviar({ t: 'partido.decision', partidoId: inicio.partidoId, tipo, datos });
    if (ack.ok) {
      setPendientes((n) => n + 1);
      setAplicado(null);
    }
    return ack;
  };

  return (
    <main className="pantalla partido partido-2d">
      <h1 className="solo-lectores">
        {inicio.local.nombre} contra {inicio.visitante.nombre}
      </h1>
      <div ref={contenedor} className="campo-2d">
        <canvas
          ref={lienzo}
          role="img"
          aria-label={`${inicio.local.nombre} ${marcador.local}, ${inicio.visitante.nombre} ${marcador.visitante}. Minuto ${minuto}. ${ETIQUETA_FASE[fase] ?? fase}.`}
        />
      </div>
      {alFinal && marcador.penaltis && (
        <p className="nota" aria-live="polite">
          Penaltis: {marcador.penaltis.local} – {marcador.penaltis.visitante}
        </p>
      )}

      <div className="velocidades" role="group" aria-label="Velocidad de reproducción">
        {VELOCIDADES.map((v) => (
          <button key={v} type="button" className={v === miVelocidad ? '' : 'secundario'} aria-pressed={v === miVelocidad} onClick={() => elegirVelocidad(v)}>
            x{v}
          </button>
        ))}
        {velocidadEfectiva < miVelocidad && <span className="nota">Tu rival va más lento: se reproduce a x{velocidadEfectiva}.</span>}
      </div>

      {miLado && !alFinal && (
        <PanelCambios
          alineacion={inicio.alineaciones[miLado]}
          enCampo={estadoJugadores(inicio.alineaciones[miLado], todosLosEventos, miLado).enCampo}
          noDisponibles={estadoJugadores(inicio.alineaciones[miLado], todosLosEventos, miLado).fuera}
          enviar={enviarDecision}
          aviso={
            pendientes > 0
              ? `${pendientes === 1 ? 'Un cambio pendiente' : `${pendientes} cambios pendientes`} hasta la próxima interrupción del juego.`
              : (aplicado ?? 'Los cambios se aplican en la siguiente interrupción del juego.')
          }
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
          <p>
            <Link className="boton" to={`/partidas/${partidaId}/torneo`}>
              Ver el torneo
            </Link>{' '}
            <Link className="boton secundario" to={`/partidas/${partidaId}/alineacion`}>
              Volver a mi equipo
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
