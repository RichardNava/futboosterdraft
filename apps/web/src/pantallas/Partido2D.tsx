import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { coloresDe } from '../componentes/colores';
import { chapasDelPartido, equipoMarcador } from '../componentes/chapa';
import { useParams } from 'react-router';
import { jugadoresDe, Lienzo2D, type Superposicion } from '../campo2d/Lienzo2D';
import type { JugadorDibujo } from '../campo2d/renderizador';
import { RelojReproduccion, VELOCIDADES, type EstadoReloj, type Velocidad } from '../campo2d/relojReproduccion';
import { datosVacios, incorporarTramo, type TramoRecibido } from '../campo2d/tramos';
import { AvisoDorsales } from '../componentes/AvisoDorsales';
import { BarraPrincipal, type AccionBarra } from '../componentes/BarraPrincipal';
import { estadoEquipoEnPartido, type DecisionAplicada } from '../componentes/estadoEquipoEnPartido';
import { GestionEquipo, type DecisionGestion } from '../componentes/GestionEquipo';
import { Chapa, GoleadoresFranja } from '../componentes/Marcador';
import { Icono } from '../componentes/Icono';
import { goleadoresDe } from '../componentes/goleadores';
import { NombreRecortado } from '../componentes/NombreRecortado';
import { ResultadoPartido } from '../componentes/ResultadoPartido';
import { ResumenEventos, type EventoVista } from '../componentes/ResumenEventos';
import { useConexion } from '../conexion/useConexion';
import { ETIQUETA_FASE, type Inicio, type Marcador } from './PartidoRapido';
import { PantallaCargando } from '../componentes/Esqueleto';
import { CapaCelebracion } from '../componentes/celebraciones/CapaCelebracion';
import type { CelebracionElegida } from '../componentes/celebraciones/tipos';
import { efectoDeEvento, goleadorDe } from '../componentes/sonidosPartido';
import { reproducir } from '../sonido/sonido';
import { SelectorModoIncidencias } from '../componentes/SelectorModoIncidencias';
import { textoParada, type IncidenciaVista } from '../componentes/textoParada';
import type { ModoIncidencias } from '@fbd/domain';
import { CELEBRACION_DEL_JUEGO, DURACION_MAXIMA_CELEBRACION_JUEGO_MS } from '@fbd/domain';

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

// Sin rótulo de gol: lo sustituye la celebración (spec 012, ronda 2).
const AVISO: Partial<Record<EstadoReloj, string>> = {
  descanso: 'Descanso',
  pre_prorroga: 'Final del tiempo reglamentario: habrá prórroga',
  cargando: 'Cargando…',
  fin: 'Final del partido',
};

/** Segundos de juego que se ve el rótulo «Penalti» tras pitarlo (spec 005, FR-071). */
const TICKS_ROTULO_PENALTI = 90;

/** Defectos colectivos activos en lo ya visto (spec 005, FR-044): el último aviso de cada equipo y defecto manda. */
function malestarActivo(eventos: readonly EventoVista[]): { equipo: 'local' | 'visitante'; defecto: string; jugadorId: number }[] {
  const estado = new Map<string, { equipo: 'local' | 'visitante'; defecto: string; jugadorId: number } | null>();
  for (const e of eventos) {
    if (e.tipo !== 'malestar') continue;
    const clave = `${e.equipo}:${String(e.datos.defecto)}`;
    estado.set(clave, e.datos.activo ? { equipo: e.equipo, defecto: String(e.datos.defecto), jugadorId: Number(e.datos.jugadorId) } : null);
  }
  return [...estado.values()].filter((x): x is NonNullable<typeof x> => x !== null);
}

/** `partido.pausa_decision` con motivo `incidencia` o `gol` (spec 012, contracts/protocolo.md; ronda 2). */
interface DatosParada {
  motivo: 'incidencia' | 'gol';
  incidencias?: IncidenciaVista[];
  sustitucionesRestantes?: number;
}

const TEXTO_PARADA_GOL = 'Partido detenido tras el gol: lo que cambies se aplicará en el saque de centro.';

/** Si un `partido.inicio` anterior a la spec 012 no trae celebraciones: la del juego. */
const CELEBRACION_POR_DEFECTO: CelebracionElegida = { id: CELEBRACION_DEL_JUEGO, datos: { clase: 'juego', duracionMs: 2600 } };

const movimientoReducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Partido 2D en directo contra un NPC (002/FR-021 a FR-025b; research R6): el campo con los jugadores, las
 * velocidades x2, x4 y x8 (solo del cliente; se recuerda la última), las pausas anunciadas (cada gol, con su celebración;
 * descanso y antes de la prórroga, «Cargando…») y el feed de eventos hasta el minuto que se está viendo.
 *
 * Spec 003: «Gestionar equipo» (contra un NPC) detiene la reproducción y abre la gestión sobre el campo (US5); los
 * cambios confirmados con el balón en juego se aplican en la siguiente interrupción. «Finalizar partido» lleva a la
 * pantalla de resultado, sin campo (US6).
 */
export function Partido2D() {
  const { partidaId, partidoId } = useParams();
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
  const [gestion, setGestion] = useState(false);
  const [aplicadas, setAplicadas] = useState<DecisionAplicada[]>([]);
  const [avisoGestion, setAvisoGestion] = useState<string | null>(null);
  // Gol que se está celebrando (spec 012, FR-009): uno nuevo reemplaza al anterior.
  const [golCelebrado, setGolCelebrado] = useState<EventoVista | null>(null);
  const vistosOidos = useRef<number | null>(null);
  // Parada de «control total» (spec 012, FR-022): el reloj se detiene al llegar a su tick y se abre la gestión. En un
  // gol (ronda 2), después de la celebración.
  const [parada, setParada] = useState<{ motivo: DatosParada['motivo']; incidencias: IncidenciaVista[]; restantes: number; tick: number; abierta: boolean } | null>(null);
  const [modo, setModo] = useState<ModoIncidencias | null>(null);
  const datos = useRef(datosVacios());
  const enviarReproduccion = useRef<(tick: number, velocidad: Velocidad) => void>(() => undefined);
  // La pausa de cada gol dura lo que la celebración más larga, a cualquier velocidad (spec 012, ronda 2).
  const [reloj] = useState(() => new RelojReproduccion({ informar: (t, v) => enviarReproduccion.current(t, v), pausaGolMs: DURACION_MAXIMA_CELEBRACION_JUEGO_MS }));
  const [velocidad, setVelocidad] = useState<Velocidad>(reloj.velocidad);
  const sinRotulos = useMemo(movimientoReducido, []);

  const recibirParada = useCallback(
    (m: DatosParada) => {
      const incidencias = m.incidencias ?? [];
      if (m.motivo === 'incidencia' && incidencias.length === 0) return;
      // En un gol, el servidor se ha parado justo en él: el final de lo recibido.
      const tick = m.motivo === 'gol' ? reloj.limite : Math.max(...incidencias.map((i) => i.tick));
      setParada((actual) => ({
        motivo: m.motivo,
        incidencias,
        restantes: m.sustitucionesRestantes ?? 0,
        tick,
        abierta: actual?.abierta === true && actual.tick === tick,
      }));
    },
    [reloj],
  );

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
          setAplicadas((a) => [...a, { aplicadaEnTick: m.aplicadaEnTick as number, tipo: m.tipo as string, datos: m.datos as Record<string, unknown> }]);
          setPendientes((n) => Math.max(0, n - 1));
          setAplicacion({ tick: m.aplicadaEnTick as number, minuto: (m.minuto as string | undefined) ?? '' });
        } else {
          setAvisoRival(m.tipo === 'sustitucion' ? 'Tu rival ha hecho una sustitución.' : 'Tu rival ha hecho un cambio táctico.');
        }
        break;
      case 'partido.fin':
        setFin({ marcador: m.marcador as Marcador, eventos: m.eventos as EventoVista[], estadisticas: m.estadisticas });
        break;
      case 'partido.pausa_decision':
        if (m.motivo === 'incidencia' || m.motivo === 'gol') recibirParada(m as unknown as DatosParada);
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
    if (p.pausa?.motivo === 'incidencia' || p.pausa?.motivo === 'gol') recibirParada(p.pausa as unknown as DatosParada);
    const ts = p.dosD.tramos as Tramo[];
    setTramos(ts);
    datos.current = datosVacios();
    for (const t of ts) incorporarTramo(datos.current, reloj, t);
    reloj.situar(Math.max(reloj.tick, p.dosD.ultimoTickInformado ?? 0));
  }, [estado, partidoId, reloj, recibirParada]);

  const alAvanzar = useCallback(
    (t: number) => {
      setTick(t);
      setEstadoReloj(reloj.estado);
    },
    [reloj],
  );

  // Lo que se ve depende del tick que se está reproduciendo, no de lo ya simulado.
  const eventosVistos = useMemo(() => tramos.flatMap((t) => t.eventos).filter((e) => finalizando || e.tick <= tick), [tramos, tick, finalizando]);

  // Sonidos y celebración de lo que se acaba de ver (spec 012, FR-001 a FR-003 y FR-009). Lo visto al entrar o al
  // reconectar no suena; tras «Finalizar partido», tampoco (se ve todo de golpe).
  useEffect(() => {
    if (!inicio) return;
    const previos = vistosOidos.current;
    vistosOidos.current = eventosVistos.length;
    if (previos === null || finalizando || eventosVistos.length <= previos) return;
    const lado = miId === inicio.local.id ? 'local' : miId === inicio.visitante.id ? 'visitante' : null;
    for (const e of eventosVistos.slice(previos)) {
      const efecto = efectoDeEvento(e, lado, tramos.find((t) => t.eventos.includes(e as Tramo['eventos'][number]))?.fase);
      // A su velocidad natural: son grabaciones (spec 012, ronda 2).
      if (efecto) reproducir(efecto);
      if (e.tipo === 'gol') setGolCelebrado(e);
    }
    // Solo cuando cambia lo visto: la velocidad o los tramos nuevos no deben volver a sonar nada.
  }, [eventosVistos.length, inicio !== null]);

  // Al llegar la reproducción al lance de la parada: se detiene y se abre «Gestionar equipo» (una vez por parada). En
  // un gol, cuando acaban la pausa del reloj y la celebración.
  const celebrando = golCelebrado !== null || estadoReloj === 'gol';
  useEffect(() => {
    if (!parada || parada.abierta || tick < parada.tick || (parada.motivo === 'gol' && celebrando)) return;
    reloj.detener();
    setParada({ ...parada, abierta: true });
    setGestion(true);
  }, [parada, tick, reloj, celebrando]);

  const tramoActual = tramos.find((t) => t.hastaTick >= tick) ?? tramos.at(-1);
  const anterior = tramoActual ? tramos[tramos.indexOf(tramoActual) - 1] : undefined;
  const minuto = sumarMinutos(anterior?.minuto ?? "1'", Math.floor((tick - (tramoActual?.desdeTick ?? 0)) / 60));
  const goles = (lado: 'local' | 'visitante') => eventosVistos.filter((e) => e.tipo === 'gol' && e.equipo === lado).length;
  const alFinal = fin !== null && (estadoReloj === 'fin' || finalizando);
  const tanda = eventosVistos.filter((e) => e.tipo === 'tanda_lanzamiento').at(-1);
  const penaltis = tanda ? (tanda.datos.marcador as { local: number; visitante: number }) : null;
  const marcador: Marcador = alFinal ? fin.marcador : { local: goles('local'), visitante: goles('visitante') };
  const fase = alFinal ? 'finalizado' : (tramoActual?.fase ?? 'primera_parte');
  const ultimoPenalti = eventosVistos.findLast((e) => e.tipo === 'penalti');
  const rotuloPenalti = ultimoPenalti !== undefined && tick - ultimoPenalti.tick <= TICKS_ROTULO_PENALTI ? 'Penalti' : null;
  const aviso = (alFinal || estadoReloj !== 'fin' ? AVISO[estadoReloj] : null) ?? (estadoReloj === 'reproduciendo' ? rotuloPenalti : null);
  const malestar = malestarActivo(eventosVistos);

  const superposicion = useRef<Superposicion>({ marcador, minuto, aviso });
  superposicion.current = { marcador, minuto, aviso: estadoReloj === 'cargando' && tramos.length === 0 ? null : aviso };

  const jugadores = useMemo(() => (inicio ? jugadoresDe(inicio) : new Map<number, JugadorDibujo>()), [inicio]);

  if (!inicio) return <PantallaCargando forma="campo" texto={conectada ? 'Esperando el inicio del partido…' : 'Conectando…'} />;

  const miLado = miId === inicio.local.id ? 'local' : miId === inicio.visitante.id ? 'visitante' : null;
  const nombresEquipo = { local: inicio.local.nombre, visitante: inicio.visitante.nombre };
  const nombre = (id: number) => {
    const j = jugadores.get(id);
    return j ? `${j.dorsal ? `${j.dorsal}. ` : ''}${j.nombre}` : String(id);
  };
  const enPausa = estadoReloj === 'descanso' || estadoReloj === 'pre_prorroga';
  // Spec 008: quien lleva el balón en el tick que se ve (el de la última acción; tras un pase logrado, el receptor).
  const ultima = estadoReloj === 'reproduciendo' ? datos.current.acciones.findLast((a) => a.inicioTick <= tick) : undefined;
  const idPoseedor = ultima && (tick > ultima.finTick && ultima.exito && ultima.a !== undefined ? ultima.a : ultima.de);
  const poseedor = idPoseedor === undefined ? undefined : jugadores.get(idPoseedor);

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

  const finalizar = async () => {
    if (!conexion) throw new Error('Sin conexión');
    setFinalizando(true);
    const ack = await conexion.enviar({ t: 'partido.finalizar', partidoId: inicio.partidoId });
    if (!ack.ok) {
      setFinalizando(false);
      throw new Error(ack.error?.mensaje ?? 'No se pudo finalizar el partido');
    }
  };

  // Gestión del equipo (US5): detiene la reproducción en el tick actual; al cerrar, sigue desde ahí.
  const abrirGestion = () => {
    reloj.detener();
    setGestion(true);
  };
  const cerrarGestion = (aplicado: boolean) => {
    setGestion(false);
    reloj.seguirTrasGestion();
    // Tras la parada de incidencia, se sigue: lo que no se haya decidido se resuelve en automático (FR-023).
    if (parada?.abierta) {
      setParada(null);
      void conexion?.enviar({ t: 'partido.seguir', partidoId: inicio.partidoId }).catch(() => undefined);
    }
    if (aplicado) {
      setPendientes((n) => n + 1);
      setAplicacion(null);
      setAvisoGestion(enPausa ? 'Los cambios se aplicarán al reanudarse el partido.' : 'Los cambios se aplicarán en la próxima interrupción.');
    }
  };
  const enviarLote = (decisiones: DecisionGestion[]) => {
    if (!conexion) throw new Error('Sin conexión');
    return conexion.enviar({ t: 'partido.decisiones', partidoId: inicio.partidoId, decisiones });
  };

  if (alFinal) {
    return (
      <ResultadoPartido
        partidaId={partidaId!}
        local={equipoMarcador(inicio, 'local')}
        visitante={equipoMarcador(inicio, 'visitante')}
        marcador={fin.marcador}
        eventos={fin.eventos}
        estadisticas={fin.estadisticas}
        nombre={nombre}
      />
    );
  }

  const gestionDisponible = inicio.gestionDisponible === true && miLado !== null;
  if (gestion && miLado) {
    // Solo lo ya visto: eventos y decisiones hasta el tick de la reproducción (research R17).
    const lesionadosParada = new Set(parada?.abierta && parada.motivo === 'incidencia' ? parada.incidencias.filter((i) => i.motivo === 'lesion').map((i) => i.jugadorId) : []);
    const estadoEquipo = estadoEquipoEnPartido(inicio.alineaciones[miLado], eventosVistos, miLado, tick, aplicadas, fase === 'pre_prorroga' || fase === 'prorroga', lesionadosParada);
    const jugadoresPropios = new Map([...inicio.alineaciones[miLado].titulares.map((t) => t.jugador), ...inicio.alineaciones[miLado].suplentes].map((j) => [j.id, j]));
    return (
      <GestionEquipo
        estado={estadoEquipo}
        jugadores={jugadoresPropios}
        dorsales={inicio.dorsales as Record<number, number>}
        colores={coloresDe(inicio.equipaciones[miLado])}
        enviar={enviarLote}
        onCerrar={cerrarGestion}
        aviso={!parada?.abierta ? null : parada.motivo === 'gol' ? TEXTO_PARADA_GOL : textoParada(parada.incidencias, nombre, parada.restantes)}
      />
    );
  }

  const avisoCambios =
    avisoGestion && pendientes > 0
      ? avisoGestion
      : aplicacion && aplicacion.minuto
        ? tick < aplicacion.tick
          ? `Se aplicará en el minuto ${aplicacion.minuto}.`
          : `Tu cambio se aplicó en el minuto ${aplicacion.minuto}.`
        : null;

  // Botones (contracts/ui.md): en juego, «Finalizar partido» y «Gestionar equipo» de secundario; en el descanso y
  // antes de la prórroga, «Seguir» y, contra un NPC, «Gestionar equipo» con la misma importancia a su izquierda
  // (FR-006a); «Finalizar partido» de secundario.
  const accionGestion: AccionBarra = { etiqueta: 'Gestionar equipo', onClick: abrirGestion };
  const accionSeguir: AccionBarra = { etiqueta: 'Seguir', onClick: seguir };
  const accionFinalizar: AccionBarra = { etiqueta: 'Finalizar partido', onClick: finalizar, motivoDesactivado: finalizando ? 'Simulando el resto del partido…' : null };
  const principal = enPausa ? accionSeguir : accionFinalizar;
  const principalIzquierda = enPausa && gestionDisponible ? accionGestion : null;
  const secundarios = enPausa ? [accionFinalizar] : gestionDisponible ? [accionGestion] : [];

  return (
    <main className="pantalla partido partido-2d">
      <h1 className="solo-lectores">
        {inicio.local.nombre} contra {inicio.visitante.nombre}
      </h1>
      {/* Franja de 48 px fuera del campo: marcador, reloj y velocidades (spec 004, FR-020). */}
      <div className="franja-2d">
        <p className="marcador-2d" aria-live="polite">
          <span className="equipos-2d">
            <Chapa {...equipoMarcador(inicio, 'local')} lado="local" />
            <NombreRecortado texto={inicio.local.nombre} />
            <span className="goles-2d">
              {marcador.local} – {marcador.visitante}
            </span>
            <NombreRecortado texto={inicio.visitante.nombre} />
            <Chapa {...equipoMarcador(inicio, 'visitante')} lado="visitante" />
          </span>
          <span className="nota">
            {minuto} · {aviso ?? ETIQUETA_FASE[fase] ?? fase}
          </span>
        </p>
        <div className="velocidades segmentado" role="group" aria-label="Velocidad de reproducción">
          {VELOCIDADES.map((v) => (
            <button key={v} type="button" aria-pressed={v === velocidad} onClick={() => elegirVelocidad(v)}>
              x{v}
            </button>
          ))}
        </div>
        {/* Goleadores con su minuto, solo los goles ya vistos (ronda 4, FR-053). */}
        <GoleadoresFranja
          local={equipoMarcador(inicio, 'local')}
          visitante={equipoMarcador(inicio, 'visitante')}
          goleadores={goleadoresDe(eventosVistos, nombre)}
        />
      </div>
      {/* Campo y carril lateral a la medida de la ventana: sin desplazarse ni ampliar (FR-049). */}
      <div className="partido-2d-mesa">
        <div className="partido-2d-zona">
          <Lienzo2D
            inicio={inicio}
            reloj={reloj}
            datos={datos}
            superposicion={superposicion}
            alAvanzar={alAvanzar}
            sinRotulos={sinRotulos}
            etiqueta={`${inicio.local.nombre} ${marcador.local}, ${inicio.visitante.nombre} ${marcador.visitante}. Minuto ${minuto}. ${ETIQUETA_FASE[fase] ?? fase}.`}
          />
          {golCelebrado && (
            <CapaCelebracion
              key={`${golCelebrado.tick}-${golCelebrado.equipo}`}
              celebracion={inicio.celebraciones?.[golCelebrado.equipo] ?? CELEBRACION_POR_DEFECTO}
              equipo={equipoMarcador(inicio, golCelebrado.equipo)}
              goleador={goleadorDe(golCelebrado, nombre)}
              onFin={() => setGolCelebrado(null)}
            />
          )}
        </div>
        <div className="partido-2d-lateral">
          <AvisoDorsales inicio={inicio} miId={miId} />
          {/* Spec 012 (FR-020, FR-024): el modo de incidencias, solo contra un NPC. */}
          {gestionDisponible && (
            <SelectorModoIncidencias
              modo={modo ?? inicio.modoIncidencias ?? 'automatico'}
              onCambio={(m) => {
                setModo(m);
                void conexion?.enviar({ t: 'partido.modo_incidencias', partidoId: inicio.partidoId, modo: m }).catch(() => undefined);
              }}
            />
          )}
          {/* Avisos de malestar en el carril, no en la franja: su alto no debe mover el campo (spec 012, FR-018). */}
          {malestar.map((m) => (
            <p key={`${m.equipo}-${m.defecto}`} className="nota aviso-malestar" role="status">
              <Icono nombre="informacion" /> Malestar en {nombresEquipo[m.equipo]}: {nombre(m.jugadorId)} ({m.defecto === 'Polemico' ? 'Polémico' : m.defecto})
            </p>
          ))}
          {penaltis && (
            <p className="nota" aria-live="polite">
              Penaltis: {penaltis.local}-{penaltis.visitante}
            </p>
          )}

          {avisoCambios && (
            <p className="nota" role="status">
              {avisoCambios}
            </p>
          )}
          {avisoRival && (
            <p className="nota" role="status">
              {avisoRival}
            </p>
          )}

          <section aria-label="Eventos del partido">
            <h2>Lo que ha pasado</h2>
            <ResumenEventos eventos={eventosVistos} nombre={nombre} nombresEquipo={nombresEquipo}
              chapas={chapasDelPartido(inicio.equipaciones, inicio.escudos)}
            />
          </section>
        </div>
      </div>

      <BarraPrincipal
        principal={principal}
        principalIzquierda={principalIzquierda}
        secundarios={secundarios}
        estado={
          poseedor &&
          idPoseedor !== undefined && (
            <span className="poseedor-2d" aria-hidden="true">
              <Chapa {...equipoMarcador(inicio, poseedor.lado)} />
              {nombre(idPoseedor)}
            </span>
          )
        }
      />
    </main>
  );
}
