/**
 * Temporizadores cortos (turno de draft, preparación, descanso, búsqueda). Trabajan con la hora
 * absoluta `venceEn`, que se persiste; al rehidratar un actor tras un reinicio se reprograman con esa
 * misma hora (si ya pasó, vencen inmediatamente).
 */
import type { Reloj } from './reloj';

export class Temporizadores {
  private readonly activos = new Map<string, () => void>();

  constructor(private readonly reloj: Reloj) {}

  /** Programa (o reprograma) el temporizador `clave` para que venza en `venceEnMs`. */
  programar(clave: string, venceEnMs: number, alVencer: () => void): void {
    this.cancelar(clave);
    const cancelar = this.reloj.programar(venceEnMs, () => {
      this.activos.delete(clave);
      alVencer();
    });
    this.activos.set(clave, cancelar);
  }

  cancelar(clave: string): void {
    this.activos.get(clave)?.();
    this.activos.delete(clave);
  }

  cancelarTodos(): void {
    for (const cancelar of this.activos.values()) cancelar();
    this.activos.clear();
  }

  activo(clave: string): boolean {
    return this.activos.has(clave);
  }
}
