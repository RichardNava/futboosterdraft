/**
 * Cuadro de eliminatorias a partido único (T106; FR-052, FR-053).
 */
import { Rng, type Semilla } from '../rng/xoshiro';

export type TipoRonda = 'octavos' | 'cuartos' | 'semifinal' | 'final';

export interface Cruce {
  local?: string;
  visitante?: string;
  ganador?: string;
}

export interface Cuadro {
  rondas: { tipo: TipoRonda; cruces: Cruce[] }[];
  campeon?: string;
}

const TIPOS: Record<number, TipoRonda[]> = {
  2: ['final'],
  4: ['semifinal', 'final'],
  8: ['cuartos', 'semifinal', 'final'],
  16: ['octavos', 'cuartos', 'semifinal', 'final'],
};

function rondasVacias(n: number): Cuadro['rondas'] {
  const tipos = TIPOS[n];
  if (!tipos) throw new Error(`Tamaño de cuadro no admitido: ${n}`);
  return tipos.map((tipo, i) => ({ tipo, cruces: Array.from({ length: n / 2 ** (i + 1) }, () => ({})) }));
}

/**
 * Cuadro de playoff de 4, 8 o 16. Los cruces de la primera ronda se sortean con la semilla; con dos
 * mesas (playoff de 16) cada cruce enfrenta a un participante de cada mesa.
 */
export function cuadroPlayoff(participantes: readonly string[], mesas: readonly (readonly string[])[], semilla: Semilla): Cuadro {
  const rng = new Rng(semilla);
  const rondas = rondasVacias(participantes.length);
  let pares: [string, string][];
  if (mesas.length === 2) {
    const a = rng.barajar(mesas[0]!);
    const b = rng.barajar(mesas[1]!);
    pares = a.map((x, i) => (rng.probabilidad(500) ? [x, b[i]!] : [b[i]!, x]));
  } else {
    const orden = rng.barajar(participantes);
    pares = Array.from({ length: orden.length / 2 }, (_, i) => [orden[2 * i]!, orden[2 * i + 1]!]);
  }
  rondas[0]!.cruces = pares.map(([local, visitante]) => ({ local, visitante }));
  return { rondas };
}

/** Fase final del mixto: semifinales 1.º–4.º y 2.º–3.º, y final. */
export function cuadroMixto(clasificados: readonly string[]): Cuadro {
  const [primero, segundo, tercero, cuarto] = clasificados;
  if (!primero || !segundo || !tercero || !cuarto) throw new Error('Hacen falta los cuatro primeros');
  return {
    rondas: [
      {
        tipo: 'semifinal',
        cruces: [
          { local: primero, visitante: cuarto },
          { local: segundo, visitante: tercero },
        ],
      },
      { tipo: 'final', cruces: [{}] },
    ],
  };
}

/** Registra el ganador de un cruce y lo coloca en la ronda siguiente (o lo proclama campeón). */
export function avanzarCuadro(cuadro: Cuadro, ronda: number, indice: number, ganador: string): Cuadro {
  const rondas = cuadro.rondas.map((r) => ({ ...r, cruces: r.cruces.map((c) => ({ ...c })) }));
  const cruce = rondas[ronda]?.cruces[indice];
  if (!cruce) throw new Error(`No existe el cruce ${ronda}/${indice}`);
  if (ganador !== cruce.local && ganador !== cruce.visitante) throw new Error('El ganador no juega ese cruce');
  cruce.ganador = ganador;
  const siguiente = rondas[ronda + 1];
  if (!siguiente) return { rondas, campeon: ganador };
  const destino = siguiente.cruces[Math.floor(indice / 2)]!;
  if (indice % 2 === 0) destino.local = ganador;
  else destino.visitante = ganador;
  return { rondas };
}

/** Primera ronda con cruces aún sin ganador (o undefined si el cuadro ha terminado). */
export function rondaActual(cuadro: Cuadro): number | undefined {
  const i = cuadro.rondas.findIndex((r) => r.cruces.some((c) => !c.ganador));
  return i < 0 ? undefined : i;
}
