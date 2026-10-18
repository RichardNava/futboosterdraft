/**
 * Alineación automática (FR-031): se usa cuando un participante no confirma a tiempo, para los NPC
 * básicos y para sustituir a un jugador de baja.
 *
 * Para cada formación, asigna jugadores a casillas maximizando la suma de medias efectivas
 * (asignación voraz seguida de mejora por intercambios), priorizando un portero en la portería. Elige
 * la formación con mayor suma; con empate, la que deja menos jugadores fuera de posición.
 */
import type { Jugador } from '../catalogo/tipos';
import type { ParametrosEquilibrado } from '../parametros/index';
import type { Alineacion, Titular } from './alineacion';
import { MAX_SUPLENTES, TITULARES } from './alineacion';
import { FORMACIONES_IDS, FORMACIONES, type Casilla, type FormacionId } from './formaciones';
import { proponerLanzadores } from './lanzadores';
import { penalizacionPorPosicion, statsEfectivos } from './statsEfectivos';
import { tacticaPorDefecto, type Tactica } from './tactica';

interface Asignacion {
  formacion: FormacionId;
  titulares: Titular[];
  total: number;
  fuera: number;
}

function asignar(formacionId: FormacionId, jugadores: readonly Jugador[], p: ParametrosEquilibrado): Asignacion {
  const casillas = FORMACIONES[formacionId].casillas;
  // La mejora por intercambios pide muchas veces el mismo par jugador-casilla: se memoriza (T140).
  const memo = new Map<Casilla, Map<number, number>>();
  const valor = (j: Jugador, c: Casilla) => {
    let porJugador = memo.get(c);
    if (!porJugador) memo.set(c, (porJugador = new Map()));
    let v = porJugador.get(j.id);
    if (v === undefined) porJugador.set(j.id, (v = statsEfectivos(j, c, p).media));
    return v;
  };
  const n = Math.min(TITULARES, jugadores.length);

  // Casillas a ocupar: si hay menos de 11 disponibles, se deja vacía la última de cada línea empezando
  // por delante (el portero siempre se cubre).
  const ordenCasillas = [casillas[0]!, ...[...casillas.slice(1)].reverse().slice(TITULARES - n).reverse()];

  // Voraz: pares (casilla, jugador) por valor descendente; el portero primero.
  const pares: { c: Casilla; j: Jugador; v: number }[] = [];
  for (const c of ordenCasillas) for (const j of jugadores) pares.push({ c, j, v: valor(j, c) + (c.id === 'POR' ? 1000 : 0) });
  pares.sort((a, b) => b.v - a.v || a.j.id - b.j.id || a.c.id.localeCompare(b.c.id));
  const porCasilla = new Map<string, Jugador>();
  const usados = new Set<number>();
  for (const { c, j } of pares) {
    if (porCasilla.has(c.id) || usados.has(j.id)) continue;
    porCasilla.set(c.id, j);
    usados.add(j.id);
    if (porCasilla.size === ordenCasillas.length) break;
  }

  // Mejora local: intercambiar titulares entre sí o con un no convocado si sube el total.
  const libres = () => jugadores.filter((j) => !usados.has(j.id));
  let mejora = true;
  for (let vuelta = 0; mejora && vuelta < 20; vuelta++) {
    mejora = false;
    const ids = [...porCasilla.keys()];
    for (let a = 0; a < ids.length; a++) {
      const ca = ordenCasillas.find((c) => c.id === ids[a])!;
      for (let b = a + 1; b < ids.length; b++) {
        const cb = ordenCasillas.find((c) => c.id === ids[b])!;
        const ja = porCasilla.get(ca.id)!;
        const jb = porCasilla.get(cb.id)!;
        if (valor(jb, ca) + valor(ja, cb) > valor(ja, ca) + valor(jb, cb) + 1e-9) {
          porCasilla.set(ca.id, jb);
          porCasilla.set(cb.id, ja);
          mejora = true;
        }
      }
      for (const j of libres()) {
        const actual = porCasilla.get(ca.id)!;
        if (valor(j, ca) > valor(actual, ca) + 1e-9) {
          porCasilla.set(ca.id, j);
          usados.delete(actual.id);
          usados.add(j.id);
          mejora = true;
        }
      }
    }
  }

  const titulares = ordenCasillas.flatMap((c) => {
    const j = porCasilla.get(c.id);
    return j ? [{ casillaId: c.id, jugadorId: j.id }] : [];
  });
  let total = 0;
  let fuera = 0;
  for (const c of ordenCasillas) {
    const j = porCasilla.get(c.id);
    if (!j) continue;
    total += valor(j, c);
    if (penalizacionPorPosicion(j, c, p) > 0) fuera++;
  }
  return { formacion: formacionId, titulares, total, fuera };
}

/** Siete suplentes que cubran las demarcaciones: un portero si lo hay y el mejor de cada línea. */
function elegirSuplentes(restantes: readonly Jugador[]): number[] {
  const ordenados = [...restantes].sort((a, b) => b.media - a.media || a.id - b.id);
  const elegidos: Jugador[] = [];
  for (const d of ['POR', 'DEF', 'MED', 'DEL'] as const) {
    const mejor = ordenados.find((j) => j.demarcacion === d && !elegidos.includes(j));
    if (mejor) elegidos.push(mejor);
  }
  for (const j of ordenados) {
    if (elegidos.length >= MAX_SUPLENTES) break;
    if (!elegidos.includes(j)) elegidos.push(j);
  }
  return elegidos.slice(0, MAX_SUPLENTES).map((j) => j.id);
}

export function autoAlineacion(
  plantilla: readonly Jugador[],
  bajasActivas: ReadonlySet<number>,
  p: ParametrosEquilibrado,
  opciones: { formaciones?: readonly FormacionId[]; tactica?: Tactica } = {},
): Alineacion {
  const disponibles = plantilla.filter((j) => !bajasActivas.has(j.id));
  let mejor: Asignacion | undefined;
  for (const f of opciones.formaciones ?? FORMACIONES_IDS) {
    const a = asignar(f, disponibles, p);
    if (!mejor || a.total > mejor.total + 1e-9 || (Math.abs(a.total - mejor.total) <= 1e-9 && a.fuera < mejor.fuera)) {
      mejor = a;
    }
  }
  const elegida = mejor!;
  const titularesIds = new Set(elegida.titulares.map((t) => t.jugadorId));
  const porId = new Map(disponibles.map((j) => [j.id, j]));
  return {
    formacion: elegida.formacion,
    titulares: elegida.titulares,
    suplentes: elegirSuplentes(disponibles.filter((j) => !titularesIds.has(j.id))),
    tactica: opciones.tactica ?? tacticaPorDefecto(),
    lanzadores: proponerLanzadores(elegida.titulares.map((t) => porId.get(t.jugadorId)!)),
  };
}
