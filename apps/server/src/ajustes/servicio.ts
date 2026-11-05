/**
 * Ajustes de operación (spec 011, research R12): de momento, la identidad de las cartas. Se leen de la tabla
 * `ajustes` con una caché de 30 s, así que un cambio con `pnpm --filter @fbd/server ajuste` llega a todos los
 * servidores en ≤ 30 s sin reiniciar (FR-018, SC-008). Sin fila, «real».
 */
import { IDENTIDADES, type Identidad } from '@fbd/domain';
import { eq } from 'drizzle-orm';
import type { BaseDatos } from '../persistencia/db';
import { ajustes } from '../persistencia/esquema/index';

export const CLAVE_IDENTIDAD = 'identidad_cartas';
export const CADUCIDAD_MS = 30_000;

export class ServicioAjustes {
  private cache: { valor: Identidad; leidoEn: number } | null = null;

  constructor(
    private readonly db: BaseDatos,
    private readonly ahora: () => number = Date.now,
  ) {}

  /** Identidad vigente, leída de la BD si la caché ha caducado. */
  async identidadCartas(): Promise<Identidad> {
    if (this.cache && this.ahora() - this.cache.leidoEn < CADUCIDAD_MS) return this.cache.valor;
    const [fila] = await this.db.select({ valor: ajustes.valor }).from(ajustes).where(eq(ajustes.clave, CLAVE_IDENTIDAD));
    const valor = IDENTIDADES.includes(fila?.valor as Identidad) ? (fila!.valor as Identidad) : 'real';
    this.cache = { valor, leidoEn: this.ahora() };
    return valor;
  }

  /** Última identidad leída, sin esperar a la BD (las rutas la refrescan antes con `identidadCartas`). */
  actual(): Identidad {
    return this.cache?.valor ?? 'real';
  }
}
