/**
 * Cosméticos: escudos y diseños de sobre (spec 011, data-model §1 y §4). Solo presentación: no cambian el juego (FR-016).
 */

/** Añadir un tipo nuevo (FR-022) solo exige ampliar esta unión, el check de la BD y su selector. */
export type TipoCosmetico = 'escudo' | 'sobre' | 'celebracion';

/** Datos propios de una celebración de gol (spec 012, data-model §2). */
export interface DatosCelebracion {
  /** `juego`: animada por el cliente (registro de componentes); `secuencia`: vídeo con alfa. */
  clase: 'juego' | 'secuencia';
  /** Duración a ×1. Las de juego, ≤ 3000 (FR-009). */
  duracionMs: number;
  /** Efecto de sonido propio (solo secuencias); si falta, suena el del gol. */
  sonido?: string;
}

/** Celebración por defecto, la de los NPC y la de quien no ha elegido (FR-012). */
export const CELEBRACION_DEL_JUEGO = 'celebracion-clasica';

/** Duración máxima de una celebración de juego (FR-009). */
export const DURACION_MAXIMA_CELEBRACION_JUEGO_MS = 3000;

/** Cómo se resuelven las lesiones y expulsiones propias contra un NPC (spec 012, FR-020). */
export type ModoIncidencias = 'automatico' | 'control_total';
export const MODO_INCIDENCIAS_POR_DEFECTO: ModoIncidencias = 'automatico';

export interface Cosmetico {
  id: string;
  tipo: TipoCosmetico;
  nombre: string;
  gratuito: boolean;
  precioCentimos: number | null;
  precioFragmentos: number | null;
  /** false = retirado: no se vende ni se ofrece a quien no lo tiene. */
  activo: boolean;
  orden: number;
  /** Solo celebraciones (spec 012). */
  datos?: DatosCelebracion | null;
}

export interface PackCosmeticos {
  id: string;
  tipo: TipoCosmetico;
  nombre: string;
  cosmeticos: string[];
  /** Los packs solo se pagan con euros (research R10). */
  precioCentimos: number;
  activo: boolean;
}

/** Preferencias de sobre de una cuenta (columnas de `perfiles_usuario`). */
export interface PreferenciasSobre {
  sobreFavorito: string | null;
  sobreCarrusel: boolean;
  sobresMarcados: string[];
  /** Lo que queda por salir en la vuelta actual del carrusel. */
  sobreBaraja: string[];
  /** Último diseño servido, para no repetirlo al cambiar de vuelta. */
  sobreUltimo: string | null;
}

/** Sobre por defecto, gratuito y único disponible para los invitados. */
export const SOBRE_ORIGINAL = 'sobre-original';
