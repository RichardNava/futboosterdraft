/**
 * Reloj de reproducción del partido 2D (T137; research R11): avanza el tick de juego según la velocidad
 * efectiva (x2 … x32 segundos de juego por segundo real), sin pasar del final del último tramo
 * recibido, y avisa al servidor de por dónde va cada ~500 ms con `partido.reproduccion`.
 */
export const INTERVALO_INFORME_MS = 500;

export class RelojReproduccion {
  /** Tick de juego que se está mostrando. */
  tick = 0;
  /** Hasta dónde se puede reproducir (final del último tramo recibido). */
  limite = 0;
  velocidad = 4;
  private ultimoPaso: number | null = null;
  private ultimoInforme = -Infinity;
  private ultimoTickInformado = -1;

  constructor(private readonly informar: (tick: number) => void) {}

  /** Llega un tramo nuevo: se puede reproducir hasta su final. */
  ampliar(hastaTick: number): void {
    this.limite = Math.max(this.limite, hastaTick);
  }

  /** Coloca el reloj en un tick (p. ej. al reconectar, al principio del último tramo). */
  situar(tick: number): void {
    this.tick = Math.min(tick, this.limite);
  }

  /** ¿Ha llegado al final de lo recibido? (esperando al rival o al siguiente tramo). */
  get enEspera(): boolean {
    return this.tick >= this.limite;
  }

  /** Avanza según el tiempo real transcurrido; se llama en cada fotograma de animación. */
  paso(ahoraMs: number): number {
    if (this.ultimoPaso !== null) {
      const segundosReales = Math.min(0.25, (ahoraMs - this.ultimoPaso) / 1000);
      this.tick = Math.min(this.limite, this.tick + segundosReales * this.velocidad);
    }
    this.ultimoPaso = ahoraMs;
    // Se informa a intervalos y, sin falta, en cuanto se llega a la interrupción.
    const llego = this.tick >= this.limite && this.ultimoTickInformado < this.limite;
    if (llego || (ahoraMs - this.ultimoInforme >= INTERVALO_INFORME_MS && this.tick !== this.ultimoTickInformado)) {
      this.ultimoInforme = ahoraMs;
      this.ultimoTickInformado = this.tick;
      // Sin redondear: al llegar a la interrupción, el servidor compara con el tick exacto en que acaba el tramo.
      this.informar(this.tick);
    }
    return this.tick;
  }

  /** La pestaña vuelve a estar visible: no se recupera de golpe el tiempo en segundo plano. */
  reanudar(): void {
    this.ultimoPaso = null;
  }
}
