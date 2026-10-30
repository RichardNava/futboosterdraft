/**
 * Validación del catálogo de jugadores (FR-016 a FR-024; spec 005, FR-011, FR-013, FR-040). El seed rechaza el
 * fichero entero si cualquier jugador incumple una regla. Los avisos de colección (`avisosColeccion`) y el reparto de
 * Core frente a `DISTRIBUCION_CORE` (spec 008, R8) no lo rechazan.
 */
import { PAREJAS_INCOMPATIBLES, REPARTO_DEFECTOS } from './rasgos';
import { esSeleccion } from './selecciones';
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
  VERSIONES_CARTA,
  type Coleccion,
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
  | 'nombre_carta'
  | 'imagen'
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
  'nombre_carta',
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
  'imagen',
  'imagen_bg',
];

/** Rutas de imagen de una carta (contracts/datos-cartas.md). */
const RUTA_IMAGEN = /^\/cartas\/[a-z0-9/_-]+\.(svg|png|webp|jpg)$/;
const MAX_NOMBRE_CARTA = 24;

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
  if (!esSeleccion(j.nacionalidad)) {
    error('nacionalidad', `Nacionalidad desconocida: ${String(j.nacionalidad)} (debe ser un código de SELECCIONES)`);
  }
  if (typeof j.nombre_carta !== 'string' || j.nombre_carta.trim() === '' || j.nombre_carta.length > MAX_NOMBRE_CARTA) {
    error('nombre_carta', `"nombre_carta" debe ser un texto no vacío de ${MAX_NOMBRE_CARTA} caracteres como máximo`);
  }
  for (const campo of ['imagen', 'imagen_bg'] as const) {
    if (typeof j[campo] !== 'string' || !RUTA_IMAGEN.test(j[campo])) {
      error('imagen', `"${campo}" debe ser una ruta que empieza por /cartas/ (svg, png, webp o jpg)`);
    }
  }
  if (typeof j.fecha_nacimiento !== 'string' || !esFechaIsoValida(j.fecha_nacimiento)) {
    error('fecha_nacimiento', 'La fecha de nacimiento debe ser una fecha ISO válida (YYYY-MM-DD)');
  }
  if (!Number.isInteger(j.altura) || (j.altura as number) < 150 || (j.altura as number) > 215) {
    error('altura', 'La altura debe ser un entero entre 150 y 215 cm');
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

const ID_COLECCION = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface ResultadoCatalogo {
  /** Colecciones normalizadas: cada entrada de `cartas` como `{ id, version }` (R3). */
  colecciones: Coleccion[];
  errores: ErrorCatalogo[];
}

/**
 * Validación cruzada de cartas y colecciones (spec 006, data-model §1.2). `colecciones` es la lista del fichero
 * `data/colecciones.json` (`precio_centimos`, entradas de `cartas` como `id` o `{ id, version }`).
 */
export function validarCatalogo(cartas: readonly Pick<Jugador, 'id' | 'demarcacion' | 'nivel'>[], colecciones: unknown): ResultadoCatalogo {
  const errores: ErrorCatalogo[] = [];
  const error = (id: unknown, mensaje: string) => errores.push({ id, regla: 'coleccion', mensaje });
  if (!Array.isArray(colecciones)) {
    return { colecciones: [], errores: [{ id: undefined, regla: 'coleccion', mensaje: 'Las colecciones deben ser una lista' }] };
  }
  const porId = new Map(cartas.map((c) => [c.id, c]));
  const usadas = new Set<number>();
  const ids = new Set<string>();
  const normalizadas: Coleccion[] = [];

  for (const entrada of colecciones as Record<string, unknown>[]) {
    const id = entrada?.id;
    if (typeof id !== 'string' || !ID_COLECCION.test(id)) error(id, `Id de colección inválido: ${String(id)} (kebab-case sin tildes)`);
    else if (ids.has(id)) error(id, `Id de colección repetido: ${id}`);
    else ids.add(id);
    for (const campo of ['nombre', 'descripcion'] as const) {
      if (typeof entrada?.[campo] !== 'string' || (entrada[campo] as string).trim() === '') error(id, `"${campo}" vacío`);
    }
    const tipo = entrada?.tipo;
    if (tipo !== 'basica' && tipo !== 'pago') error(id, `Tipo de colección desconocido: ${String(tipo)}`);
    const precio = entrada?.precio_centimos;
    if (tipo === 'pago' && (!Number.isInteger(precio) || (precio as number) <= 0)) error(id, 'Una colección de pago necesita precio_centimos > 0');
    if (tipo === 'basica' && precio !== undefined) error(id, 'La colección básica no lleva precio');

    const lista: Coleccion['cartas'] = [];
    const vistas = new Set<number>();
    for (const c of Array.isArray(entrada?.cartas) ? (entrada.cartas as unknown[]) : []) {
      const carta = typeof c === 'number' ? { id: c, version: 'normal' } : (c as { id?: unknown; version?: unknown });
      const cid = carta?.id as number;
      if (!incluye(VERSIONES_CARTA, carta?.version)) error(id, `Versión desconocida de la carta ${String(cid)}: ${String(carta?.version)}`);
      if (!porId.has(cid)) error(id, `La carta ${String(cid)} no existe`);
      else if (vistas.has(cid)) error(id, `La carta ${cid} aparece dos veces`);
      else {
        vistas.add(cid);
        usadas.add(cid);
        lista.push({ id: cid, version: carta.version as Coleccion['cartas'][number]['version'] });
      }
    }
    if (!Array.isArray(entrada?.cartas) || lista.length === 0) error(id, 'La colección no tiene cartas');

    const destacadas = entrada?.destacadas;
    if (destacadas !== undefined && (!Array.isArray(destacadas) || destacadas.some((d) => !vistas.has(d as number)))) {
      error(id, 'Las destacadas deben ser cartas de la colección');
    }

    normalizadas.push({
      id: id as string,
      nombre: entrada?.nombre as string,
      descripcion: entrada?.descripcion as string,
      tipo: tipo as Coleccion['tipo'],
      ...(precio !== undefined ? { precioCentimos: precio as number } : {}),
      ...(Array.isArray(destacadas) ? { destacadas: destacadas as number[] } : {}),
      cartas: lista,
    });
  }

  const basicas = normalizadas.filter((c) => c.tipo === 'basica');
  // El reparto de Core frente a DISTRIBUCION_CORE solo avisa (informe del seed), no rechaza (spec 008, R8).
  if (basicas.length !== 1 || basicas[0]!.id !== 'core') {
    error(undefined, 'Debe haber exactamente una colección básica, con id "core"');
  }

  for (const c of cartas) {
    if (!usadas.has(c.id)) errores.push({ id: c.id, regla: 'coleccion', mensaje: `La carta ${c.id} no pertenece a ninguna colección` });
  }
  return { colecciones: normalizadas, errores };
}
