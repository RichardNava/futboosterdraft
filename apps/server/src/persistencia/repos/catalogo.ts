/**
 * Catálogo en memoria: se carga una vez al arrancar (el catálogo no cambia en ejecución).
 *
 * Cada partida ve las cartas en su versión de catálogo (spec 005, FR-036): `enVersion(1)` da las cartas de antes de
 * la spec 005, sin defectos ni virtudes nuevas.
 *
 * La pertenencia a colecciones viene de `colecciones_cartas` (spec 006, R1): una carta puede estar en varias.
 */
import { cartaEnVersion, VERSION_CATALOGO_ACTUAL, type Jugador } from '@fbd/domain';
import { filaAJugador } from '../../http/catalogo';
import type { BaseDatos } from '../db';
import { coleccionesCartas, jugadores } from '../esquema/index';

/** Id de la colección básica. */
export const COLECCION_CORE = 'core';

export class Catalogo {
  private readonly vistas = new Map<number, Catalogo>();

  private constructor(
    private readonly porId: ReadonlyMap<number, Jugador>,
    /** Colecciones de cada carta. */
    private readonly pertenencia: ReadonlyMap<number, readonly string[]>,
    readonly version = VERSION_CATALOGO_ACTUAL,
  ) {}

  /** El mismo catálogo con las cartas en una versión anterior (se calcula una vez por versión). */
  enVersion(version: number): Catalogo {
    if (version >= this.version) return this;
    let vista = this.vistas.get(version);
    if (!vista) {
      vista = new Catalogo(new Map([...this.porId].map(([id, j]) => [id, cartaEnVersion(j, version)])), this.pertenencia, version);
      this.vistas.set(version, vista);
    }
    return vista;
  }

  static async cargar(db: BaseDatos): Promise<Catalogo> {
    const filas = await db.select().from(jugadores);
    const pertenencia = new Map<number, string[]>();
    for (const f of await db.select().from(coleccionesCartas)) {
      pertenencia.set(f.jugadorId, [...(pertenencia.get(f.jugadorId) ?? []), f.coleccionId]);
    }
    return new Catalogo(new Map(filas.map((f) => [f.id, filaAJugador(f) as Jugador])), pertenencia);
  }

  /** Catálogo de pruebas: sin `pertenencia`, todas las cartas son de Core. */
  static desdeLista(lista: readonly Jugador[], pertenencia?: ReadonlyMap<number, readonly string[]>): Catalogo {
    return new Catalogo(new Map(lista.map((j) => [j.id, j])), pertenencia ?? new Map(lista.map((j) => [j.id, [COLECCION_CORE]])));
  }

  jugador(id: number): Jugador {
    const j = this.porId.get(id);
    if (!j) throw new Error(`Jugador desconocido: ${id}`);
    return j;
  }

  /** Jugadores de las colecciones indicadas (FR-015). */
  pool(colecciones: readonly string[]): Jugador[] {
    return [...this.porId.values()].filter((j) => this.coleccionesDe(j.id).some((c) => colecciones.includes(c)));
  }

  /** Pool de una partida: la foto de la colección activa del anfitrión o, si no hay, sus colecciones (R12). */
  poolPartida(partida: { colecciones: readonly string[]; poolCartas?: readonly number[] | null }): Jugador[] {
    return partida.poolCartas ? partida.poolCartas.map((id) => this.jugador(id)) : this.pool(partida.colecciones);
  }

  coleccionesDe(jugadorId: number): readonly string[] {
    return this.pertenencia.get(jugadorId) ?? [];
  }

  /** Las cartas de Core no se pueden desfragmentar (FR-021). */
  esCore(jugadorId: number): boolean {
    return this.coleccionesDe(jugadorId).includes(COLECCION_CORE);
  }

  /** Ids de las cartas de una colección. */
  cartasDe(coleccionId: string): number[] {
    return [...this.porId.keys()].filter((id) => this.coleccionesDe(id).includes(coleccionId));
  }

  medias(ids: readonly number[]): Record<number, number> {
    return Object.fromEntries(ids.map((id) => [id, this.jugador(id).media]));
  }

  /** Datos de carta que se envían al cliente (`JugadorResumen`). */
  resumen(id: number) {
    const j = this.jugador(id);
    return {
      id: j.id,
      nombre: j.nombre,
      apellidos: j.apellidos,
      nombreCarta: j.nombre_carta,
      nacionalidad: j.nacionalidad,
      demarcacion: j.demarcacion,
      posicion: j.posicion,
      media: j.media,
      nivel: j.nivel,
      virtudes: j.virtudes,
      defectos: j.defectos,
      stats: j.stats as unknown as Record<string, number>,
      imagen: j.imagen,
      imagenBg: j.imagen_bg,
    };
  }

  get tamano(): number {
    return this.porId.size;
  }
}
