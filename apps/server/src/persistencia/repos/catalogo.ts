/**
 * Catálogo en memoria: se carga una vez al arrancar (el catálogo no cambia en ejecución).
 *
 * Cada partida ve las cartas en su versión de catálogo (spec 005, FR-036): `enVersion(1)` da las cartas de antes de
 * la spec 005, sin defectos ni virtudes nuevas.
 */
import { cartaEnVersion, VERSION_CATALOGO_ACTUAL, type Jugador } from '@fbd/domain';
import { filaAJugador } from '../../http/catalogo';
import type { BaseDatos } from '../db';
import { jugadores } from '../esquema/index';

export class Catalogo {
  private readonly vistas = new Map<number, Catalogo>();

  private constructor(
    private readonly porId: ReadonlyMap<number, Jugador>,
    readonly version = VERSION_CATALOGO_ACTUAL,
  ) {}

  /** El mismo catálogo con las cartas en una versión anterior (se calcula una vez por versión). */
  enVersion(version: number): Catalogo {
    if (version >= this.version) return this;
    let vista = this.vistas.get(version);
    if (!vista) {
      vista = new Catalogo(new Map([...this.porId].map(([id, j]) => [id, cartaEnVersion(j, version)])), version);
      this.vistas.set(version, vista);
    }
    return vista;
  }

  static async cargar(db: BaseDatos): Promise<Catalogo> {
    const filas = await db.select().from(jugadores);
    return new Catalogo(new Map(filas.map((f) => [f.id, filaAJugador(f) as Jugador])));
  }

  static desdeLista(lista: readonly Jugador[]): Catalogo {
    return new Catalogo(new Map(lista.map((j) => [j.id, j])));
  }

  jugador(id: number): Jugador {
    const j = this.porId.get(id);
    if (!j) throw new Error(`Jugador desconocido: ${id}`);
    return j;
  }

  /** Jugadores de las colecciones indicadas (FR-015). */
  pool(colecciones: readonly string[]): Jugador[] {
    return [...this.porId.values()].filter((j) => colecciones.includes(j.coleccion));
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
      demarcacion: j.demarcacion,
      posicion: j.posicion,
      media: j.media,
      nivel: j.nivel,
      virtudes: j.virtudes,
      defectos: j.defectos,
      stats: j.stats as unknown as Record<string, number>,
    };
  }

  get tamano(): number {
    return this.porId.size;
  }
}
