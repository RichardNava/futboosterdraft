/**
 * Validación del catálogo de jugadores (FR-016 a FR-024; spec 005, FR-011, FR-013, FR-040). El seed rechaza el
 * fichero entero si cualquier jugador incumple una regla. Los avisos de colección (`avisosColeccion`) no lo rechazan.
 */
import { PAREJAS_INCOMPATIBLES, REPARTO_DEFECTOS } from './rasgos';
import {
  CLAVES_STATS,
  DEFECTOS,
  DEMARCACIONES,
  MAX_DEFECTOS,
  MAX_VIRTUDES,
  NIVELES,
  POSICIONES,
  TODAS_LAS_VIRTUDES,
  calcularMedia,
  virtudesPermitidas,
  type Jugador,
  type Nivel,
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
  | 'virtudes_repetidas'
  | 'virtudes_maximo'
  | 'virtud_desconocida'
  | 'virtud_no_permitida'
  | 'defecto_desconocido'
  | 'defectos_repetidos'
  | 'defectos_maximo'
  | 'rasgos_incompatibles'
  | 'reparto_defectos'
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
  'virtudes',
  'defectos',
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

  // Nivel y virtudes
  const nivel = j.nivel;
  if (!incluye(NIVELES, nivel)) error('nivel', `Nivel desconocido: ${String(nivel)}`);
  const virtudes = j.virtudes;
  if (!Array.isArray(virtudes)) {
    error('virtud_desconocida', 'Las virtudes deben ser una lista');
  } else {
    if (new Set(virtudes).size !== virtudes.length) error('virtudes_repetidas', 'Virtudes repetidas');
    if (incluye(NIVELES, nivel) && virtudes.length > MAX_VIRTUDES[nivel]) {
      error('virtudes_maximo', `Un ${nivel} tiene como máximo ${MAX_VIRTUDES[nivel]} virtudes`);
    }
    const desconocidos = virtudes.filter((s) => !incluye(TODAS_LAS_VIRTUDES, s));
    if (desconocidos.length) error('virtud_desconocida', `Virtudes desconocidas: ${desconocidos.join(', ')}`);
    if (Array.isArray(posiciones)) {
      const permitidos = virtudesPermitidas({ demarcacion, posicion: posiciones as Jugador['posicion'] });
      const noPermitidos = virtudes.filter((s) => incluye(TODAS_LAS_VIRTUDES, s) && !permitidos.has(s));
      if (noPermitidos.length) {
        error('virtud_no_permitida', `Virtudes no permitidas para un ${demarcacion}: ${noPermitidos.join(', ')}`);
      }
    }
  }

  // Defectos (spec 005)
  const defectos = j.defectos;
  if (!Array.isArray(defectos)) {
    error('defecto_desconocido', 'Los defectos deben ser una lista');
  } else {
    if (new Set(defectos).size !== defectos.length) error('defectos_repetidos', 'Defectos repetidos');
    if (defectos.length > MAX_DEFECTOS) error('defectos_maximo', `Como máximo ${MAX_DEFECTOS} defectos`);
    const desconocidos = defectos.filter((d) => !incluye(DEFECTOS, d));
    if (desconocidos.length) error('defecto_desconocido', `Defectos desconocidos: ${desconocidos.join(', ')}`);
  }
  if (Array.isArray(virtudes) && Array.isArray(defectos)) {
    const rasgos = new Set<unknown>([...virtudes, ...defectos]);
    const choques = PAREJAS_INCOMPATIBLES.filter(([a, b]) => rasgos.has(a) && rasgos.has(b));
    if (choques.length) error('rasgos_incompatibles', `Rasgos incompatibles: ${choques.map(([a, b]) => `${a} y ${b}`).join(', ')}`);
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

/** Tolerancia, en puntos porcentuales, del aviso `reparto_defectos`. */
const TOLERANCIA_REPARTO = 0.05;

/** Proporción de cartas con algún defecto en cada nivel presente en la colección. */
export function proporcionDefectosPorNivel(jugadores: readonly Jugador[]): Partial<Record<Nivel, number>> {
  const r: Partial<Record<Nivel, number>> = {};
  for (const n of NIVELES) {
    const delNivel = jugadores.filter((j) => j.nivel === n);
    if (delNivel.length) r[n] = delNivel.filter((j) => j.defectos.length > 0).length / delNivel.length;
  }
  return r;
}

/**
 * Avisos de una colección válida (no la rechazan). `reparto_defectos`: la proporción de cartas con defectos no crece
 * con el nivel (con una tolerancia de ±5 puntos) o se aleja más de 5 puntos de `REPARTO_DEFECTOS` (FR-012, SC-008).
 */
export function avisosColeccion(jugadores: readonly Jugador[]): ErrorCatalogo[] {
  const avisos: ErrorCatalogo[] = [];
  const proporcion = proporcionDefectosPorNivel(jugadores);
  const presentes = NIVELES.filter((n) => proporcion[n] !== undefined);
  for (let i = 1; i < presentes.length; i++) {
    const anterior = presentes[i - 1]!;
    const nivel = presentes[i]!;
    if (proporcion[nivel]! + TOLERANCIA_REPARTO < proporcion[anterior]!) {
      avisos.push({ id: undefined, regla: 'reparto_defectos', mensaje: `Hay menos cartas con defectos en ${nivel} que en ${anterior}` });
    }
  }
  for (const n of presentes) {
    if (Math.abs(proporcion[n]! - REPARTO_DEFECTOS[n].conDefecto) > TOLERANCIA_REPARTO) {
      const pct = (x: number) => `${Math.round(x * 100)} %`;
      avisos.push({
        id: undefined,
        regla: 'reparto_defectos',
        mensaje: `${n}: ${pct(proporcion[n]!)} de cartas con defectos (se espera ${pct(REPARTO_DEFECTOS[n].conDefecto)})`,
      });
    }
  }
  return avisos;
}
