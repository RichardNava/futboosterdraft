/**
 * Alineación de los NPC en el modo Duelo de jugadores (spec 005, T069; research R12): el once que maximiza la suma de
 * puntuaciones efectivas en la formación común. Asignación voraz (la mejor pareja casilla–jugador cada vez) y mejora
 * local con intercambios entre casillas y con los no convocados, hasta que ninguno mejora. Determinista.
 *
 * La usan los NPC, la alineación automática de los humanos y la comprobación `duelos` de `balance`.
 */
import {
  casillasEnOrden,
  proponerLanzadores,
  puntuacionEfectiva,
  tacticaPorDefecto,
  type Alineacion,
  type FormacionId,
  type Jugador,
  type ParametrosEquilibrado,
} from '@fbd/domain';

export function decidirAlineacionDuelos(
  plantilla: readonly Jugador[],
  formacion: FormacionId,
  p: ParametrosEquilibrado,
  bajas: ReadonlySet<number> = new Set(),
): Alineacion {
  const casillas = casillasEnOrden(formacion);
  const disponibles = plantilla.filter((j) => !bajas.has(j.id)).sort((a, b) => a.id - b.id);
  const valor = new Map<string, number>();
  const v = (j: Jugador, i: number) => {
    const clave = `${j.id}:${i}`;
    let x = valor.get(clave);
    if (x === undefined) {
      x = puntuacionEfectiva(j, casillas[i]!, p).base;
      valor.set(clave, x);
    }
    return x;
  };

  // Voraz: la mejor pareja (casilla, jugador) libre cada vez.
  const asignado: (Jugador | undefined)[] = casillas.map(() => undefined);
  const usados = new Set<number>();
  for (let k = 0; k < casillas.length && usados.size < disponibles.length; k++) {
    let mejor: { i: number; j: Jugador; x: number } | undefined;
    for (let i = 0; i < casillas.length; i++) {
      if (asignado[i]) continue;
      for (const j of disponibles) {
        if (usados.has(j.id)) continue;
        const x = v(j, i);
        if (!mejor || x > mejor.x) mejor = { i, j, x };
      }
    }
    if (!mejor) break;
    asignado[mejor.i] = mejor.j;
    usados.add(mejor.j.id);
  }

  // Mejora local: intercambios entre dos casillas y con jugadores fuera del once.
  for (let vuelta = 0, mejora = true; mejora && vuelta < 50; vuelta++) {
    mejora = false;
    for (let a = 0; a < casillas.length; a++) {
      for (let b = a + 1; b < casillas.length; b++) {
        const ja = asignado[a];
        const jb = asignado[b];
        if (!ja || !jb) continue;
        if (v(jb, a) + v(ja, b) > v(ja, a) + v(jb, b)) {
          asignado[a] = jb;
          asignado[b] = ja;
          mejora = true;
        }
      }
      const ja = asignado[a];
      for (const o of disponibles) {
        if (usados.has(o.id) || !ja) continue;
        if (v(o, a) > v(ja, a)) {
          usados.delete(ja.id);
          usados.add(o.id);
          asignado[a] = o;
          mejora = true;
          break;
        }
      }
    }
  }

  const titulares = casillas.flatMap((c, i) => (asignado[i] ? [{ casillaId: c.id, jugadorId: asignado[i]!.id }] : []));
  return {
    formacion,
    titulares,
    suplentes: [],
    tactica: tacticaPorDefecto(),
    lanzadores: proponerLanzadores(casillas.flatMap((_, i) => (asignado[i] ? [asignado[i]!] : []))),
  };
}
