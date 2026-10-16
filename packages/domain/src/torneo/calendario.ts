/**
 * Calendario de liga (T105; FR-051): todos contra todos con el método del círculo, y la vuelta en
 * espejo (mismos cruces con el campo cambiado). Con N impar, en cada jornada descansa un equipo.
 */
import { Rng, type Semilla } from '../rng/xoshiro';
import type { Modo } from '../partida/partida';

export interface CrucePartido {
  local: string;
  visitante: string;
}

export interface JornadaCalendario {
  numero: number;
  partidos: CrucePartido[];
  descansa?: string;
}

const DESCANSO = '__descanso__';

export function calendarioLiga(participantes: readonly string[], semilla: Semilla): JornadaCalendario[] {
  const orden = new Rng(semilla).barajar(participantes);
  if (orden.length % 2 === 1) orden.push(DESCANSO);
  const n = orden.length;
  const ida: JornadaCalendario[] = [];
  let rueda = [...orden];
  for (let r = 0; r < n - 1; r++) {
    const partidos: CrucePartido[] = [];
    let descansa: string | undefined;
    for (let i = 0; i < n / 2; i++) {
      const a = rueda[i]!;
      const b = rueda[n - 1 - i]!;
      if (a === DESCANSO || b === DESCANSO) {
        descansa = a === DESCANSO ? b : a;
        continue;
      }
      // Alternar quién juega en casa para repartir local y visitante.
      partidos.push(r % 2 === 0 ? { local: a, visitante: b } : { local: b, visitante: a });
    }
    ida.push({ numero: r + 1, partidos, ...(descansa ? { descansa } : {}) });
    // Rotación del círculo: el primero queda fijo.
    rueda = [rueda[0]!, rueda[n - 1]!, ...rueda.slice(1, n - 1)];
  }
  const vuelta = ida.map((j) => ({
    numero: j.numero + ida.length,
    partidos: j.partidos.map((p) => ({ local: p.visitante, visitante: p.local })),
    ...(j.descansa ? { descansa: j.descansa } : {}),
  }));
  return [...ida, ...vuelta];
}

/** Partidos totales de un torneo (SC-012). */
export function partidosTotales(modo: Modo, n: number): number {
  const liga = n * (n - 1);
  if (modo === 'liga') return liga;
  if (modo === 'playoff') return n - 1;
  return liga + 3; // mixto: liga + 2 semifinales + final
}
