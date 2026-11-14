/**
 * Catálogo de cosméticos en memoria y disponibilidad por cuenta (spec 011, data-model §1 y §2).
 *
 * El catálogo (cosméticos y packs) se carga al arrancar, como `Catalogo`; la posesión se lee de la BD en cada consulta.
 * Disponibles para una cuenta registrada = gratuitos activos ∪ poseídos (activos o retirados). Para un invitado =
 * escudos gratuitos activos y solo `sobre-original`.
 */
import { SOBRE_ORIGINAL, type Cosmetico, type PackCosmeticos, type TipoCosmetico } from '@fbd/domain';
import { eq } from 'drizzle-orm';
import type { BaseDatos, Ejecutor } from '../db';
import { cosmeticos, cosmeticosUsuario, packsCosmeticos } from '../esquema/index';

/** Quién pide: basta con el id y si es invitado. */
interface Solicitante {
  id: string;
  tipo: 'registrado' | 'invitado';
}

/** Cosméticos del catálogo en memoria y los que posee cada usuario. */
export class RepoCosmeticos {
  private constructor(
    private readonly db: BaseDatos,
    private readonly porId: ReadonlyMap<string, Cosmetico>,
    readonly packs: readonly PackCosmeticos[],
  ) {}

  /** Catálogo de pruebas, sin leer la BD. */
  static desdeLista(db: BaseDatos, lista: readonly Cosmetico[] = [], packs: readonly PackCosmeticos[] = []): RepoCosmeticos {
    return new RepoCosmeticos(db, new Map(lista.map((c) => [c.id, c])), packs);
  }

  /** Lee los cosméticos y los packs de la base de datos. */
  static async cargar(db: BaseDatos): Promise<RepoCosmeticos> {
    const filas = await db.select().from(cosmeticos);
    const packs = await db.select().from(packsCosmeticos);
    const lista = filas.sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id));
    return new RepoCosmeticos(db, new Map(lista.map((c) => [c.id, c])), packs);
  }

  /** Cosmético por id. */
  cosmetico(id: string): Cosmetico | undefined {
    return this.porId.get(id);
  }

  /** Todos los cosméticos. */
  todos(): Cosmetico[] {
    return [...this.porId.values()];
  }

  /** Pack por id. */
  pack(id: string): PackCosmeticos | undefined {
    return this.packs.find((p) => p.id === id);
  }

  /** Gratuitos activos de un tipo, ordenados por `orden` (la lista de `escudoAsignado`). */
  gratuitos(tipo: TipoCosmetico): string[] {
    return this.todos()
      .filter((c) => c.tipo === tipo && c.gratuito && c.activo)
      .map((c) => c.id);
  }

  /** Ids de los cosméticos del usuario. */
  async poseidos(usuarioId: string, tx: Ejecutor = this.db): Promise<Set<string>> {
    const filas = await tx.select({ id: cosmeticosUsuario.cosmeticoId }).from(cosmeticosUsuario).where(eq(cosmeticosUsuario.usuarioId, usuarioId));
    return new Set(filas.map((f) => f.id));
  }

  /** Ids disponibles para quien pide, de un tipo o de todos. */
  async disponibles(quien: Solicitante | null, tipo?: TipoCosmetico, tx?: Ejecutor): Promise<Set<string>> {
    const deTipo = (c: Cosmetico): boolean => tipo === undefined || c.tipo === tipo;
    if (!quien || quien.tipo === 'invitado') {
      return new Set(this.todos().filter((c) => deTipo(c) && c.activo && c.gratuito && (c.tipo === 'escudo' || c.id === SOBRE_ORIGINAL)).map((c) => c.id));
    }
    const poseidos = await this.poseidos(quien.id, tx);
    return new Set(this.todos().filter((c) => deTipo(c) && ((c.gratuito && c.activo) || poseidos.has(c.id))).map((c) => c.id));
  }

  /** El cosmético es de ese tipo y quien lo pide puede usarlo (gratuito o suyo). */
  async estaDisponible(quien: Solicitante | null, id: string, tipo: TipoCosmetico, tx?: Ejecutor): Promise<boolean> {
    if (this.porId.get(id)?.tipo !== tipo) return false;
    return (await this.disponibles(quien, tipo, tx)).has(id);
  }
}
