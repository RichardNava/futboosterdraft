/**
 * Secuencia de la animación de un cruce de duelos (spec 005, T077; FR-067; contracts/ui.md). Lógica pura: tiempos de
 * cada fase por velocidad, orden de los puestos (de portero a delanteros) y estado en un instante, para que la pantalla
 * solo pinte lo que dice esta función.
 */

export type Velocidad = 1 | 2;
export type FaseDuelo = 'entrada' | 'choque' | 'recuento' | 'resultado';

/** Duración de cada fase a velocidad ×1, en milisegundos (contracts/ui.md). */
export const DURACION_FASE: Readonly<Record<FaseDuelo, number>> = { entrada: 300, choque: 120, recuento: 600, resultado: 1480 };
/** Con `prefers-reduced-motion`, un fundido entre duelos. */
export const FUNDIDO_REDUCIDO_MS = 150;
/** Tiempo que se ve el resultado de cada duelo con movimiento reducido. */
const RESULTADO_REDUCIDO_MS = 900;

const FASES: readonly FaseDuelo[] = ['entrada', 'choque', 'recuento', 'resultado'];

/** Duración de un duelo completo a una velocidad (≈ 2,5 s a ×1). */
export function duracionDuelo(velocidad: Velocidad, reducido = false): number {
  if (reducido) return (FUNDIDO_REDUCIDO_MS + RESULTADO_REDUCIDO_MS) / velocidad;
  return FASES.reduce((s, f) => s + DURACION_FASE[f], 0) / velocidad;
}

export interface Instante {
  /** Duelo que se está viendo (0..n−1), o n si ya terminó la secuencia. */
  indice: number;
  fase: FaseDuelo;
  /** Progreso de la fase actual, 0..1. */
  progreso: number;
  terminado: boolean;
}

/** Qué se ve tras `ms` de reproducción de `n` duelos. */
export function instante(ms: number, n: number, velocidad: Velocidad, reducido = false): Instante {
  const porDuelo = duracionDuelo(velocidad, reducido);
  const indice = Math.floor(Math.max(0, ms) / porDuelo);
  if (indice >= n) return { indice: n, fase: 'resultado', progreso: 1, terminado: true };
  let t = Math.max(0, ms) - indice * porDuelo;
  if (reducido) {
    const fundido = FUNDIDO_REDUCIDO_MS / velocidad;
    return t < fundido
      ? { indice, fase: 'entrada', progreso: t / fundido, terminado: false }
      : { indice, fase: 'resultado', progreso: 1, terminado: false };
  }
  for (const f of FASES) {
    const d = DURACION_FASE[f] / velocidad;
    if (t < d) return { indice, fase: f, progreso: t / d, terminado: false };
    t -= d;
  }
  return { indice, fase: 'resultado', progreso: 1, terminado: false };
}

/** Marcador de duelos ganados con los duelos ya resueltos en un instante (cuenta el actual desde su resultado). */
export function marcadorEn(ganadores: readonly ('local' | 'visitante' | 'nulo')[], i: Instante): { local: number; visitante: number } {
  const vistos = ganadores.slice(0, i.terminado ? ganadores.length : i.indice + (i.fase === 'resultado' ? 1 : 0));
  return { local: vistos.filter((g) => g === 'local').length, visitante: vistos.filter((g) => g === 'visitante').length };
}

/** Valor que se muestra durante el recuento de una puntuación (cuenta hasta su valor). */
export function valorContado(final: number, i: Instante): number {
  if (i.fase === 'entrada' || i.fase === 'choque') return 0;
  if (i.fase === 'recuento') return Math.round(final * i.progreso);
  return final;
}

/** Duración de la ruleta del estado de forma a ×1 (spec 007, FR-012): ocupa el principio de la fase de resultado. */
export const DURACION_RULETA_MS = 800;
/** Amplitud de la forma con los parámetros neutros (± 2,00 puntos); la ruleta gira dentro de ella. */
export const RANGO_RULETA = 200;
/** Saltos de la ruleta hasta pararse (los mismos tics que su sonido). */
const SALTOS_RULETA = 12;

/** ¿Gira la ruleta en este instante?, y su progreso (0..1). Sin estado de forma en el cruce, la pantalla no la usa. */
export function ruletaEn(i: Instante, velocidad: Velocidad): { girando: boolean; progreso: number } {
  if (i.fase !== 'resultado' || i.terminado) return { girando: false, progreso: i.fase === 'resultado' ? 1 : 0 };
  const tiempoFase = (i.progreso * DURACION_FASE.resultado) / velocidad;
  const progreso = Math.min(1, tiempoFase / (DURACION_RULETA_MS / velocidad));
  return { girando: progreso < 1, progreso };
}

/**
 * Valor que enseña la ruleta: salta entre valores al azar (deterministas por `semilla`) cada vez más despacio
 * (desaceleración `1 − (1 − p)³`) y con el progreso completo se para en `final`, el que calculó el servidor.
 */
export function valorRuleta(final: number, progreso: number, semilla: number): number {
  if (progreso >= 1) return final;
  const salto = Math.floor(SALTOS_RULETA * (1 - (1 - Math.max(0, progreso)) ** 3));
  const rango = Math.max(RANGO_RULETA, Math.abs(final));
  let h = Math.imul(semilla + 1, 2654435761) ^ Math.imul(salto + 1, 1597334677);
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return (h % (2 * rango + 1)) - rango;
}

/** Centésimas a puntos con dos decimales y coma: 8123 → «81,23». */
export function puntos(centesimas: number): string {
  const signo = centesimas < 0 ? '−' : '';
  const abs = Math.abs(centesimas);
  return `${signo}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}
