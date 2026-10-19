/**
 * Series de partidos para el equilibrado (T090): N partidos con semillas reproducibles, alternando
 * quién juega en casa, y agregación de resultados y estadísticas por equipo.
 */
import { parametrosActuales, semillaDesdeTexto } from '@fbd/domain';
import { avanzar, crearPartido, type EquipoPartido, type EstadisticasEquipo, type MetricasJugador } from '@fbd/engine';

/** Un gol de la serie, para los repartos por tipo, distancia y zona (spec 003, T031). */
export interface GolSerie {
  /** Equipo que marca (A o B de la serie). */
  equipo: 'A' | 'B';
  tipo: string;
  distancia: number;
  zonaRemate: string;
  /** Jugador que marca (en propia puerta, el defensor). */
  autorId: number;
}

export interface OpcionesSerie {
  eliminatoria?: boolean;
  /** Métricas por jugador del equipo A en cada partido (spec 003, research R11). */
  metricas?: boolean;
}

export interface ResultadoSerie {
  n: number;
  victoriasA: number;
  victoriasB: number;
  empates: number;
  golesA: number[];
  golesB: number[];
  estadisticasA: EstadisticasEquipo[];
  estadisticasB: EstadisticasEquipo[];
  lesionesA: number;
  lesionesB: number;
  ms: number;
  /** Resultado de cada partido en orden local-visitante («2-1»). */
  resultados: string[];
  goles: GolSerie[];
  /** Métricas de los jugadores del equipo A en cada partido (solo con `metricas`). */
  metricasA: Record<number, MetricasJugador>[];
}

export function serie(a: EquipoPartido, b: EquipoPartido, n: number, semilla: number, etiqueta: string, opciones: boolean | OpcionesSerie = false): ResultadoSerie {
  const { eliminatoria = false, metricas = false } = typeof opciones === 'boolean' ? { eliminatoria: opciones } : opciones;
  const idsA = new Set([...a.titulares.map((t) => t.jugador.id), ...a.suplentes.map((j) => j.id)]);
  const r: ResultadoSerie = {
    n,
    victoriasA: 0,
    victoriasB: 0,
    empates: 0,
    golesA: [],
    golesB: [],
    estadisticasA: [],
    estadisticasB: [],
    lesionesA: 0,
    lesionesB: 0,
    ms: 0,
    resultados: [],
    goles: [],
    metricasA: [],
  };
  const inicio = Date.now();
  const parametros = parametrosActuales();
  for (let i = 0; i < n; i++) {
    const aEnCasa = i % 2 === 0;
    const final = avanzar(
      crearPartido({
        version: parametros.version,
        parametros,
        semilla: semillaDesdeTexto(`${etiqueta}:${semilla + i}`),
        eliminatoria,
        local: aEnCasa ? a : b,
        visitante: aEnCasa ? b : a,
      }),
      'final',
      { metricas },
    );
    r.resultados.push(`${final.marcador.local}-${final.marcador.visitante}`);
    for (const ev of final.eventos) {
      if (ev.tipo !== 'gol') continue;
      const deA = (ev.equipo === 'local') === aEnCasa;
      r.goles.push({
        equipo: deA ? 'A' : 'B',
        tipo: String(ev.datos.tipo),
        distancia: Number(ev.datos.distancia ?? 0),
        zonaRemate: String(ev.datos.zonaRemate ?? ''),
        autorId: ev.jugadores.find((j) => j.rol === 'autor')?.jugadorId ?? 0,
      });
    }
    if (metricas && final.metricas) r.metricasA.push(Object.fromEntries(Object.entries(final.metricas).filter(([id]) => idsA.has(Number(id)))));
    const ga = aEnCasa ? final.marcador.local : final.marcador.visitante;
    const gb = aEnCasa ? final.marcador.visitante : final.marcador.local;
    r.golesA.push(ga);
    r.golesB.push(gb);
    if (ga > gb) r.victoriasA++;
    else if (gb > ga) r.victoriasB++;
    else r.empates++;
    const ea = aEnCasa ? final.estadisticas.local : final.estadisticas.visitante;
    const eb = aEnCasa ? final.estadisticas.visitante : final.estadisticas.local;
    r.estadisticasA.push(ea);
    r.estadisticasB.push(eb);
    r.lesionesA += ea.lesiones;
    r.lesionesB += eb.lesiones;
  }
  r.ms = Date.now() - inicio;
  return r;
}

export const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function errorEstandar(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = media(xs);
  const varianza = xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(varianza / xs.length);
}

/** `a` es significativamente mayor que `b` (diferencia de medias > 2 errores estándar). */
export function mayorSignificativo(a: number[], b: number[]): boolean {
  const diferencia = media(a) - media(b);
  const error = Math.sqrt(errorEstandar(a) ** 2 + errorEstandar(b) ** 2);
  return diferencia > 2 * error && diferencia > 0;
}
