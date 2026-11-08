/**
 * Bajas pendientes en la alineación confirmada (spec 012, FR-026 a FR-030; research R11). La alineación confirmada se
 * respeta entre jornadas: si un convocado está de baja, el participante debe sustituirlo; solo al vencer el plazo
 * (o con un NPC al mando) se cubre la baja con el mejor disponible, sin tocar nada más.
 */
import type { Jugador } from '../catalogo/tipos';
import type { ParametrosEquilibrado } from '../parametros/index';
import type { Alineacion } from './alineacion';
import { FORMACIONES } from './formaciones';
import { candidatos, type Lanzadores } from './lanzadores';
import { statsEfectivos } from './statsEfectivos';

/** Titulares y suplentes convocados que están de baja, en ese orden. */
export function bajasPendientes(a: Alineacion, bajas: ReadonlySet<number>): number[] {
  return [...a.titulares.map((t) => t.jugadorId), ...a.suplentes].filter((id) => bajas.has(id));
}

/** ¿Queda en la plantilla alguien que no sea titular y no esté de baja? Si no, no hay con quién sustituir. */
export function haySuplenteDisponible(a: Alineacion, plantilla: readonly number[], bajas: ReadonlySet<number>): boolean {
  const titulares = new Set(a.titulares.map((t) => t.jugadorId));
  return plantilla.some((id) => !titulares.has(id) && !bajas.has(id));
}

/** Lanzadores tras los cambios: el que entra hereda los papeles del que sale; si nadie entra, el mejor de los que quedan. */
function lanzadoresTras(l: Lanzadores, relevo: ReadonlyMap<number, number | null>, titulares: readonly Jugador[]): Lanzadores {
  const enCampo = new Set(titulares.map((j) => j.id));
  const cambiar = (id: number, tipo: 'penaltis' | 'faltas' | 'corners'): number => {
    const nuevo = relevo.has(id) ? relevo.get(id)! : id;
    if (nuevo !== null && enCampo.has(nuevo)) return nuevo;
    return candidatos(titulares, tipo)[0]?.id ?? 0;
  };
  const tanda = l.tanda.map((id) => (relevo.has(id) ? relevo.get(id)! : id)).filter((id): id is number => id !== null && enCampo.has(id));
  for (const j of candidatos(titulares, 'penaltis')) {
    if (tanda.length >= Math.min(5, titulares.length)) break;
    if (!tanda.includes(j.id)) tanda.push(j.id);
  }
  return { penaltis: cambiar(l.penaltis, 'penaltis'), faltas: cambiar(l.faltas, 'faltas'), corners: cambiar(l.corners, 'corners'), tanda };
}

/**
 * La misma alineación con cada titular de baja sustituido por el mejor disponible en su casilla (de su demarcación si
 * lo hay; si no, cualquiera), que hereda su punto de colocación y sus lanzamientos; sin nadie disponible, la casilla
 * queda vacía. Los suplentes de baja salen del banquillo. Nada más cambia (FR-030).
 */
export function cubrirBajas(a: Alineacion, plantilla: readonly Jugador[], bajas: ReadonlySet<number>, p: ParametrosEquilibrado): Alineacion {
  if (bajasPendientes(a, bajas).length === 0) return a;
  const porId = new Map(plantilla.map((j) => [j.id, j]));
  const casillas = new Map(FORMACIONES[a.formacion].casillas.map((c) => [c.id, c]));
  const usados = new Set(a.titulares.map((t) => t.jugadorId));
  let suplentes = a.suplentes.filter((id) => !bajas.has(id));
  const relevo = new Map<number, number | null>();
  const titulares = a.titulares.flatMap((t) => {
    if (!bajas.has(t.jugadorId)) return [t];
    const sale = porId.get(t.jugadorId);
    const casilla = casillas.get(t.casillaId)!;
    const libres = plantilla.filter((j) => !usados.has(j.id) && !bajas.has(j.id));
    const mismaDemarcacion = libres.filter((j) => j.demarcacion === sale?.demarcacion);
    const mejor = (mismaDemarcacion.length ? mismaDemarcacion : libres)
      .map((j) => ({ j, v: statsEfectivos(j, casilla, p).media }))
      .sort((x, y) => y.v - x.v || x.j.id - y.j.id)[0]?.j;
    relevo.set(t.jugadorId, mejor?.id ?? null);
    if (!mejor) return [];
    usados.add(mejor.id);
    suplentes = suplentes.filter((id) => id !== mejor.id);
    return [{ casillaId: t.casillaId, jugadorId: mejor.id }];
  });
  const colocacion = a.colocacion?.flatMap((c) => {
    if (!relevo.has(c.jugadorId)) return [c];
    const nuevo = relevo.get(c.jugadorId);
    return nuevo == null ? [] : [{ ...c, jugadorId: nuevo }];
  });
  const enCampo = titulares.map((t) => porId.get(t.jugadorId)!).filter(Boolean);
  return {
    ...a,
    titulares,
    suplentes,
    lanzadores: relevo.size ? lanzadoresTras(a.lanzadores, relevo, enCampo) : a.lanzadores,
    ...(colocacion ? { colocacion } : {}),
  };
}
