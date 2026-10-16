import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, ErrorApi } from '../api/cliente';
import { AvisoPartido } from '../componentes/AvisoPartido';
import { BandejaAvisos } from '../componentes/BandejaAvisos';
import { useConexion, useCuentaAtras } from '../conexion/useConexion';
import { etiquetaNPC } from '../textos/niveles';

type Ref = { id: string; nombre: string; nivelNPC?: string | null } | null;
type Marcador = { local: number; visitante: number; penaltis?: { local: number; visitante: number } } | null;

interface PartidoVista {
  partidoId: string | null;
  local: Ref;
  visitante: Ref;
  marcador: Marcador;
  estado: string;
  resueltoAutomaticamente: boolean;
  listos: string[];
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
  modo: 'liga' | 'playoff' | 'mixto';
  fase: 'liga' | 'eliminatoria' | null;
  jornadaActual: number | null;
  jornadas: JornadaVista[];
  clasificacion: FilaClasificacion[];
  cuadro: { rondas: { tipo: string; cruces: { local: Ref; visitante: Ref; ganador: Ref }[] }[] } | null;
  campeon: Ref;
}

interface ResumenPartida {
  ritmo: 'directo' | 'asincrono';
  miParticipanteId: string | null;
}

type Pestana = 'clasificacion' | 'cuadro' | 'calendario';

const ETIQUETA_RONDA: Record<string, string> = {
  liga: 'Jornada',
  octavos: 'Octavos de final',
  cuartos: 'Cuartos de final',
  semifinal: 'Semifinales',
  final: 'Final',
};

const tituloJornada = (j: JornadaVista) => (j.tipo === 'liga' ? `Jornada ${j.numero}` : (ETIQUETA_RONDA[j.tipo] ?? j.tipo));

function textoMarcador(m: Marcador): string {
  if (!m) return '–';
  return `${m.local} – ${m.visitante}${m.penaltis ? ` (${m.penaltis.local}–${m.penaltis.visitante} pen.)` : ''}`;
}

/** Pantalla del torneo (T116): clasificación, cuadro, calendario, jornada actual y campeón. */
export function Torneo() {
  const { partidaId } = useParams();
  const [vista, setVista] = useState<VistaTorneo | null>(null);
  const [partida, setPartida] = useState<ResumenPartida | null>(null);
  const [pestana, setPestana] = useState<Pestana | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avisosNuevos, setAvisosNuevos] = useState(0);

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
  const restante = useCuentaAtras(partida?.ritmo === 'asincrono' ? actual?.venceEn : null, conexion);

  if (error) return <p className="error pantalla">{error}</p>;
  if (!vista || !partida) return <p className="cargando">Cargando torneo…</p>;

  const pestanas: { id: Pestana; texto: string }[] = [
    ...(vista.modo !== 'playoff' ? [{ id: 'clasificacion' as const, texto: 'Clasificación' }] : []),
    ...(vista.cuadro ? [{ id: 'cuadro' as const, texto: 'Cuadro' }] : []),
    { id: 'calendario', texto: 'Calendario' },
  ];
  const activa = pestana ?? (vista.fase === 'eliminatoria' && vista.cuadro ? 'cuadro' : pestanas[0]!.id);
  const yo = partida.miParticipanteId;
  const miPartido = actual?.partidos.find((p) => p.local?.id === yo || p.visitante?.id === yo);

  const marcarListo = async (partidoId: string) => {
    setError(null);
    try {
      await api(`/api/partidos/${partidoId}/listo`, { metodo: 'POST', idempotente: true });
      cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo marcar como listo');
    }
  };

  return (
    <main className="pantalla torneo">
      <header className="cabecera-fila">
        <h1>Torneo</h1>
        <nav className="acciones">
          <Link className="boton" to={`/partidas/${partidaId}/alineacion`}>
            Mi alineación
          </Link>
          <Link className="boton secundario" to={`/partidas/${partidaId}/plantillas`}>
            Plantillas
          </Link>
          <BandejaAvisos actualizar={avisosNuevos} />
        </nav>
      </header>
      {partidaId && <AvisoPartido partidaId={partidaId} />}

      {vista.campeon && (
        <p className="campeon" role="status">
          🏆 Campeón: <strong>{vista.campeon.nombre}</strong>
          {vista.campeon.id === yo && ' — ¡enhorabuena!'}
        </p>
      )}

      {actual && (
        <section aria-label="Jornada actual" className="jornada-actual">
          <h2>{tituloJornada(actual)}</h2>
          {partida.ritmo === 'asincrono' && actual.venceEn && (
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
              {partida.ritmo === 'asincrono' && miPartido.estado === 'programado' && miPartido.partidoId && (
                <>
                  <button type="button" disabled={yo !== null && miPartido.listos.includes(yo)} onClick={() => void marcarListo(miPartido.partidoId!)}>
                    Estoy listo
                  </button>
                  {yo !== null && miPartido.listos.includes(yo) && <span className="nota">Esperando a que tu rival esté listo…</span>}
                  {miPartido.listos.some((id) => id !== yo) && <span className="etiqueta">Tu rival está listo</span>}
                </>
              )}
              {miPartido.estado !== 'programado' && miPartido.estado !== 'finalizado' && miPartido.partidoId && (
                <Link className="boton" to={`/partidas/${partidaId}/partido/${miPartido.partidoId}`}>
                  Ir al partido
                </Link>
              )}
            </div>
          )}
          {!miPartido && actual.descansa?.id === yo && <p className="nota">Descansas en esta jornada.</p>}
        </section>
      )}

      <div className="pestanas" role="tablist">
        {pestanas.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={activa === p.id}
            className={activa === p.id ? '' : 'secundario'}
            onClick={() => setPestana(p.id)}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {activa === 'clasificacion' && <Clasificacion filas={vista.clasificacion} yo={yo} />}
      {activa === 'cuadro' && vista.cuadro && <Cuadro cuadro={vista.cuadro} yo={yo} />}
      {activa === 'calendario' && <Calendario jornadas={vista.jornadas} partidaId={partidaId!} yo={yo} />}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}

function Clasificacion({ filas, yo }: { filas: FilaClasificacion[]; yo: string | null }) {
  return (
    <table className="clasificacion">
      <caption className="nota">Clasificación de la liga</caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Equipo</th>
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
          <tr key={f.participanteId} className={f.participanteId === yo ? 'propia' : ''}>
            <td>{f.posicion}</td>
            <th scope="row">
              {f.nombre}
              {f.nivelNPC && <span className="etiqueta nivel-npc">{etiquetaNPC(f.nivelNPC)}</span>}
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
  );
}

function Cuadro({ cuadro, yo }: { cuadro: NonNullable<VistaTorneo['cuadro']>; yo: string | null }) {
  const equipo = (r: Ref, ganador: Ref) => (
    <span className={[r && ganador?.id === r.id ? 'ganador' : '', r?.id === yo ? 'propio' : ''].filter(Boolean).join(' ')}>{r?.nombre ?? 'Por decidir'}
      {r?.nivelNPC && <span className="etiqueta nivel-npc">{etiquetaNPC(r.nivelNPC)}</span>}
    </span>
  );
  return (
    <div className="cuadro" aria-label="Cuadro de eliminatorias">
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
            {tituloJornada(j)} <span className="etiqueta">{j.estado === 'cerrada' ? 'Jugada' : j.estado === 'abierta' ? 'En juego' : 'Pendiente'}</span>
          </h3>
          <ul className="lista-partidos">
            {j.partidos.map((p, i) => (
              <li key={p.partidoId ?? i} className={p.local?.id === yo || p.visitante?.id === yo ? 'propio' : ''}>
                <span>{p.local?.nombre ?? 'Por decidir'}</span>
                <span className="resultado-partido">
                  {p.estado === 'finalizado' && p.partidoId ? (
                    <Link to={`/partidas/${partidaId}/partido/${p.partidoId}`}>{textoMarcador(p.marcador)}</Link>
                  ) : (
                    textoMarcador(null)
                  )}
                </span>
                <span>{p.visitante?.nombre ?? 'Por decidir'}</span>
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
