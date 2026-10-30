/**
 * Generación de los sobres de una mesa (FR-011, FR-014; research R16).
 *
 * Se genera la mesa completa al empezar el draft: 3 sobres por participante. Cada sobre tiene cupos
 * fijos de demarcación (1 "POR o DEF", 2 DEF, 3 MED, 2 DEL) y de nivel (4 Superclase, 2 Crack,
 * 1 Legendario y 1 carta alta Legendario/GOAT). El cruce demarcación × nivel se sortea, restringido a
 * las combinaciones que aún tienen cartas, y ninguna carta se repite en la mesa.
 */
import type { Demarcacion, Jugador, Nivel } from '../catalogo/tipos';
import type { ParametrosEquilibrado } from '../parametros/index';
import { Rng, type Semilla } from '../rng/xoshiro';

export type Ronda = 1 | 2 | 3;

export interface SobreGenerado {
  ronda: Ronda;
  asientoOrigen: number;
  cartas: number[];
}

export class ErrorPoolInsuficiente extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorPoolInsuficiente';
  }
}

export interface PlanSobre {
  huecoPorDef: 'POR' | 'DEF';
  alta: 'Legendario' | 'GOAT';
  demarcaciones: Demarcacion[];
  niveles: Nivel[];
}

const MAX_REINTENTOS = 500;

/** Sortea el hueco "POR o DEF" y la carta alta de un sobre. */
export function generarSobre(rng: Rng, p: ParametrosEquilibrado): PlanSobre {
  const huecoPorDef = rng.probabilidad(Math.round(p.sobres.probPorteroEnHuecoPorDef * 1000)) ? 'POR' : 'DEF';
  const alta = rng.probabilidad(Math.round(p.sobres.probGoatEnAlta * 1000)) ? 'GOAT' : 'Legendario';
  return {
    huecoPorDef,
    alta,
    demarcaciones: [huecoPorDef, 'DEF', 'DEF', 'MED', 'MED', 'MED', 'DEL', 'DEL'],
    niveles: ['Superclase', 'Superclase', 'Superclase', 'Superclase', 'Crack', 'Crack', 'Legendario', alta],
  };
}

type Celda = `${Demarcacion}|${Nivel}`;
const celda = (d: Demarcacion, n: Nivel): Celda => `${d}|${n}`;

export function generarMesa(
  pool: readonly Pick<Jugador, 'id' | 'demarcacion' | 'nivel'>[],
  numParticipantes: number,
  semilla: Semilla,
  parametros: ParametrosEquilibrado,
): SobreGenerado[] {
  if (!Number.isInteger(numParticipantes) || numParticipantes < 1) {
    throw new Error(`Número de participantes inválido: ${numParticipantes}`);
  }
  const rng = new Rng(semilla);

  // Cartas disponibles por celda, barajadas (orden canónico por id antes de barajar).
  const disponibles = new Map<Celda, number[]>();
  for (const j of [...pool].sort((a, b) => a.id - b.id)) {
    const c = celda(j.demarcacion, j.nivel);
    const lista = disponibles.get(c) ?? [];
    lista.push(j.id);
    disponibles.set(c, lista);
  }
  for (const [c, lista] of disponibles) disponibles.set(c, rng.barajar(lista));

  const sobres: SobreGenerado[] = [];
  for (const ronda of [1, 2, 3] as const) {
    for (let asiento = 0; asiento < numParticipantes; asiento++) {
      const plan = generarSobre(rng, parametros);
      let asignacion: Celda[] | undefined;
      for (let intento = 0; intento < MAX_REINTENTOS && !asignacion; intento++) {
        const niveles = rng.barajar(plan.niveles);
        const propuesta = plan.demarcaciones.map((d, i) => celda(d, niveles[i]!));
        const necesarias = new Map<Celda, number>();
        for (const c of propuesta) necesarias.set(c, (necesarias.get(c) ?? 0) + 1);
        if ([...necesarias].every(([c, n]) => (disponibles.get(c)?.length ?? 0) >= n)) asignacion = propuesta;
      }
      if (!asignacion) {
        throw new ErrorPoolInsuficiente(
          `No hay cartas suficientes para completar el sobre ${asiento} de la ronda ${ronda} (${numParticipantes} participantes)`,
        );
      }
      const cartas = asignacion.map((c) => disponibles.get(c)!.pop()!);
      sobres.push({ ronda, asientoOrigen: asiento, cartas: rng.barajar(cartas) });
    }
  }
  return sobres;
}
