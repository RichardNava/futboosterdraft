/** Pase premium (spec 013, FR-034 a FR-036; data-model §2.6). Instantes en milisegundos desde la época. */

export interface EstadoPremium {
  /** null = nunca comprado. */
  fin: number | null;
  cortesia: boolean;
}

export function premiumActivo(e: EstadoPremium, ahora: number): boolean {
  return e.cortesia || (e.fin !== null && e.fin > ahora);
}

/** Nuevo fin al comprar: si está activo suma los días a su fin; si no, cuenta desde ahora. */
export function nuevoFin(e: EstadoPremium, ahora: number, dias: number): number {
  return Math.max(ahora, e.fin ?? 0) + dias * 24 * 60 * 60 * 1000;
}
