/**
 * Generación de los sobres de una mesa (FR-011, FR-014; research R16).
 *
 * Se genera la mesa completa al empezar el draft: 3 sobres por participante. Cada sobre tiene cupos
 * fijos de demarcación (1 "POR o DEF", 2 DEF, 3 MED, 2 DEL; si ya no quedan porteros, el hueco es un DEF) y de nivel
 * según el reparto del nivel de rareza (spec 013; Moderado: 4 Superclase, 2 Crack, 1 Legendario y 1 carta alta
 * Legendario/GOAT). El cruce demarcación × nivel se sortea, restringido a las combinaciones que aún tienen cartas, y
 * ninguna carta se repite en la mesa.
 *
 * Spec 013 (FR-020; research R5): un hueco Legendario o GOAT sin existencias en la mesa pasa al otro nivel alto y, si
 * no queda ninguno, a Crack. Con existencias no cambia nada, así que con el reparto de antes los sobres son idénticos.
 */
import type { Demarcacion, Jugador, Nivel } from '../catalogo/tipos';
import type { ParametrosEquilibrado } from '../parametros/index';
import { derivarSemilla, Rng, type Semilla } from '../rng/xoshiro';
import type { RepartoSobre } from './rareza';

export type Ronda = 1 | 2 | 3;

export interface SobreGenerado {
  ronda: Ronda;
  asientoOrigen: number;
  cartas: number[];
}

/** No hay cartas suficientes en el pool para generar los sobres. */
export class ErrorPoolInsuficiente extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorPoolInsuficiente';
  }
}

export interface PlanSobre {
  huecoPorDef: 'POR' | 'DEF';
  /** Nivel sorteado de cada carta alta, en orden. */
  altas: ('Legendario' | 'GOAT')[];
  demarcaciones: Demarcacion[];
  niveles: Nivel[];
}

const MAX_REINTENTOS = 500;

const repetir = (n: number, v: Nivel): Nivel[] => Array.from({ length: n }, () => v);

/**
 * Sortea el hueco "POR o DEF" y cada carta alta de un sobre. Consume el RNG en el mismo orden que antes de la spec 013
 * (primero el hueco, luego una tirada por carta alta): con `{4, 2, 1, 1}` sale el mismo plan para la misma semilla.
 */
export function generarSobre(rng: Rng, p: ParametrosEquilibrado, reparto: RepartoSobre): PlanSobre {
  const huecoPorDef = rng.probabilidad(Math.round(p.sobres.probPorteroEnHuecoPorDef * 1000)) ? 'POR' : 'DEF';
  const altas = Array.from({ length: reparto.altas }, () =>
    rng.probabilidad(Math.round(reparto.probGoatEnAlta * 1000)) ? ('GOAT' as const) : ('Legendario' as const),
  );
  return {
    huecoPorDef,
    altas,
    demarcaciones: [huecoPorDef, 'DEF', 'DEF', 'MED', 'MED', 'MED', 'DEL', 'DEL'],
    niveles: [
      ...repetir(reparto.superclase, 'Superclase'),
      ...repetir(reparto.crack, 'Crack'),
      ...repetir(reparto.legendario, 'Legendario'),
      ...altas,
    ],
  };
}

/** Reparto de los sobres anteriores a la spec 013: 4 Superclase, 2 Crack, 1 Legendario y 1 alta. */
export const repartoClasico = (p: ParametrosEquilibrado): RepartoSobre => ({
  superclase: 4,
  crack: 2,
  legendario: 1,
  altas: 1,
  probGoatEnAlta: p.sobres.probGoatEnAlta,
});

const esAlta = (n: Nivel): n is 'Legendario' | 'GOAT' => n === 'Legendario' || n === 'GOAT';

/** Un hueco alto sin existencias pasa al otro nivel alto y, si no queda ninguno, a Crack (FR-020). */
function conExistencias(niveles: readonly Nivel[], quedan: Readonly<Record<Nivel, number>>): Nivel[] {
  const q = { ...quedan };
  return niveles.map((n) => {
    const elegido: Nivel = esAlta(n) ? ([n, n === 'GOAT' ? 'Legendario' : 'GOAT'] as const).find((x) => q[x] > 0) ?? 'Crack' : n;
    q[elegido] -= 1;
    return elegido;
  });
}

/** Degrada el último hueco alto un escalón (GOAT → Legendario → Crack), o null si no queda ninguno. */
function degradarUltimaAlta(niveles: readonly Nivel[]): Nivel[] | null {
  const i = niveles.findLastIndex(esAlta);
  if (i < 0) return null;
  const copia = [...niveles];
  copia[i] = niveles[i] === 'GOAT' ? 'Legendario' : 'Crack';
  return copia;
}

type Celda = `${Demarcacion}|${Nivel}`;
const celda = (d: Demarcacion, n: Nivel): Celda => `${d}|${n}`;

/** Ordenaciones distintas de un multiconjunto de niveles. */
function permutaciones(niveles: readonly Nivel[]): Nivel[][] {
  const cuenta = new Map<Nivel, number>();
  for (const n of niveles) cuenta.set(n, (cuenta.get(n) ?? 0) + 1);
  const salida: Nivel[][] = [];
  const actual: Nivel[] = [];
  const recorrer = () => {
    if (actual.length === niveles.length) return void salida.push([...actual]);
    for (const [n, c] of cuenta) {
      if (c === 0) continue;
      cuenta.set(n, c - 1);
      actual.push(n);
      recorrer();
      actual.pop();
      cuenta.set(n, c);
    }
  };
  recorrer();
  return salida;
}

/**
 * Mesa justa de cartas altas (Rico; spec 013, R5): en lugar de sortear el cruce, se elige el que gasta las celdas
 * con más presión (cartas que quedan en la celda frente a huecos de su demarcación que quedan en la mesa). Así las
 * altas de las demarcaciones con menos huecos (DEL, POR) no se quedan para el final sin sitio. Sin RNG: determinista.
 */
function mejorCruce(
  demarcaciones: readonly Demarcacion[],
  niveles: readonly Nivel[],
  disponibles: ReadonlyMap<Celda, number[]>,
  huecosRestantes: Readonly<Record<Demarcacion, number>>,
): Celda[] | undefined {
  // Objetivo por demarcación: huecos del sobre × (altas o Crack que quedan) / (huecos que quedan en la mesa).
  const quedan = (d: Demarcacion, ns: readonly Nivel[]) => ns.reduce((s, n) => s + (disponibles.get(celda(d, n))?.length ?? 0), 0);
  const huecosSobre = new Map<Demarcacion, number>();
  for (const d of demarcaciones) huecosSobre.set(d, (huecosSobre.get(d) ?? 0) + 1);
  const clases = [['Legendario', 'GOAT'], ['Crack'], ['Superclase']] as const;
  const objetivo = new Map<Demarcacion, number[]>(
    [...huecosSobre].map(([d, h]) => [d, clases.map((ns) => (h * quedan(d, ns)) / Math.max(huecosRestantes[d], h))]),
  );
  let mejor: { propuesta: Celda[]; error: number } | undefined;
  for (const orden of permutaciones(niveles)) {
    const propuesta = demarcaciones.map((d, i) => celda(d, orden[i]!));
    const necesarias = new Map<Celda, number>();
    for (const c of propuesta) necesarias.set(c, (necesarias.get(c) ?? 0) + 1);
    if (![...necesarias].every(([c, n]) => (disponibles.get(c)?.length ?? 0) >= n)) continue;
    let error = 0;
    for (const [d, obj] of objetivo) {
      clases.forEach((ns, k) => {
        const puestas = demarcaciones.filter((x, i) => x === d && (ns as readonly Nivel[]).includes(orden[i]!)).length;
        error += (puestas - obj[k]!) ** 2;
      });
    }
    if (!mejor || error < mejor.error) mejor = { propuesta, error };
  }
  return mejor?.propuesta;
}

type Pool = readonly Pick<Jugador, 'id' | 'demarcacion' | 'nivel'>[];

/** Intentos con semillas derivadas cuando una mesa justa sustituye más altas de las inevitables. */
const INTENTOS_MESA_JUSTA = 30;

/** Sobres de una mesa de draft: tres por participante con el reparto de su nivel de rareza. */
export function generarMesa(
  pool: Pool,
  numParticipantes: number,
  semilla: Semilla,
  parametros: ParametrosEquilibrado,
  reparto: RepartoSobre,
): SobreGenerado[] {
  if (!Number.isInteger(numParticipantes) || numParticipantes < 1) {
    throw new Error(`Número de participantes inválido: ${numParticipantes}`);
  }
  // Con holgura en todos los niveles (Moderado con Core, por ejemplo), el sorteo de siempre: mismos sobres para la
  // misma semilla (SC-005). Si la mesa es justa (Pobre y Escaso en Superclase; Alto y Rico en altas), el cruce se
  // elige con `mejorCruce`, y si falla o sustituye más altas de las inevitables, se repite la mesa con una semilla
  // derivada (determinista) y se queda la mejor.
  const disponiblesAltas = pool.filter((j) => j.nivel === 'Legendario' || j.nivel === 'GOAT').length;
  const pedidas = 3 * numParticipantes * (reparto.legendario + reparto.altas);
  const cuantas = (ns: readonly Nivel[]) => pool.filter((j) => ns.includes(j.nivel)).length;
  const sobresMesa = 3 * numParticipantes;
  // Alguna clase de nivel pide el 80 % o más de lo que hay: el sorteo podría quedarse sin sitio al final de la mesa.
  const justa = [
    [reparto.legendario + reparto.altas, disponiblesAltas],
    [reparto.crack, cuantas(['Crack'])],
    [reparto.superclase, cuantas(['Superclase'])],
  ].some(([porSobre, hay]) => sobresMesa * porSobre! >= 0.8 * hay!);
  if (!justa) return intentarMesa(pool, numParticipantes, new Rng(semilla), parametros, reparto, false).sobres;

  const minimo = Math.min(pedidas, disponiblesAltas);
  let mejor: { sobres: SobreGenerado[]; altas: number } | undefined;
  let error: unknown;
  for (let i = 0; i < INTENTOS_MESA_JUSTA && (mejor?.altas ?? -1) < minimo; i++) {
    const rng = new Rng(i === 0 ? semilla : derivarSemilla(semilla, `mesa-justa:${i}`));
    try {
      const r = intentarMesa(pool, numParticipantes, rng, parametros, reparto, true);
      if (!mejor || r.altas > mejor.altas) mejor = r;
    } catch (e) {
      if (!(e instanceof ErrorPoolInsuficiente)) throw e;
      error = e;
    }
  }
  if (!mejor) throw error;
  return mejor.sobres;
}

function intentarMesa(
  pool: Pool,
  numParticipantes: number,
  rng: Rng,
  parametros: ParametrosEquilibrado,
  reparto: RepartoSobre,
  justa: boolean,
): { sobres: SobreGenerado[]; altas: number } {
  // Cartas disponibles por celda, barajadas (orden canónico por id antes de barajar).
  const disponibles = new Map<Celda, number[]>();
  const quedan: Record<Nivel, number> = { Superclase: 0, Crack: 0, Legendario: 0, GOAT: 0 };
  for (const j of [...pool].sort((a, b) => a.id - b.id)) {
    const c = celda(j.demarcacion, j.nivel);
    const lista = disponibles.get(c) ?? [];
    lista.push(j.id);
    disponibles.set(c, lista);
    quedan[j.nivel] += 1;
  }
  for (const [c, lista] of disponibles) disponibles.set(c, rng.barajar(lista));

  const totalSobres = 3 * numParticipantes;
  const pPortero = parametros.sobres.probPorteroEnHuecoPorDef;
  let altas = 0;
  const sobres: SobreGenerado[] = [];
  for (const ronda of [1, 2, 3] as const) {
    for (let asiento = 0; asiento < numParticipantes; asiento++) {
      const plan = generarSobre(rng, parametros, reparto);
      let niveles: Nivel[] | null = conExistencias(plan.niveles, quedan);
      let asignacion: Celda[] | undefined;
      const r = totalSobres - sobres.length;
      const huecosRestantes = { POR: r * pPortero, DEF: r * (3 - pPortero), MED: 3 * r, DEL: 2 * r };
      const asignar = (demarcaciones: Demarcacion[], nivelesSobre: Nivel[]) => {
        if (justa) {
          asignacion = mejorCruce(demarcaciones, nivelesSobre, disponibles, huecosRestantes);
          return;
        }
        for (let intento = 0; intento < MAX_REINTENTOS && !asignacion; intento++) {
          const barajados = rng.barajar(nivelesSobre);
          const propuesta = demarcaciones.map((d, i) => celda(d, barajados[i]!));
          const necesarias = new Map<Celda, number>();
          for (const c of propuesta) necesarias.set(c, (necesarias.get(c) ?? 0) + 1);
          if ([...necesarias].every(([c, n]) => (disponibles.get(c)?.length ?? 0) >= n)) asignacion = propuesta;
        }
      };
      // Si las altas que quedan no caben en las demarcaciones del sobre, se degrada una alta más y se reintenta (R5).
      while (niveles && !asignacion) {
        asignar(plan.demarcaciones, niveles);
        // Sin porteros en el pool (mesas grandes; desde la 6.2.0 salen más), el hueco "POR o DEF" es un defensa.
        if (!asignacion && plan.huecoPorDef === 'POR') asignar(['DEF', ...plan.demarcaciones.slice(1)], niveles);
        if (!asignacion) niveles = degradarUltimaAlta(niveles);
      }
      if (!asignacion) {
        throw new ErrorPoolInsuficiente(
          `No hay cartas suficientes para completar el sobre ${asiento} de la ronda ${ronda} (${numParticipantes} participantes)`,
        );
      }
      const cartas = asignacion.map((c) => {
        const nivel = c.slice(c.indexOf('|') + 1) as Nivel;
        quedan[nivel] -= 1;
        if (esAlta(nivel)) altas += 1;
        return disponibles.get(c)!.pop()!;
      });
      sobres.push({ ronda, asientoOrigen: asiento, cartas: rng.barajar(cartas) });
    }
  }
  return { sobres, altas };
}
