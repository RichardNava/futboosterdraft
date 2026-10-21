import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { coloresDe } from '../componentes/colores';
import { useParams } from 'react-router';
import { jugadoresDe, Lienzo2D, type Superposicion } from '../campo2d/Lienzo2D';
import { RelojReproduccion, VELOCIDADES, type EstadoReloj, type Velocidad } from '../campo2d/relojReproduccion';
import { datosVacios, incorporarTramo, type TramoRecibido } from '../campo2d/tramos';
import { AvisoDorsales } from '../componentes/AvisoDorsales';
import { BarraPrincipal, type AccionBarra } from '../componentes/BarraPrincipal';
import { estadoEquipoEnPartido, type DecisionAplicada } from '../componentes/estadoEquipoEnPartido';
import { GestionEquipo, type DecisionGestion } from '../componentes/GestionEquipo';
import { Chapa, GoleadoresFranja } from '../componentes/Marcador';
import { goleadoresDe } from '../componentes/goleadores';
import { NombreRecortado } from '../componentes/NombreRecortado';
import { ResultadoPartido } from '../componentes/ResultadoPartido';
import { ResumenEventos, type EventoVista } from '../componentes/ResumenEventos';
import { useConexion } from '../conexion/useConexion';
import { ETIQUETA_FASE, type Inicio, type Marcador } from './PartidoRapido';
import { PantallaCargando } from '../componentes/Esqueleto';

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
  gol: '¡Gol!',
  descanso: 'Descanso',
  pre_prorroga: 'Final del tiempo reglamentario: habrá prórroga',
  cargando: 'Cargando…',
  fin: 'Final del partido',
};

const movimientoReducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Partido 2D en directo contra un NPC (002/FR-021 a FR-025b; research R6): el campo con los jugadores, las
 * velocidades x2, x4 y x8 (solo del cliente; se recuerda la última), las pausas anunciadas («¡Gol!»,
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

  if (!inicio) return <PantallaCargando forma="campo" texto={conectada ? 'Esperando el inicio del partido…' : 'Conectando…'} />;

  const miLado = miId === inicio.local.id ? 'local' : miId === inicio.visitante.id ? 'visitante' : null;
  const nombresEquipo = { local: inicio.local.nombre, visitante: inicio.visitante.nombre };
  const nombre = (id: number) => {
    const j = jugadores.get(id);
    return j ? `${j.dorsal ? `${j.dorsal}. ` : ''}${j.nombre}` : String(id);
  };
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
        local={{ nombre: inicio.local.nombre, color: coloresDe(inicio.equipaciones.local).principal }}
        visitante={{ nombre: inicio.visitante.nombre, color: coloresDe(inicio.equipaciones.visitante).principal }}
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
    const estadoEquipo = estadoEquipoEnPartido(inicio.alineaciones[miLado], eventosVistos, miLado, tick, aplicadas, fase === 'pre_prorroga' || fase === 'prorroga');
    const jugadoresPropios = new Map([...inicio.alineaciones[miLado].titulares.map((t) => t.jugador), ...inicio.alineaciones[miLado].suplentes].map((j) => [j.id, j]));
    return (
      <GestionEquipo
        estado={estadoEquipo}
        jugadores={jugadoresPropios}
        dorsales={inicio.dorsales as Record<number, number>}
        colores={coloresDe(inicio.equipaciones[miLado])}
        enviar={enviarLote}
        onCerrar={cerrarGestion}
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
            <Chapa color={coloresDe(inicio.equipaciones.local).principal} />
            <NombreRecortado texto={inicio.local.nombre} />
            <span className="goles-2d">
              {marcador.local} – {marcador.visitante}
            </span>
            <NombreRecortado texto={inicio.visitante.nombre} />
            <Chapa color={coloresDe(inicio.equipaciones.visitante).principal} />
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
          local={{ nombre: inicio.local.nombre, color: coloresDe(inicio.equipaciones.local).principal }}
          visitante={{ nombre: inicio.visitante.nombre, color: coloresDe(inicio.equipaciones.visitante).principal }}
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
        </div>
        <div className="partido-2d-lateral">
          <AvisoDorsales inicio={inicio} miId={miId} />
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
            <ResumenEventos eventos={eventosVistos} nombre={nombre} nombresEquipo={nombresEquipo} />
          </section>
        </div>
      </div>

      <BarraPrincipal principal={principal} principalIzquierda={principalIzquierda} secundarios={secundarios} />
    </main>
  );
}
