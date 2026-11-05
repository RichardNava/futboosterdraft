/**
 * Cosméticos: escudos y diseños de sobre (spec 011, data-model §1 y §4). Solo presentación: no cambian el juego (FR-016).
 */

/** Añadir un tipo nuevo (FR-022) solo exige ampliar esta unión, el check de la BD y su selector. */
export type TipoCosmetico = 'escudo' | 'sobre';

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
