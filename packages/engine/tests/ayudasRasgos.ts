/** Partidos de prueba con los parámetros actuales (7.0.0; rasgos de la spec 005 activos). */
import { PARAMETROS_V7, type ParametrosEquilibrado } from '@fbd/domain';
import { crearPartido, type EstadoMotor } from '../src/index';
import { entrada } from './ayudas';

export const P4 = PARAMETROS_V7;

/** Copia de unos parámetros con cambios (probabilidades forzadas). */
export function conParametros(cambios: (q: ParametrosEquilibrado) => void, base: ParametrosEquilibrado = P4): ParametrosEquilibrado {
  const q = structuredClone(base);
  cambios(q);
  return q;
}

/** Partido recién creado con unos parámetros (7.0.0 por defecto). */
export function partido4(semilla: string, q: ParametrosEquilibrado = P4): EstadoMotor {
  return crearPartido(entrada(semilla, { version: q.version, parametros: q }));
}

/** Proporción entre dos recuentos, para comparar una serie con y sin un rasgo. */
export const razon = (con: number, sin: number) => (sin === 0 ? Number.POSITIVE_INFINITY : con / sin);
