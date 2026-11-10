/**
 * Ajustes de operación (spec 011, research R12; spec 013, R6): claves conocidas con su valor por defecto. Se leen de
 * la tabla `ajustes` con una caché de 30 s, así que un cambio con `pnpm --filter @fbd/server ajuste` llega a todos los
 * servidores en ≤ 30 s sin reiniciar (FR-018, SC-008). Sin fila (o con un valor desconocido), el valor por defecto.
 */
import { IDENTIDADES, type AccesoNivel, type Identidad } from '@fbd/domain';
import { eq } from 'drizzle-orm';
import type { BaseDatos } from '../persistencia/db';
import { ajustes } from '../persistencia/esquema/index';

export const CLAVE_IDENTIDAD = 'identidad_cartas';
export const CLAVE_ACCESO_RAREZA = 'acceso_niveles_rareza';
export const CADUCIDAD_MS = 30_000;

/** Valores admitidos de cada clave; el primero es el valor por defecto. */
export const AJUSTES_CONOCIDOS = {
  [CLAVE_IDENTIDAD]: IDENTIDADES as readonly Identidad[],
  [CLAVE_ACCESO_RAREZA]: ['libre', 'restringido'] as readonly AccesoNivel[],
} as const;
export type ClaveAjuste = keyof typeof AJUSTES_CONOCIDOS;

export class ServicioAjustes {
  private readonly cache = new Map<ClaveAjuste, { valor: string; leidoEn: number }>();

  constructor(
    private readonly db: BaseDatos,
    private readonly ahora: () => number = Date.now,
  ) {}

  private async leer(clave: ClaveAjuste): Promise<string> {
    const c = this.cache.get(clave);
    if (c && this.ahora() - c.leidoEn < CADUCIDAD_MS) return c.valor;
    const [fila] = await this.db.select({ valor: ajustes.valor }).from(ajustes).where(eq(ajustes.clave, clave));
    const admitidos: readonly string[] = AJUSTES_CONOCIDOS[clave];
    const leido = typeof fila?.valor === 'string' ? fila.valor : '';
    const valor = admitidos.includes(leido) ? leido : admitidos[0]!;
    this.cache.set(clave, { valor, leidoEn: this.ahora() });
    return valor;
  }

  /** Identidad vigente, leída de la BD si la caché ha caducado. */
  async identidadCartas(): Promise<Identidad> {
    return (await this.leer(CLAVE_IDENTIDAD)) as Identidad;
  }

  /** Acceso a los niveles de rareza distintos de Moderado (spec 013, FR-019); sin fila, `libre`. */
  async accesoNivelesRareza(): Promise<AccesoNivel> {
    return (await this.leer(CLAVE_ACCESO_RAREZA)) as AccesoNivel;
  }

  /** Última identidad leída, sin esperar a la BD (las rutas la refrescan antes con `identidadCartas`). */
  actual(): Identidad {
    return (this.cache.get(CLAVE_IDENTIDAD)?.valor as Identidad | undefined) ?? 'real';
  }
}
