/**
 * Coherencia del impacto de los rasgos con su efecto (spec 005, T096; FR-051; research R13).
 *
 * Para cada rasgo, serie A/B sintética con las mismas semillas: el equipo con el rasgo en un jugador de su ámbito frente
 * al mismo equipo sin él. El efecto es la diferencia de goles esperada (con − sin). Como dice FR-051, dentro de cada tipo
 * ningún rasgo con un efecto claramente mayor que otro (diferencia > `CLARAMENTE` errores estándar) puede tener menos impacto (en los
 * defectos, 1 − impacto frente al perjuicio). La correlación de Spearman (research R13) se informa como referencia: con
 * efectos de centésimas de gol y 200 partidos por rasgo, el orden de los rasgos de efecto parecido es ruido.
 */
import { DEFECTOS, proponerLanzadores, RASGOS, TODAS_LAS_VIRTUDES, type Rasgo } from '@fbd/domain';
import type { EquipoPartido } from '@fbd/engine';
import type { GrupoComprobaciones } from '../cli';
import { conStatsDesplazados, equipoSintetico } from '../equipos';
import { errorEstandar, media, serie } from '../series';
import type { Comprobacion } from './partido';

/** Casilla del jugador que recibe el rasgo, según su ámbito (los genéricos, el delantero centro). */
const CASILLA: Record<string, string> = { POR: 'POR', DEF: 'DCI', MED: 'MC-1', DEL: 'DC', generico: 'DC' };

/** Rasgos que actúan desde el banquillo: se dan a un suplente. */
const EN_BANQUILLO: ReadonlySet<Rasgo> = new Set(['Rebelde', 'Revulsivo']);

function conRasgo(base: EquipoPartido, r: Rasgo): EquipoPartido {
  const def = RASGOS[r];
  const anadir = <J extends EquipoPartido['suplentes'][number]>(j: J): J =>
    def.tipo === 'virtud' ? { ...j, virtudes: [...j.virtudes, r as J['virtudes'][number]] } : { ...j, defectos: [...j.defectos, r as J['defectos'][number]] };
  if (EN_BANQUILLO.has(r)) return { ...base, suplentes: base.suplentes.map((j, i) => (i === 5 ? anadir(j) : j)) };
  const casilla = CASILLA[def.ambito]!;
  const titulares = base.titulares.map((t) => (t.casillaId === casilla ? { ...t, jugador: anadir(t.jugador) } : t));
  return { ...base, titulares, lanzadores: proponerLanzadores(titulares.map((t) => t.jugador)) };
}

/** Rangos con empates promediados. */
function rangos(xs: readonly number[]): number[] {
  const orden = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const r = new Array<number>(xs.length);
  for (let k = 0; k < orden.length; ) {
    let fin = k;
    while (fin + 1 < orden.length && orden[fin + 1]!.x === orden[k]!.x) fin++;
    for (let m = k; m <= fin; m++) r[orden[m]!.i] = (k + fin) / 2;
    k = fin + 1;
  }
  return r;
}

export function spearman(a: readonly number[], b: readonly number[]): number {
  const ra = rangos(a);
  const rb = rangos(b);
  const ma = media(ra);
  const mb = media(rb);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i]! - ma) * (rb[i]! - mb);
    da += (ra[i]! - ma) ** 2;
    db += (rb[i]! - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

export interface EfectoRasgo {
  id: Rasgo;
  /** Diferencia de goles esperada con el rasgo menos sin él (por partido). */
  efecto: number;
  /** Error estándar de la serie con el rasgo (la serie sin él es común a todos y se anula al compararlos). */
  error: number;
}

/**
 * Una diferencia de efecto de más de estos errores estándar es «claramente mayor» (FR-051). Con 39 virtudes hay 741
 * pares, y el más extremo ya ronda 3 por puro azar: 4 es la corrección de Bonferroni para el 5 % sobre esos pares.
 */
const CLARAMENTE = 4;

/** Puntos de media del equipo que deben pesar más que cualquier virtud sola (005/SC-013). */
const MEDIA_STATS = 5;

/** Efecto de cada rasgo en la diferencia de goles (con − sin), con `n` partidos por serie. */
export function medirEfectos(n: number, semilla: number, ids: readonly Rasgo[] = [...TODAS_LAS_VIRTUDES, ...DEFECTOS]): EfectoRasgo[] {
  const { base, efecto } = medidor(n, semilla);
  return ids.map((id) => ({ id, ...efecto(conRasgo(base, id)) }));
}

/** Efecto en la diferencia de goles de un cambio del equipo base de `medirEfectos` (con − sin). */
function medidor(n: number, semilla: number) {
  const base = equipoSintetico({ semilla: 'impacto-005', participanteId: 'a' });
  const rival = equipoSintetico({ semilla: 'referencia', participanteId: 'rival' });
  const diferencias = (a: EquipoPartido) => {
    const s = serie(a, rival, n, semilla, 'impacto-005');
    return s.golesA.map((g, i) => g - s.golesB[i]!);
  };
  const sin = media(diferencias(base));
  return {
    base,
    efecto: (a: EquipoPartido) => {
      const d = diferencias(a);
      return { efecto: media(d) - sin, error: errorEstandar(d) };
    },
  };
}

/** 005/SC-013: los stats mandan; +5 de media en el equipo pesa más en la diferencia de goles que cualquier virtud sola. */
function comprobarStatsMandan(n: number, semilla: number, efectos: readonly EfectoRasgo[]): Comprobacion {
  const { base, efecto } = medidor(n, semilla);
  const stats = efecto(conStatsDesplazados(base, MEDIA_STATS)).efecto;
  const mayor = efectos.filter((e) => RASGOS[e.id].tipo === 'virtud').sort((a, b) => b.efecto - a.efecto)[0]!;
  return {
    id: '005/SC-013',
    descripcion: `Los stats mandan: +${MEDIA_STATS} de media en el equipo pesa más en la diferencia de goles que cualquier virtud sola`,
    ok: stats > mayor.efecto,
    detalle: `+${MEDIA_STATS} de media ${stats >= 0 ? '+' : ''}${stats.toFixed(3)} goles por partido · virtud con más efecto ${mayor.id} ${mayor.efecto >= 0 ? '+' : ''}${mayor.efecto.toFixed(3)}`,
  };
}

function comprobacionTipo(tipo: 'virtud' | 'defecto', efectos: readonly EfectoRasgo[]): Comprobacion {
  const lista = efectos.filter((e) => RASGOS[e.id].tipo === tipo);
  // Virtudes: impacto frente a beneficio. Defectos: 1 − impacto frente a perjuicio.
  const esperado = lista.map((e) => (tipo === 'virtud' ? RASGOS[e.id].impacto : 1 - RASGOS[e.id].impacto));
  const medido = lista.map((e) => (tipo === 'virtud' ? e.efecto : -e.efecto));
  const rho = spearman(esperado, medido);
  const re = rangos(esperado);
  const rm = rangos(medido);
  const fuera = lista
    .map((e, i) => ({ id: e.id, salto: Math.abs(re[i]! - rm[i]!), medido: medido[i]! }))
    .sort((a, b) => b.salto - a.salto)
    .slice(0, 5)
    .map((x) => `${x.id} (${x.medido >= 0 ? '+' : ''}${x.medido.toFixed(3)})`);
  // Pares incoherentes: i tiene claramente más efecto que j, pero menos impacto.
  const incoherentes: string[] = [];
  lista.forEach((a, i) =>
    lista.forEach((b, j) => {
      const claramente = medido[i]! - medido[j]! > CLARAMENTE * Math.hypot(a.error, b.error);
      if (claramente && esperado[i]! < esperado[j]!) incoherentes.push(`${a.id} (${medido[i]!.toFixed(3)}) > ${b.id} (${medido[j]!.toFixed(3)})`);
    }),
  );
  return {
    id: `005/FR-051${tipo === 'defecto' ? 'b' : ''}`,
    descripcion: `${tipo === 'virtud' ? 'Virtudes' : 'Defectos'}: ningún rasgo con un efecto claramente mayor que otro (> ${CLARAMENTE} errores estándar en la diferencia de goles) tiene menos impacto`,
    ok: incoherentes.length === 0,
    detalle:
      `${incoherentes.length ? `incoherentes: ${incoherentes.join(', ')}` : 'ningún par incoherente'} · ` +
      `ρ = ${rho.toFixed(2)} con ${lista.length} rasgos (referencia) · más fuera de orden: ${fuera.join(', ')}`,
  };
}

export function comprobacionesImpacto(n: number, semilla: number): Comprobacion[] {
  const efectos = medirEfectos(n, semilla);
  return [comprobacionTipo('virtud', efectos), comprobacionTipo('defecto', efectos), comprobarStatsMandan(n, semilla, efectos)];
}

export function gruposImpacto(): GrupoComprobaciones[] {
  return [{ ids: ['005/FR-051', '005/FR-051b', '005/SC-013'], serie: 'sintetica', ejecutar: (o) => comprobacionesImpacto(Math.max(40, Math.round(o.n / 5)), o.seed) }];
}
