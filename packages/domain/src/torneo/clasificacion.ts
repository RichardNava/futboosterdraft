/**
 * Clasificación de liga (T107; FR-051): 3/1/0 puntos; desempate por diferencia de goles, goles a
 * favor, enfrentamiento directo (puntos y después diferencia de goles entre los empatados) y sorteo.
 */
import { Rng, type Semilla } from '../rng/xoshiro';

export interface ResultadoLiga {
  local: string;
  visitante: string;
  golesLocal: number;
  golesVisitante: number;
}

export interface FilaClasificacion {
  participanteId: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
}

function tabla(participantes: readonly string[], resultados: readonly ResultadoLiga[]): Map<string, FilaClasificacion> {
  const filas = new Map(participantes.map((id) => [id, { participanteId: id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 }]));
  for (const r of resultados) {
    const l = filas.get(r.local);
    const v = filas.get(r.visitante);
    if (!l || !v) continue;
    l.pj++;
    v.pj++;
    l.gf += r.golesLocal;
    l.gc += r.golesVisitante;
    v.gf += r.golesVisitante;
    v.gc += r.golesLocal;
    if (r.golesLocal > r.golesVisitante) {
      l.g++;
      v.p++;
      l.pts += 3;
    } else if (r.golesLocal < r.golesVisitante) {
      v.g++;
      l.p++;
      v.pts += 3;
    } else {
      l.e++;
      v.e++;
      l.pts++;
      v.pts++;
    }
  }
  for (const f of filas.values()) f.dg = f.gf - f.gc;
  return filas;
}

export function clasificacion(participantes: readonly string[], resultados: readonly ResultadoLiga[], semilla: Semilla): FilaClasificacion[] {
  const filas = tabla(participantes, resultados);
  // Sorteo final reproducible: un número por participante.
  const rng = new Rng(semilla);
  const sorteo = new Map([...participantes].sort().map((id) => [id, rng.siguiente()]));

  const general = (a: FilaClasificacion, b: FilaClasificacion) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf;
  const ordenadas = [...filas.values()].sort(general);

  // Resolver grupos empatados con el enfrentamiento directo entre ellos.
  const resultado: FilaClasificacion[] = [];
  for (let i = 0; i < ordenadas.length; ) {
    let j = i + 1;
    while (j < ordenadas.length && general(ordenadas[i]!, ordenadas[j]!) === 0) j++;
    const grupo = ordenadas.slice(i, j);
    if (grupo.length > 1) {
      const ids = new Set(grupo.map((f) => f.participanteId));
      const directo = tabla(
        [...ids],
        resultados.filter((r) => ids.has(r.local) && ids.has(r.visitante)),
      );
      grupo.sort((a, b) => {
        const da = directo.get(a.participanteId)!;
        const db = directo.get(b.participanteId)!;
        return db.pts - da.pts || db.dg - da.dg || (sorteo.get(a.participanteId)! - sorteo.get(b.participanteId)!);
      });
    }
    resultado.push(...grupo);
    i = j;
  }
  return resultado;
}
