/**
 * Coherencia del impacto de los rasgos con su efecto (spec 005, T096; FR-051; research R13).
 *
 * Para cada rasgo, serie A/B sintética con las mismas semillas: el equipo con el rasgo en un jugador de su ámbito frente
 * al mismo equipo sin él. El efecto es la diferencia de goles esperada (con − sin). Dentro de cada tipo, la correlación
 * de Spearman entre el impacto y el efecto debe ser ≥ 0,6 (en los defectos, 1 − impacto frente al perjuicio). El informe
 * lista los rasgos más fuera de orden.
 */
import { DEFECTOS, proponerLanzadores, RASGOS, TODAS_LAS_VIRTUDES, type Rasgo } from '@fbd/domain';
import type { EquipoPartido } from '@fbd/engine';
import type { GrupoComprobaciones } from '../cli';
import { equipoSintetico } from '../equipos';
import { media, serie } from '../series';
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
}

/** Efecto de cada rasgo en la diferencia de goles (con − sin), con `n` partidos por serie. */
export function medirEfectos(n: number, semilla: number, ids: readonly Rasgo[] = [...TODAS_LAS_VIRTUDES, ...DEFECTOS]): EfectoRasgo[] {
  const base = equipoSintetico({ semilla: 'impacto-005', participanteId: 'a' });
  const rival = equipoSintetico({ semilla: 'referencia', participanteId: 'rival' });
  const diferencia = (a: EquipoPartido) => {
    const s = serie(a, rival, n, semilla, 'impacto-005');
    return media(s.golesA.map((g, i) => g - s.golesB[i]!));
  };
  const sin = diferencia(base);
  return ids.map((id) => ({ id, efecto: diferencia(conRasgo(base, id)) - sin }));
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
  return {
    id: `005/FR-051${tipo === 'defecto' ? 'b' : ''}`,
    descripcion: `${tipo === 'virtud' ? 'Virtudes' : 'Defectos'}: el orden del impacto es coherente con su efecto en la diferencia de goles (Spearman ≥ 0,6)`,
    ok: rho >= 0.6,
    detalle: `ρ = ${rho.toFixed(2)} con ${lista.length} rasgos · más fuera de orden: ${fuera.join(', ')}`,
  };
}

export function comprobacionesImpacto(n: number, semilla: number): Comprobacion[] {
  const efectos = medirEfectos(n, semilla);
  return [comprobacionTipo('virtud', efectos), comprobacionTipo('defecto', efectos)];
}

export function gruposImpacto(): GrupoComprobaciones[] {
  return [{ ids: ['005/FR-051', '005/FR-051b'], serie: 'sintetica', ejecutar: (o) => comprobacionesImpacto(Math.max(40, Math.round(o.n / 5)), o.seed) }];
}
