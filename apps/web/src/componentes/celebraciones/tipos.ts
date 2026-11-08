/** Tipos y reglas de las celebraciones de gol (spec 012, contracts/ui.md «CapaCelebracion»). */
import { CELEBRACION_DEL_JUEGO, DURACION_MAXIMA_CELEBRACION_JUEGO_MS, type DatosCelebracion } from '@fbd/domain';

export interface CelebracionElegida {
  id: string;
  datos: DatosCelebracion;
}

export interface EquipoCelebracion {
  nombre: string;
  escudo?: string | null;
  color: string;
}

/** Lo que recibe cada celebración animada por el juego. */
export interface PropsJuego {
  equipo: EquipoCelebracion;
  goleador: string;
}

/**
 * Qué se reproduce: una de juego del registro (un id desconocido, o una secuencia que no se puede ver, cae a la del
 * juego) o el vídeo de una secuencia.
 */
export function planCelebracion(
  c: CelebracionElegida,
  registradas: ReadonlySet<string>,
  falloVideo = false,
): { clase: 'juego' | 'secuencia'; id: string } {
  if (c.datos.clase === 'secuencia' && !falloVideo) return { clase: 'secuencia', id: c.id };
  if (c.datos.clase === 'juego' && registradas.has(c.id)) return { clase: 'juego', id: c.id };
  return { clase: 'juego', id: CELEBRACION_DEL_JUEGO };
}

/**
 * Duración real en ms: las de juego, como mucho 3 s (FR-009). No depende de la velocidad de reproducción (spec 012,
 * ronda 2: a x8 no daba tiempo a verla): el reloj de la 2D se para ese tiempo en cada gol.
 */
export function duracionCelebracion(datos: DatosCelebracion, clase: 'juego' | 'secuencia' = datos.clase): number {
  return clase === 'juego' ? Math.min(datos.duracionMs, DURACION_MAXIMA_CELEBRACION_JUEGO_MS) : datos.duracionMs;
}

/** Ficheros de una secuencia, derivados del id: WebM VP9 con alfa y, para Safari, MOV HEVC con alfa. */
export const fuentesSecuencia = (id: string) => [
  { src: `/cosmeticos/celebraciones/${id}.webm`, type: 'video/webm' },
  { src: `/cosmeticos/celebraciones/${id}.mov`, type: 'video/quicktime; codecs="hvc1"' },
];
