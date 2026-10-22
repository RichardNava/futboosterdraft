import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, ErrorApi, revelarResultado, siguienteJornada, simularResto } from '../api/cliente';
import { TarjetaPreparacion, usePreparacionPartido } from '../componentes/AvisoPartido';
import { BarraPrincipal } from '../componentes/BarraPrincipal';
import { BandejaAvisos } from '../componentes/BandejaAvisos';
import { BotonAvanzar } from '../componentes/BotonAvanzar';
import { useConexion, useCuentaAtras } from '../conexion/useConexion';
import { etiquetaNPC } from '../textos/niveles';
import { PantallaCampeon } from './PantallaCampeon';
import { PantallaDerrota } from './PantallaDerrota';
import { PantallaCargando } from '../componentes/Esqueleto';
import { PantallaError } from '../componentes/Aviso';
import { Aviso } from '../componentes/Aviso';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { Icono } from '../componentes/Icono';
import { Insignia } from '../componentes/Insignia';
import { NombreRecortado } from '../componentes/NombreRecortado';
import { alTeclaPestanas } from '../componentes/pestanas';

type Ref = { id: string; nombre: string; nivelNPC?: string | null } | null;
type Marcador = { local: number; visitante: number; penaltis?: { local: number; visitante: number } } | null;

interface PartidoVista {
  partidoId: string | null;
  local: Ref;
  visitante: Ref;
  marcador: Marcador;
  /** `pendiente_de_ver`: partido propio entre humanos que aún no has visto (spec 002, FR-030). */
  estado: string;
  resueltoAutomaticamente: boolean;
  /** `duelos` en los cruces del modo Duelo de jugadores (spec 005). */
  tipo?: 'futbol' | 'duelos';
}

interface JornadaVista {
  numero: number;
  tipo: string;
  estado: 'pendiente' | 'abierta' | 'cerrada';
  abreEn: string | null;
  venceEn: string | null;
  descansa: Ref;
  partidos: PartidoVista[];
}

interface FilaClasificacion {
  posicion: number;
  participanteId: string;
  nombre: string;
  nivelNPC?: string | null;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
}

interface VistaTorneo {
  modo: 'liga' | 'playoff' | 'mixto' | 'duelos';
  fase: 'liga' | 'eliminatoria' | null;
  jornadaActual: number | null;
  jornadas: JornadaVista[];
  clasificacion: FilaClasificacion[];
  cuadro: { rondas: { tipo: string; cruces: { local: Ref; visitante: Ref; ganador: Ref }[] }[] } | null;
  campeon: Ref;
  pendientesDeVer: string[];
  siguienteJornada: 'manual' | 'automatica';
  goleadores?: FilaGoleador[];
  asistentes?: FilaGoleador[];
  /** Spec 003, US10 (data-model §8.2). */
  miEliminacion?: { fase: string; etiqueta: string } | null;
  puedeSimularResto?: boolean;
  pantallas?: { derrotaVista: boolean; campeonVisto: boolean };
}

interface FilaGoleador {
  posicion: number;
  jugador: { id: number; nombre: string; apellidos: string; dorsal?: number };
  equipo: { id: string; nombre: string };
  total: number;
  partidosJugados: number;
}

interface ResumenPartida {
  conPlazos: boolean;
  miParticipanteId: string | null;
}

type Pestana = 'clasificacion' | 'cuadro' | 'goleadores' | 'asistentes' | 'calendario';

const ETIQUETA_RONDA: Record<string, string> = {
  liga: 'Jornada',
  octavos: 'Octavos de final',
  cuartos: 'Cuartos de final',
  semifinal: 'Semifinales',
  final: 'Final',
};

const tituloJornada = (j: JornadaVista) => (j.tipo === 'liga' ? `Jornada ${j.numero}` : (ETIQUETA_RONDA[j.tipo] ?? j.tipo));

function textoMarcador(m: Marcador, tipo?: string): string {
  if (!m) return '–';
  // En un cruce de duelos, los duelos ganados (spec 005, contracts/ui.md): «Duelos 7–4».
  if (tipo === 'duelos') return `Duelos ${m.local}–${m.visitante}`;
  return `${m.local} – ${m.visitante}${m.penaltis ? ` (${m.penaltis.local}–${m.penaltis.visitante} pen.)` : ''}`;
}

/** Ruta para ver un partido (o un cruce de duelos) ya resuelto. */
const rutaVer = (partidaId: string, p: Pick<PartidoVista, 'partidoId' | 'tipo'>, reproduccion: boolean) =>
  p.tipo === 'duelos' ? `/partidas/${partidaId}/duelos/${p.partidoId}` : `/partidas/${partidaId}/${reproduccion ? 'reproduccion' : 'partido'}/${p.partidoId}`;

/** Pantalla del torneo (T116): clasificación, cuadro, calendario, jornada actual y campeón. */
export function Torneo() {
  const { partidaId } = useParams();
  const navegar = useNavigate();
  const [vista, setVista] = useState<VistaTorneo | null>(null);
  const [partida, setPartida] = useState<ResumenPartida | null>(null);
  const [pestana, setPestana] = useState<Pestana | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avisosNuevos, setAvisosNuevos] = useState(0);
  const preparacion = usePreparacionPartido(partidaId ?? '');
  // Pantallas de final de torneo (spec 003, FR-039 a FR-041b): qué se ha cerrado o pedido en esta visita.
  const [derrotaCerrada, setDerrotaCerrada] = useState(false);
  const [verCampeon, setVerCampeon] = useState(false);

  const cargar = useCallback(() => {
    Promise.all([api<VistaTorneo>(`/api/partidas/${partidaId}/torneo`), api<ResumenPartida>(`/api/partidas/${partidaId}`)])
      .then(([t, p]) => {
        setVista(t);
        setPartida(p);
      })
      .catch((e: unknown) => setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar el torneo'));
  }, [partidaId]);

  useEffect(cargar, [cargar]);

  const { conexion } = useConexion(partidaId, (m) => {
    if (m.t === 'torneo.actualizado') {
      const { t: _t, ...resto } = m;
      setVista(resto as unknown as VistaTorneo);
    } else if (m.t === 'aviso') setAvisosNuevos((n) => n + 1);
    else if (m.t === 'partido.fin') cargar();
  });

  const actual = vista?.jornadas.find((j) => j.numero === vista.jornadaActual) ?? null;
  const restante = useCuentaAtras(partida?.conPlazos ? actual?.venceEn : null, conexion);

  if (error) return <PantallaError mensaje={error} />;
  if (!vista || !partida) return <PantallaCargando forma="filas" texto="Cargando el torneo…" />;

  const pestanas: { id: Pestana; texto: string }[] = [
    ...(vista.modo !== 'playoff' ? [{ id: 'clasificacion' as const, texto: 'Clasificación' }] : []),
    ...(vista.cuadro ? [{ id: 'cuadro' as const, texto: 'Cuadro' }] : []),
    { id: 'goleadores', texto: 'Máximos goleadores' },
    { id: 'asistentes', texto: 'Máximos asistentes' },
    { id: 'calendario', texto: 'Calendario' },
  ];
  const activa = pestana ?? (vista.fase === 'eliminatoria' && vista.cuadro ? 'cuadro' : pestanas[0]!.id);
  const yo = partida.miParticipanteId;

  // Derrota: mientras no se haya visto o mientras se pueda simular el resto; campeón: hasta verlo. Si aplican las
  // dos (se perdió la final), primero la derrota y, con «Ver campeón», la del campeón.
  const pantallas = vista.pantallas ?? { derrotaVista: true, campeonVisto: true };
  const mostrarDerrota = !!vista.miEliminacion && !derrotaCerrada && !verCampeon && (!pantallas.derrotaVista || !!vista.puedeSimularResto);
  if (mostrarDerrota && vista.miEliminacion) {
    const refs = [...vista.jornadas.flatMap((j) => j.partidos.flatMap((p) => [p.local, p.visitante])), ...vista.clasificacion.map((f) => ({ id: f.participanteId, nombre: f.nombre }))];
    const miEquipo = refs.find((r) => r?.id === yo)?.nombre ?? 'Tu equipo';
    return (
      <PantallaDerrota
        partidaId={partidaId!}
        equipo={miEquipo}
        fase={vista.miEliminacion.etiqueta}
        puedeSimularResto={!!vista.puedeSimularResto}
        torneoTerminado={!!vista.campeon}
        onSimularResto={async () => {
          await simularResto(partidaId!);
          setVerCampeon(true);
          cargar();
        }}
        onVerTorneo={() => setDerrotaCerrada(true)}
        onVerCampeon={() => setVerCampeon(true)}
        onVolverAlMenu={() => navegar('/')}
      />
    );
  }
  if (vista.campeon && (verCampeon || !pantallas.campeonVisto)) {
    return <PantallaCampeon partidaId={partidaId!} campeon={vista.campeon.nombre} onVolverAlMenu={() => navegar('/')} />;
  }
  const miPartido = actual?.partidos.find((p) => p.local?.id === yo || p.visitante?.id === yo);
  // Partidos propios entre humanos ya jugados que aún no ha visto (de cualquier jornada; spec 002, FR-030).
  const pendientes = vista.jornadas.flatMap((j) => j.partidos).filter((p) => p.partidoId !== null && vista.pendientesDeVer.includes(p.partidoId));

  // Modo duelos (spec 005, contracts/ui.md): «Ver duelos» en el cruce propio pendiente de ver; si aún espera al once,
  // ir a confirmarlo.
  const cruceSinVer = pendientes.find((p) => p.tipo === 'duelos');
  const accionDuelos = cruceSinVer
    ? { etiqueta: 'Ver duelos', onClick: () => navegar(`/partidas/${partidaId}/duelos/${cruceSinVer.partidoId}`) }
    : miPartido?.estado === 'programado'
      ? { etiqueta: 'Confirmar mi once', onClick: () => navegar(`/partidas/${partidaId}/alineacion`) }
      : null;

  const finJornada = !vista.campeon && !actual?.estado.startsWith('abierta') && vista.siguienteJornada === 'manual' && vista.jornadaActual !== null;

  const mostrarResultado = async (partidoId: string) => {
    setError(null);
    try {
      await revelarResultado(partidoId);
      cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo mostrar el resultado');
    }
  };

  return (
    <main className="pantalla torneo">
      <header className="cabecera-fila">
        <h1>Torneo</h1>
        <nav className="acciones">
          <Link className="boton secundario" to={`/partidas/${partidaId}/alineacion`}>
            Mi alineación
          </Link>
          <Link className="boton secundario" to={`/partidas/${partidaId}/plantillas`}>
            Plantillas
          </Link>
          <BandejaAvisos actualizar={avisosNuevos} />
        </nav>
      </header>
      {preparacion && vista.modo !== 'duelos' && <TarjetaPreparacion preparacion={preparacion} />}

      {vista.campeon && (
        <div className="campeon" role="status">
          <Icono nombre="trofeo" etiqueta="Trofeo" tamano={28} />
          <p>
            Campeón: <strong>{vista.campeon.nombre}</strong>
            {vista.campeon.id === yo && ' — ¡enhorabuena!'}
          </p>
        </div>
      )}

      {finJornada && (
        <Aviso tipo="informacion">
          <p>Jornada terminada.</p>
        </Aviso>
      )}

      {pendientes.length > 0 ? (
        <section aria-label="Partidos pendientes de ver" className="jornada-actual">
          <h2>
            Pendientes de ver <Insignia texto={pendientes.length === 1 ? '1 partido sin ver' : `${pendientes.length} partidos sin ver`} />
          </h2>
          <ul className="lista-partidos pendientes-de-ver">
            {pendientes.map((p) => (
              <li key={p.partidoId}>
                <span>
                  <strong>{p.local?.nombre}</strong> – <strong>{p.visitante?.nombre}</strong>
                </span>
                <PendienteDeVer partidaId={partidaId!} partido={p} onMostrar={(id) => void mostrarResultado(id)} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        partida.conPlazos &&
        actual?.partidos.some((p) => p.estado === 'finalizado') && (
          <section aria-label="Partidos pendientes de ver" className="jornada-actual">
            <EstadoVacio
              mensaje="Has visto todos los partidos de esta jornada."
              accion={
                vista.modo !== 'playoff' && (
                  <button type="button" className="secundario" onClick={() => setPestana('clasificacion')}>
                    Ver clasificación
                  </button>
                )
              }
            />
          </section>
        )
      )}

      {actual && (
        <section aria-label="Jornada actual" className="jornada-actual">
          <h2>
            {tituloJornada(actual)} <Insignia texto={actual.estado === 'cerrada' ? 'Jugada' : actual.estado === 'abierta' ? 'En juego' : 'Pendiente'} suave />
          </h2>
          {partida.conPlazos && actual.venceEn && (
            <p className="nota">
              Plazo: hasta el {new Date(actual.venceEn).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
              {restante !== null && ` (quedan ${Math.floor(restante / 3600)} h ${Math.floor((restante % 3600) / 60)} min)`}. Al vencer, los partidos pendientes se
              simulan automáticamente.
            </p>
          )}
          {miPartido && (
            <div className="mi-partido">
              <span>
                Tu partido: <strong>{miPartido.local?.nombre}</strong> – <strong>{miPartido.visitante?.nombre}</strong>
              </span>
              {miPartido.estado !== 'programado' && miPartido.estado !== 'finalizado' && miPartido.partidoId && (
                <Link className="boton secundario" to={`/partidas/${partidaId}/partido/${miPartido.partidoId}`}>
                  Ir al partido
                </Link>
              )}
            </div>
          )}
          {!miPartido && actual.descansa?.id === yo && <p className="nota">Descansas en esta jornada.</p>}
          {vista.siguienteJornada === 'automatica' && miPartido && miPartido.estado !== 'programado' && actual.partidos.some((p) => p.estado === 'programado') && (
            <p className="nota">
              Esperando a que se jueguen los demás partidos
              {actual.venceEn && ` (vence el ${new Date(actual.venceEn).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })})`}.
            </p>
          )}
        </section>
      )}

      <div className="pestanas" role="tablist" aria-label="Datos del torneo" onKeyDown={alTeclaPestanas}>
        {pestanas.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={activa === p.id} tabIndex={activa === p.id ? 0 : -1} onClick={() => setPestana(p.id)}>
            {p.texto}
          </button>
        ))}
      </div>

      {activa === 'clasificacion' && <Clasificacion filas={vista.clasificacion} yo={yo} />}
      {activa === 'clasificacion' && vista.pendientesDeVer.length > 0 && (
        <p className="nota">
          No incluye {vista.pendientesDeVer.length === 1 ? '1 partido pendiente de ver' : `${vista.pendientesDeVer.length} partidos pendientes de ver`}.
        </p>
      )}
      {activa === 'cuadro' && vista.cuadro && <Cuadro cuadro={vista.cuadro} yo={yo} />}
      {(activa === 'goleadores' || activa === 'asistentes') && (
        <TablaGoleadores
          key={activa}
          cual={activa}
          filas={(activa === 'goleadores' ? vista.goleadores : vista.asistentes) ?? []}
          partidaId={partidaId!}
          yo={yo}
          pendientes={vista.pendientesDeVer.length}
        />
      )}
      {activa === 'calendario' && <Calendario jornadas={vista.jornadas} partidaId={partidaId!} yo={yo} />}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {/* La barra, hija directa de la pantalla para que `position: sticky` la mantenga a la vista (FR-006). */}
      {vista.campeon ? (
        <BotonAvanzar situacion="fin_torneo" onAvanzar={() => navegar('/')} />
      ) : vista.modo === 'duelos' && accionDuelos ? (
        <BarraPrincipal principal={accionDuelos} />
      ) : preparacion && vista.modo !== 'duelos' ? (
        <BarraPrincipal principal={preparacion.accion} />
      ) : (
        finJornada && (
          <BotonAvanzar
            situacion="fin_jornada"
            onAvanzar={async () => {
              await siguienteJornada(partidaId!);
              cargar();
            }}
          />
        )
      )}
    </main>
  );
}

/**
 * Máximos goleadores o asistentes (FR-039 a FR-042): Pos, Jugador (dorsal y nombre), Equipo, Goles o
 * Asistencias y PJ; 10 filas y «Ver todos».
 */
function TablaGoleadores({ cual, filas, partidaId, yo, pendientes }: { cual: 'goleadores' | 'asistentes'; filas: FilaGoleador[]; partidaId: string; yo: string | null; pendientes: number }) {
  const [todas, setTodas] = useState<FilaGoleador[] | null>(null);
  const verTodos = () =>
    api<{ filas: FilaGoleador[] }>(`/api/partidas/${partidaId}/torneo/${cual}?todos=true`)
      .then((r) => setTodas(r.filas))
      .catch(() => undefined);
  const mostradas = todas ?? filas;
  const columna = cual === 'goleadores' ? 'Goles' : 'Asistencias';
  if (filas.length === 0) return <p className="nota">{cual === 'goleadores' ? 'Todavía no ha marcado nadie.' : 'Todavía no hay asistencias.'}</p>;
  return (
    <>
      <div className="tabla-desplazable" tabIndex={0} aria-label={`${cual === 'goleadores' ? 'Máximos goleadores' : 'Máximos asistentes'} (se desplaza en horizontal)`}>
      <table className="tabla clasificacion goleadores">
        <caption className="nota">{cual === 'goleadores' ? 'Máximos goleadores' : 'Máximos asistentes'}</caption>
        <thead>
          <tr>
            <th scope="col">Pos</th>
            <th scope="col" className="col-texto">Jugador</th>
            <th scope="col" className="col-texto">Equipo</th>
            <th scope="col">{columna}</th>
            <th scope="col" title="Partidos jugados">PJ</th>
          </tr>
        </thead>
        <tbody>
          {mostradas.map((f) => (
            <tr key={`${f.equipo.id}-${f.jugador.id}`} className={f.equipo.id === yo ? 'propia fila-propia' : undefined}>
              <td>{f.posicion}</td>
              <th scope="row">
                {f.jugador.dorsal !== undefined && <span className="dorsal-tabla">{f.jugador.dorsal}</span>} {f.jugador.nombre} {f.jugador.apellidos}
              </th>
              <td className="col-texto">
                <NombreRecortado texto={f.equipo.nombre} />
              </td>
              <td>
                <strong>{f.total}</strong>
              </td>
              <td>{f.partidosJugados}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {!todas && filas.length >= 10 && (
        <button type="button" className="secundario" onClick={() => void verTodos()}>
          Ver todos
        </button>
      )}
      {pendientes > 0 && <p className="nota">No incluye {pendientes === 1 ? '1 partido pendiente de ver' : `${pendientes} partidos pendientes de ver`}.</p>}
    </>
  );
}

function Clasificacion({ filas, yo }: { filas: FilaClasificacion[]; yo: string | null }) {
  return (
    <div className="tabla-desplazable" tabIndex={0} aria-label="Clasificación de la liga (se desplaza en horizontal)">
    <table className="tabla clasificacion">
      <caption className="nota">Clasificación de la liga</caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col" className="col-texto">Equipo</th>
          <th scope="col" title="Partidos jugados">PJ</th>
          <th scope="col" title="Ganados">G</th>
          <th scope="col" title="Empatados">E</th>
          <th scope="col" title="Perdidos">P</th>
          <th scope="col" title="Goles a favor">GF</th>
          <th scope="col" title="Goles en contra">GC</th>
          <th scope="col" title="Diferencia de goles">DG</th>
          <th scope="col" title="Puntos">Pts</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.participanteId} className={f.participanteId === yo ? 'propia fila-propia' : undefined}>
            <td>{f.posicion}</td>
            <th scope="row">
              <span className="celda-equipo">
                <NombreRecortado texto={f.nombre} />
                {f.nivelNPC && <span className="etiqueta nivel-npc">{etiquetaNPC(f.nivelNPC)}</span>}
              </span>
            </th>
            <td>{f.pj}</td>
            <td>{f.g}</td>
            <td>{f.e}</td>
            <td>{f.p}</td>
            <td>{f.gf}</td>
            <td>{f.gc}</td>
            <td>{f.dg > 0 ? `+${f.dg}` : f.dg}</td>
            <td>
              <strong>{f.pts}</strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

function Cuadro({ cuadro, yo }: { cuadro: NonNullable<VistaTorneo['cuadro']>; yo: string | null }) {
  const equipo = (r: Ref, ganador: Ref) => (
    <span className={[r && ganador?.id === r.id ? 'ganador' : '', r?.id === yo ? 'propio' : ''].filter(Boolean).join(' ')}>
      <NombreRecortado texto={r?.nombre ?? 'Por decidir'} />
      {r?.nivelNPC && <span className="etiqueta nivel-npc">{etiquetaNPC(r.nivelNPC)}</span>}
    </span>
  );
  return (
    <div className="cuadro" role="region" tabIndex={0} aria-label="Cuadro de eliminatorias">
      {cuadro.rondas.map((ronda) => (
        <section key={ronda.tipo} className="ronda">
          <h3>{ETIQUETA_RONDA[ronda.tipo] ?? ronda.tipo}</h3>
          {ronda.cruces.map((x, i) => (
            <div key={i} className="cruce">
              {equipo(x.local, x.ganador)}
              {equipo(x.visitante, x.ganador)}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function Calendario({ jornadas, partidaId, yo }: { jornadas: JornadaVista[]; partidaId: string; yo: string | null }) {
  return (
    <div className="calendario">
      {jornadas.map((j) => (
        <section key={j.numero} aria-label={tituloJornada(j)}>
          <h3>
            {tituloJornada(j)} <Insignia texto={j.estado === 'cerrada' ? 'Jugada' : j.estado === 'abierta' ? 'En juego' : 'Pendiente'} suave />
          </h3>
          <ul className="lista-partidos">
            {j.partidos.map((p, i) => (
              <li key={p.partidoId ?? i} className={p.local?.id === yo || p.visitante?.id === yo ? 'propio' : ''}>
                <NombreRecortado texto={p.local?.nombre ?? 'Por decidir'} />
                <span className="resultado-partido">
                  {p.estado === 'finalizado' && p.partidoId ? (
                    <Link to={rutaVer(partidaId, p, false)}>{textoMarcador(p.marcador, p.tipo)}</Link>
                  ) : p.estado === 'pendiente_de_ver' && p.partidoId ? (
                    <Link to={rutaVer(partidaId, p, true)}>Pendiente de ver</Link>
                  ) : (
                    textoMarcador(null)
                  )}
                </span>
                <NombreRecortado texto={p.visitante?.nombre ?? 'Por decidir'} className="derecha" />
                {p.resueltoAutomaticamente && <span className="etiqueta" title="Simulado al vencer el plazo">Auto</span>}
              </li>
            ))}
          </ul>
          {j.descansa && <p className="nota">Descansa: {j.descansa.nombre}</p>}
        </section>
      ))}
    </div>
  );
}

/** Partido propio entre humanos ya jugado que aún no has visto: verlo o mostrar el resultado sin verlo. */
function PendienteDeVer({ partidaId, partido, onMostrar }: { partidaId: string; partido: PartidoVista; onMostrar: (partidoId: string) => void }) {
  const navegar = useNavigate();
  const partidoId = partido.partidoId!;
  return (
    <>
      <Insignia texto="Pendiente de ver" suave />
      <button type="button" className="secundario" onClick={() => navegar(rutaVer(partidaId, partido, true))}>
        {partido.tipo === 'duelos' ? 'Ver duelos' : 'Ver partido'}
      </button>
      <button type="button" className="secundario" onClick={() => onMostrar(partidoId)}>
        Mostrar resultado
      </button>
    </>
  );
}
