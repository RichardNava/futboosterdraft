/**
 * Peso de las estadísticas (spec 014, US5; SC-008, contrato M6): para cada estadística principal, el equipo con +15
 * puntos en ella (solo en los campos de carta que la alimentan) intenta más la acción que gobierna y la acierta más,
 * frente al mismo equipo sin el cambio y el mismo rival. Criterio: ≥ +10 % relativo en intentos y en acierto
 * (velocidad: balones sueltos ganados; portero: solo paradas).
 */
import type { Demarcacion, Jugador } from '@fbd/domain';
import { calcularMedia } from '@fbd/domain';
import type { EquipoPartido, MetricasJugador } from '@fbd/engine';
import type { GrupoComprobaciones } from '../cli';
import { clonar, equipoSintetico } from '../equipos';
import { serie, type ResultadoSerie } from '../series';
import type { Comprobacion } from './partido';

type Estadistica = 'pase' | 'regate' | 'remate' | 'defensa' | 'fisico' | 'velocidad' | 'portero';

/** Campos de la carta que alimentan cada estadística del motor (`modificadores/atributos.ts`). */
const CAMPOS: Record<Estadistica, Partial<Record<Demarcacion, string[]>>> = {
  pase: { DEF: ['tecnica'], MED: ['pase', 'vision'], DEL: ['creatividad'] },
  regate: { MED: ['tecnica'], DEL: ['regate'] },
  remate: { MED: ['disparo'], DEL: ['finalizacion'] },
  defensa: { DEF: ['tackling', 'anticipacion'], MED: ['posicionamiento'] },
  fisico: { DEF: ['marcaje'], DEL: ['agresividad'] },
  velocidad: { DEF: ['velocidad'], MED: ['velocidad'], DEL: ['velocidad'] },
  portero: { POR: ['agilidad', 'colocacion'] },
};

const DELTA = 15;

/** Mismo equipo con +15 en los campos de una estadística de sus titulares. */
function conEstadistica(equipo: EquipoPartido, e: Estadistica, delta = DELTA): EquipoPartido {
  const ajustar = (j: Jugador): Jugador => {
    const campos = CAMPOS[e][j.demarcacion] ?? [];
    if (campos.length === 0) return j;
    const stats = { ...(j.stats as unknown as Record<string, number>) };
    for (const c of campos) stats[c] = Math.max(1, Math.min(99, stats[c]! + delta));
    const nuevos = stats as unknown as Jugador['stats'];
    return { ...j, stats: nuevos, media: calcularMedia({ demarcacion: j.demarcacion, stats: nuevos }) };
  };
  return { ...equipo, titulares: equipo.titulares.map((t) => ({ ...t, jugador: ajustar(t.jugador) })) };
}

/** Suma de un contador de los jugadores del equipo A (solo los de `ids`, si se dan). */
const sumaMetrica = (r: ResultadoSerie, campo: keyof MetricasJugador, ids?: ReadonlySet<number>) =>
  r.metricasA.reduce((t, m) => t + Object.entries(m).reduce((u, [id, j]) => u + (!ids || ids.has(Number(id)) ? j[campo] : 0), 0), 0);
const sumaEst = (xs: ResultadoSerie['estadisticasA'], campo: 'pases' | 'pasesCompletados' | 'tiros' | 'tirosPuerta') => xs.reduce((t, s) => t + s[campo], 0);
const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Intentos y aciertos de la acción que gobierna cada estadística, para el equipo A de la serie. */
function medir(e: Estadistica, r: ResultadoSerie, usan: ReadonlySet<number>): { intentos: number | null; aciertos: number; base: number } {
  switch (e) {
    case 'pase':
      return { intentos: sumaEst(r.estadisticasA, 'pases'), aciertos: sumaEst(r.estadisticasA, 'pasesCompletados'), base: sumaEst(r.estadisticasA, 'pases') };
    case 'regate':
      return { intentos: sumaMetrica(r, 'regates'), aciertos: sumaMetrica(r, 'regatesGanados'), base: sumaMetrica(r, 'regates') };
    case 'remate':
      return { intentos: sumaEst(r.estadisticasA, 'tiros'), aciertos: suma(r.golesA), base: sumaEst(r.estadisticasA, 'tiros') };
    case 'defensa':
      // Frecuencia: balones recuperados; acierto: duelos ganados frente a un regate o una conducción.
      return { intentos: r.estadisticasA.reduce((t, s) => t + s.recuperaciones, 0), aciertos: sumaMetrica(r, 'entradasGanadas'), base: sumaMetrica(r, 'entradas') };
    case 'fisico':
      // Solo los jugadores con el stat cambiado (los medios no tienen un campo de físico en la carta).
      return { intentos: sumaMetrica(r, 'conducciones', usan), aciertos: sumaMetrica(r, 'conduccionesGanadas', usan), base: sumaMetrica(r, 'conducciones', usan) };
    case 'velocidad':
      return { intentos: null, aciertos: sumaMetrica(r, 'sueltosGanados'), base: sumaMetrica(r, 'sueltosDisputados') };
    case 'portero':
      return { intentos: null, aciertos: sumaEst(r.estadisticasB, 'tirosPuerta') - suma(r.golesB), base: sumaEst(r.estadisticasB, 'tirosPuerta') };
  }
}

const rel = (con: number, sin: number) => (sin > 0 ? con / sin - 1 : Number.NaN);
const pct = (x: number) => `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)} %`;
/** Error estándar del cociente de tasas (aproximación binomial), en relativo. */
const ee = (p: number, n: number) => (n > 0 && p > 0 ? Math.sqrt((p * (1 - p)) / n) / p : Number.NaN);

/** 014/SC-008 para cada estadística: serie A/B con +15 frente al mismo equipo sin el cambio. */
function comprobacionesPesoStats(n: number, semilla: number): Comprobacion[] {
  const base = equipoSintetico({ semilla: 'peso-stats' });
  const rival = clonar(base, 'b');
  const sin = serie(base, rival, n, semilla, 'peso-stats', { metricas: true });
  return (Object.keys(CAMPOS) as Estadistica[]).map((e) => {
    const con = serie(conEstadistica(base, e), rival, n, semilla, 'peso-stats', { metricas: true });
    const usan = new Set(base.titulares.filter((t) => (CAMPOS[e][t.jugador.demarcacion] ?? []).length > 0).map((t) => t.jugador.id));
    const a = medir(e, sin, usan);
    const b = medir(e, con, usan);
    const tasaSin = a.aciertos / Math.max(1, a.base);
    const tasaCon = b.aciertos / Math.max(1, b.base);
    const acierto = rel(tasaCon, tasaSin);
    const intentos = a.intentos === null || b.intentos === null ? null : rel(b.intentos, a.intentos);
    const ok = acierto >= 0.1 && (intentos === null || intentos >= 0.1);
    return {
      id: `014/SC-008-${e}`,
      descripcion: `Peso de las estadísticas, ${e} +${DELTA}: ≥ +10 % relativo en intentos y en acierto de la acción que gobierna`,
      ok,
      detalle: `${intentos === null ? '' : `intentos ${pct(intentos)} (${a.intentos} → ${b.intentos}) · `}acierto ${pct(acierto)} (${(100 * tasaSin).toFixed(1)} % → ${(100 * tasaCon).toFixed(1)} %, ±${(100 * ee(tasaCon, b.base)).toFixed(1)} %)`,
    };
  });
}

/** Comprobaciones del peso de las estadísticas (spec 014) para la herramienta. */
export function gruposPesoStats(): GrupoComprobaciones[] {
  const ids = (Object.keys(CAMPOS) as Estadistica[]).map((e) => `014/SC-008-${e}`);
  return [{ ids, serie: 'sintetica', ejecutar: (o) => comprobacionesPesoStats(o.n, o.seed) }];
}
