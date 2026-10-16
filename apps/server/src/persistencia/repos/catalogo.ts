/**
 * Catálogo en memoria: se carga una vez al arrancar (el catálogo no cambia en ejecución).
 */
import type { Jugador } from '@fbd/domain';
import { filaAJugador } from '../../http/catalogo';
import type { BaseDatos } from '../db';
import { jugadores } from '../esquema/index';

export class Catalogo {
  private constructor(private readonly porId: ReadonlyMap<number, Jugador>) {}

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
      specials: j.specials,
      stats: j.stats as unknown as Record<string, number>,
    };
  }

  get tamano(): number {
    return this.porId.size;
  }
}
