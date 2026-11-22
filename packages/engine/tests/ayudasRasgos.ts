/** Partidos de prueba con los parámetros actuales (rasgos de la spec 005 activos). */
import { parametrosActuales, type ParametrosMotor } from '@fbd/domain';
import { crearPartido, type EstadoMotor } from '../src/index';
import { entrada } from './ayudas';

export const P4 = parametrosActuales();

/** Copia de unos parámetros con cambios (probabilidades forzadas). */
export function conParametros(cambios: (q: ParametrosMotor) => void, base: ParametrosMotor = P4): ParametrosMotor {
  const q = structuredClone(base);
  cambios(q);
  return q;
}

/** Partido recién creado con unos parámetros (los actuales por defecto). */
export function partido4(semilla: string, q: ParametrosMotor = P4): EstadoMotor {
  return crearPartido(entrada(semilla, { version: q.version, parametros: q }));
}

/** Proporción entre dos recuentos, para comparar una serie con y sin un rasgo. */
export const razon = (con: number, sin: number) => (sin === 0 ? Number.POSITIVE_INFINITY : con / sin);
