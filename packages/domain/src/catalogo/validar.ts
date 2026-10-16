/**
 * Validación del catálogo de jugadores (FR-016 a FR-024). El seed rechaza el fichero entero si
 * cualquier jugador incumple una regla.
 */
import {
  CLAVES_STATS,
  DEMARCACIONES,
  MAX_SPECIALS,
  NIVELES,
  POSICIONES,
  TODOS_LOS_SPECIALS,
  calcularMedia,
  specialsPermitidos,
  type Jugador,
} from './tipos';

export type ReglaCatalogo =
  | 'campos'
  | 'texto_vacio'
  | 'nacionalidad'
  | 'fecha_nacimiento'
  | 'altura'
  | 'demarcacion'
  | 'posicion_vacia'
  | 'posicion_repetida'
  | 'posicion_invalida'
  | 'portero_posiciones'
  | 'campo_en_porteria'
  | 'stats_claves'
  | 'stats_rango'
  | 'media'
  | 'nivel'
  | 'specials_repetidos'
  | 'specials_maximo'
  | 'special_desconocido'
  | 'special_no_permitido'
  | 'coleccion'
  | 'id'
  | 'id_repetido';

export interface ErrorCatalogo {
  id: unknown;
  regla: ReglaCatalogo;
  mensaje: string;
}

const CAMPOS: readonly (keyof Jugador)[] = [
  'id',
  'nombre',
  'apellidos',
  'nacionalidad',
  'fecha_nacimiento',
  'altura',
  'demarcacion',
  'posicion',
  'historia',
  'stats',
  'media',
  'specials',
  'nivel',
  'coleccion',
];

const COLECCIONES_VALIDAS = new Set(['Core']);

function esFechaIsoValida(texto: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return false;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  const diasMes = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1] ?? 0;
  return dia <= diasMes;
}

const incluye = <T>(lista: readonly T[], valor: unknown): valor is T => lista.includes(valor as T);

export function validarJugador(entrada: unknown): ErrorCatalogo[] {
  const errores: ErrorCatalogo[] = [];
  if (typeof entrada !== 'object' || entrada === null) {
    return [{ id: undefined, regla: 'campos', mensaje: 'El jugador no es un objeto' }];
  }
  const j = entrada as Record<string, unknown>;
  const id = j.id;
  const error = (regla: ReglaCatalogo, mensaje: string) => errores.push({ id, regla, mensaje });

  const faltan = CAMPOS.filter((c) => !(c in j));
  const sobran = Object.keys(j).filter((c) => !incluye(CAMPOS, c));
  if (faltan.length || sobran.length) {
    error('campos', `Campos incorrectos. Faltan: [${faltan.join(', ')}]. Sobran: [${sobran.join(', ')}]`);
    return errores;
  }

  if (!Number.isInteger(id) || (id as number) < 1) error('id', 'El id debe ser un entero ≥ 1');
  for (const campo of ['nombre', 'apellidos'] as const) {
    if (typeof j[campo] !== 'string' || (j[campo] as string).trim() === '') error('texto_vacio', `"${campo}" vacío`);
  }
  if (typeof j.historia !== 'string') error('texto_vacio', '"historia" debe ser texto (puede estar vacío)');
  if (typeof j.nacionalidad !== 'string' || j.nacionalidad.trim().length < 2) {
    error('nacionalidad', 'La nacionalidad debe tener al menos 2 caracteres');
  }
  if (typeof j.fecha_nacimiento !== 'string' || !esFechaIsoValida(j.fecha_nacimiento)) {
    error('fecha_nacimiento', 'La fecha de nacimiento debe ser una fecha ISO válida (YYYY-MM-DD)');
  }
  if (!Number.isInteger(j.altura) || (j.altura as number) < 150 || (j.altura as number) > 215) {
    error('altura', 'La altura debe ser un entero entre 150 y 215 cm');
  }
  if (!COLECCIONES_VALIDAS.has(j.coleccion as string)) {
    error('coleccion', 'La colección debe ser "Core"');
  }

  const demarcacion = j.demarcacion;
  if (!incluye(DEMARCACIONES, demarcacion)) {
    error('demarcacion', `Demarcación desconocida: ${String(demarcacion)}`);
    return errores;
  }

  // Posiciones
  const posiciones = j.posicion;
  if (!Array.isArray(posiciones) || posiciones.length === 0) {
    error('posicion_vacia', 'El jugador debe tener al menos una posición');
  } else {
    if (new Set(posiciones).size !== posiciones.length) error('posicion_repetida', 'Posiciones repetidas');
    const invalidas = posiciones.filter((p) => !incluye(POSICIONES, p));
    if (invalidas.length) error('posicion_invalida', `Posiciones desconocidas: ${invalidas.join(', ')}`);
    if (demarcacion === 'POR' && posiciones.some((p) => p !== 'POR')) {
      error('portero_posiciones', 'Un POR solo tiene la posición POR');
    }
    if (demarcacion !== 'POR' && posiciones.includes('POR')) {
      error('campo_en_porteria', 'Un jugador de campo no puede tener la posición POR');
    }
  }

  // Stats y media
  const claves = CLAVES_STATS[demarcacion];
  const stats = j.stats;
  let statsValidos = false;
  if (typeof stats !== 'object' || stats === null) {
    error('stats_claves', 'Los stats deben ser un objeto');
  } else {
    const recibidas = Object.keys(stats).sort();
    const esperadas = [...claves].sort();
    if (recibidas.length !== esperadas.length || recibidas.some((c, i) => c !== esperadas[i])) {
      error('stats_claves', `Los stats de un ${demarcacion} deben ser exactamente: ${claves.join(', ')}`);
    } else {
      const fuera = claves.filter((c) => {
        const v = (stats as Record<string, unknown>)[c];
        return !Number.isInteger(v) || (v as number) < 1 || (v as number) > 99;
      });
      if (fuera.length) error('stats_rango', `Stats fuera de 1–99 o no enteros: ${fuera.join(', ')}`);
      else statsValidos = true;
    }
  }
  if (statsValidos) {
    const media = calcularMedia({ demarcacion, stats: stats as Jugador['stats'] });
    if (typeof j.media !== 'number' || Math.abs(j.media - media) > 0.01) {
      error('media', `La media debe ser el promedio de los stats (${media.toFixed(2)})`);
    }
  }

  // Nivel y specials
  const nivel = j.nivel;
  if (!incluye(NIVELES, nivel)) error('nivel', `Nivel desconocido: ${String(nivel)}`);
  const specials = j.specials;
  if (!Array.isArray(specials)) {
    error('special_desconocido', 'Los specials deben ser una lista');
  } else {
    if (new Set(specials).size !== specials.length) error('specials_repetidos', 'Specials repetidos');
    if (incluye(NIVELES, nivel) && specials.length > MAX_SPECIALS[nivel]) {
      error('specials_maximo', `Un ${nivel} tiene como máximo ${MAX_SPECIALS[nivel]} specials`);
    }
    const desconocidos = specials.filter((s) => !incluye(TODOS_LOS_SPECIALS, s));
    if (desconocidos.length) error('special_desconocido', `Specials desconocidos: ${desconocidos.join(', ')}`);
    if (Array.isArray(posiciones)) {
      const permitidos = specialsPermitidos({ demarcacion, posicion: posiciones as Jugador['posicion'] });
      const noPermitidos = specials.filter((s) => incluye(TODOS_LOS_SPECIALS, s) && !permitidos.has(s));
      if (noPermitidos.length) {
        error('special_no_permitido', `Specials no permitidos para un ${demarcacion}: ${noPermitidos.join(', ')}`);
      }
    }
  }

  return errores;
}

export function validarColeccion(jugadores: unknown): ErrorCatalogo[] {
  if (!Array.isArray(jugadores)) {
    return [{ id: undefined, regla: 'campos', mensaje: 'La colección debe ser una lista de jugadores' }];
  }
  const errores: ErrorCatalogo[] = [];
  const vistos = new Set<unknown>();
  for (const j of jugadores) {
    errores.push(...validarJugador(j));
    const id = (j as { id?: unknown } | null)?.id;
    if (vistos.has(id)) errores.push({ id, regla: 'id_repetido', mensaje: `Id repetido: ${String(id)}` });
    vistos.add(id);
  }
  return errores;
}
