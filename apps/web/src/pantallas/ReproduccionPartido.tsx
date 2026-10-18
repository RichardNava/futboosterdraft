import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ErrorApi, marcarVisto, obtenerReproduccion } from '../api/cliente';
import { jugadoresDe, Lienzo2D, type Superposicion } from '../campo2d/Lienzo2D';
import { RelojReproduccion, VELOCIDADES, type EstadoReloj, type Velocidad } from '../campo2d/relojReproduccion';
import { datosVacios, incorporarTramo, type TramoRecibido } from '../campo2d/tramos';
import { Estadisticas } from '../componentes/Estadisticas';
import { ResumenEventos, type EventoVista } from '../componentes/ResumenEventos';
import { ETIQUETA_FASE, type Inicio, type Marcador } from './PartidoRapido';

interface TramoReproduccion extends TramoRecibido {
  minuto: string;
  eventos: (TramoRecibido['eventos'][number] & EventoVista)[];
  marcador: Marcador;
}

interface Reproduccion {
  inicio: Inicio;
  tramos: TramoReproduccion[];
  fin: { marcador: Marcador; estadisticas: unknown; eventos: EventoVista[] };
}

const PAUSAS = new Set(['descanso', 'pre_prorroga']);
const AVISO: Partial<Record<EstadoReloj, string>> = {
  gol: '¡GOL!',
  descanso: 'Descanso',
  pre_prorroga: 'Final del tiempo reglamentario: habrá prórroga',
  fin: 'Final del partido',
};

/** Índice del último tramo antes de la siguiente pausa (descanso, antes de la prórroga) o del final. */
function hastaLaPausa(tramos: TramoReproduccion[], desde: number): number {
  for (let i = desde; i < tramos.length; i++) if (PAUSAS.has(tramos[i]!.fase)) return i;
  return tramos.length - 1;
}

const movimientoReducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Reproducción de un partido entre humanos ya resuelto (spec 002, FR-030; research R8): cada humano lo ve
 * cuando quiere, con su propia velocidad (x2, x4 o x8) y sin panel de cambios. Se detiene en el descanso y
 * antes de la prórroga hasta pulsar «Continuar», y «Finalizar partido» salta al final. Al llegar al final
 * se marca como visto y el resultado pasa a contar en su clasificación.
 */
export function ReproduccionPartido() {
  const { partidaId, partidoId } = useParams();
  const [datos, setDatos] = useState<Reproduccion | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Rápida: último tramo que se ve (se amplía con «Continuar»).
  const [hasta, setHasta] = useState(0);
  const [alFinal, setAlFinal] = useState(false);
  const [tick, setTick] = useState(0);
  const [estadoReloj, setEstadoReloj] = useState<EstadoReloj>('cargando');
  const [reloj] = useState(() => new RelojReproduccion());
  const [velocidad, setVelocidad] = useState<Velocidad>(reloj.velocidad);
  const reproduccion = useRef(datosVacios());
  const visto = useRef(false);
  const sinRotulos = useMemo(movimientoReducido, []);

  useEffect(() => {
    let vigente = true;
    obtenerReproduccion<Reproduccion>(partidoId!)
      .then((r) => {
        if (!vigente) return;
        reproduccion.current = datosVacios();
        for (const t of r.tramos) incorporarTramo(reproduccion.current, reloj, t);
        setDatos(r);
        setHasta(hastaLaPausa(r.tramos, 0));
      })
      .catch((e: unknown) => vigente && setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar el partido'));
    return () => {
      vigente = false;
    };
  }, [partidoId, reloj]);

  const es2d = datos?.inicio.modalidad === '2d';
  const ultimoTramo = datos ? datos.tramos.length - 1 : 0;
  const tramoLimite = datos?.tramos[hasta];
  // En la rápida no hay reloj: se ve cada tramo entero.
  const tickVisible = es2d ? tick : (tramoLimite?.hastaTick ?? 0);
  const llegoAlLimite = es2d ? estadoReloj === 'descanso' || estadoReloj === 'pre_prorroga' : datos !== null && tramoLimite !== undefined;
  const terminado = alFinal || (es2d ? estadoReloj === 'fin' : datos !== null && hasta === ultimoTramo);

  // Al terminar de verlo (o al finalizar), el resultado deja de estar pendiente de ver.
  useEffect(() => {
    if (!terminado || visto.current || !partidoId) return;
    visto.current = true;
    void marcarVisto(partidoId).catch(() => {
      visto.current = false;
    });
  }, [terminado, partidoId]);

  const jugadores = useMemo(() => (datos ? jugadoresDe(datos.inicio) : new Map()), [datos]);
  const eventosVistos = useMemo(
    () =>
      (datos?.tramos ?? [])
        .slice(0, es2d ? undefined : hasta + 1)
        .flatMap((t) => t.eventos)
        .filter((e) => terminado || e.tick <= tickVisible),
    [datos, hasta, tickVisible, terminado, es2d],
  );
  const goles = (lado: 'local' | 'visitante') => eventosVistos.filter((e) => e.tipo === 'gol' && e.equipo === lado).length;
  const marcador: Marcador = terminado && datos ? datos.fin.marcador : { local: goles('local'), visitante: goles('visitante') };
  const tramoActual = datos?.tramos.find((t) => t.hastaTick >= tickVisible) ?? tramoLimite;
  const fase = terminado ? 'finalizado' : (tramoActual?.fase ?? 'primera_parte');
  const minuto = tramoActual?.minuto ?? "1'";
  const aviso = terminado ? 'Final del partido' : es2d ? (AVISO[estadoReloj] ?? null) : null;

  const superposicion = useRef<Superposicion>({ marcador, minuto, aviso });
  superposicion.current = { marcador, minuto, aviso };

  const alAvanzar = useCallback(
    (t: number) => {
      setTick(t);
      setEstadoReloj(reloj.estado);
    },
    [reloj],
  );

  if (error) return <p className="error pantalla">{error}</p>;
  if (!datos) return <p className="cargando">Cargando partido…</p>;

  const { inicio } = datos;
  const nombresEquipo = { local: inicio.local.nombre, visitante: inicio.visitante.nombre };
  const nombre = (id: number) => {
    const j = jugadores.get(id);
    return j ? `${j.dorsal ? `${j.dorsal}. ` : ''}${j.nombre}` : String(id);
  };

  const continuar = () => {
    if (es2d) {
      reloj.continuar();
      setEstadoReloj(reloj.estado);
    } else setHasta(hastaLaPausa(datos.tramos, hasta + 1));
  };
  const finalizar = () => {
    setHasta(ultimoTramo);
    setAlFinal(true);
    reloj.situar(reloj.limite);
  };
  const elegirVelocidad = (v: Velocidad) => {
    reloj.velocidad = v;
    setVelocidad(v);
  };
  const puedeContinuar = es2d ? llegoAlLimite : hasta < ultimoTramo;

  return (
    <main className="pantalla partido reproduccion">
      <h1 className={es2d ? 'solo-lectores' : ''}>
        {inicio.local.nombre} {marcador.local} – {marcador.visitante} {inicio.visitante.nombre}
      </h1>
      <p className="nota">{ETIQUETA_FASE[fase] ?? fase}. Partido ya jugado: lo ves a tu ritmo, sin cambios.</p>
      {es2d && (
        <>
          <Lienzo2D
            inicio={inicio}
            reloj={reloj}
            datos={reproduccion}
            superposicion={superposicion}
            alAvanzar={alAvanzar}
            sinRotulos={sinRotulos}
            etiqueta={`${inicio.local.nombre} ${marcador.local}, ${inicio.visitante.nombre} ${marcador.visitante}. Minuto ${minuto}.`}
          />
          <p className="marcador-2d" aria-live="polite">
            <span>
              {inicio.local.nombre} {marcador.local} – {marcador.visitante} {inicio.visitante.nombre}
            </span>
            <span className="nota">{minuto}</span>
          </p>
          <div className="velocidades" role="group" aria-label="Velocidad de reproducción">
            {VELOCIDADES.map((v) => (
              <button key={v} type="button" className={v === velocidad ? '' : 'secundario'} aria-pressed={v === velocidad} onClick={() => elegirVelocidad(v)}>
                x{v}
              </button>
            ))}
          </div>
        </>
      )}

      {!terminado && (
        <div className="acciones">
          {puedeContinuar && (
            <button type="button" onClick={continuar}>
              Continuar
            </button>
          )}
          <button type="button" className="secundario" onClick={finalizar}>
            Finalizar partido
          </button>
        </div>
      )}

      <section aria-label="Eventos del partido">
        <h2>{terminado ? 'Resumen del partido' : 'Lo que ha pasado'}</h2>
        <ResumenEventos eventos={terminado ? datos.fin.eventos : eventosVistos} nombre={nombre} nombresEquipo={nombresEquipo} />
      </section>

      {terminado && (
        <>
          {datos.fin.estadisticas !== null && datos.fin.estadisticas !== undefined && (
            <section aria-label="Estadísticas">
              <h2>Estadísticas</h2>
              <Estadisticas datos={datos.fin.estadisticas as never} nombres={nombresEquipo} />
            </section>
          )}
          <p>
            <Link className="boton" to={`/partidas/${partidaId}/torneo`}>
              Siguiente
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
