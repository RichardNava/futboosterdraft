/**
 * Sobre de la tienda (spec 006, R13; FR-029). Mismos cupos que un sobre del draft (`generarSobre`), sacados de las
 * cartas que el usuario aún no tiene. Si una combinación demarcación × nivel se agota, la casilla se cubre con el
 * mismo nivel y otra demarcación; si tampoco, con el nivel inmediatamente inferior y, si no hay, con el superior
 * (Edge Cases). Ninguna carta se repite.
 */
import { DEMARCACIONES, NIVELES, type Demarcacion, type Jugador, type Nivel } from '../catalogo/tipos';
import type { ParametrosEquilibrado } from '../parametros/index';
import { Rng, type Semilla } from '../rng/xoshiro';
import { ErrorPoolInsuficiente, generarSobre } from './generador';

export const CARTAS_SOBRE_TIENDA = 8;
const MAX_REINTENTOS = 100;

type Carta = Pick<Jugador, 'id' | 'demarcacion' | 'nivel'>;

export function generarSobreTienda(disponibles: readonly Carta[], semilla: Semilla, parametros: ParametrosEquilibrado): number[] {
  if (disponibles.length < CARTAS_SOBRE_TIENDA) {
    throw new ErrorPoolInsuficiente(`Quedan ${disponibles.length} cartas por conseguir; un sobre necesita ${CARTAS_SOBRE_TIENDA}`);
  }
  const rng = new Rng(semilla);
  const celdas = new Map<string, number[]>();
  for (const c of [...disponibles].sort((a, b) => a.id - b.id)) {
    const clave = `${c.demarcacion}|${c.nivel}`;
    celdas.set(clave, [...(celdas.get(clave) ?? []), c.id]);
  }
  for (const [clave, lista] of celdas) celdas.set(clave, rng.barajar(lista));
  const quedan = (d: Demarcacion, n: Nivel) => celdas.get(`${d}|${n}`)?.length ?? 0;

  const plan = generarSobre(rng, parametros);
  // Como en `generarMesa`: se busca un cruce demarcación × nivel que quepa entero; si no, el último se completa con
  // sustituciones.
  let niveles = rng.barajar(plan.niveles);
  for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
    const necesarias = new Map<string, number>();
    plan.demarcaciones.forEach((d, i) => necesarias.set(`${d}|${niveles[i]}`, (necesarias.get(`${d}|${niveles[i]}`) ?? 0) + 1));
    if ([...necesarias].every(([c, n]) => (celdas.get(c)?.length ?? 0) >= n)) break;
    niveles = rng.barajar(plan.niveles);
  }

  const sacar = (d: Demarcacion, n: Nivel) => celdas.get(`${d}|${n}`)!.pop()!;
  const otraDemarcacion = (n: Nivel) => DEMARCACIONES.filter((d) => quedan(d, n) > 0);
  const cartas = plan.demarcaciones.map((d, i) => {
    const nivel = niveles[i]!;
    if (quedan(d, nivel) > 0) return sacar(d, nivel);
    const i0 = NIVELES.indexOf(nivel);
    // Mismo nivel; después los inferiores, del más cercano al más lejano, y por último los superiores.
    const orden = [nivel, ...NIVELES.slice(0, i0).reverse(), ...NIVELES.slice(i0 + 1)];
    for (const n of orden) {
      if (quedan(d, n) > 0 && n !== nivel) return sacar(d, n);
      const otras = otraDemarcacion(n);
      if (otras.length) return sacar(rng.elegir(otras), n);
    }
    throw new ErrorPoolInsuficiente('No quedan cartas para completar el sobre');
  });
  return rng.barajar(cartas);
}
