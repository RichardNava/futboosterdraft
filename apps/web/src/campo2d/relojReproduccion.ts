/**
 * Reloj de reproducción del partido 2D (research R2 y R6; SC-005, SC-006).
 *
 * - Avance lineal: `ticksPorSegundoX2 × velocidad / 2` ticks de juego por segundo real (23,5, 47 y 94 a x2,
 *   x4 y x8), así que todos los minutos de juego duran lo mismo y el partido dura 4, 2 o 1 minuto.
 * - Pausas anunciadas, que no avanzan el reloj de juego: «¡GOL!» (`pausaGolMs` reales a cualquier
 *   velocidad), el descanso y antes de la prórroga (hasta `continuar()`), y «Cargando…» si se vacía el
 *   búfer. Tras «Cargando…» sigue a la misma velocidad, sin acelerar para recuperar.
 * - Tanda de penaltis: cada lanzamiento ocupa 60 ticks en el motor y dura `tandaLanzamientoMsX2 × 2 /
 *   velocidad` reales.
 * - La velocidad por defecto es x2 y se recuerda la última elegida (`localStorage['fbd.velocidad2d']`).
 * - Informa al servidor de por dónde va (tick y velocidad) cada ~250 ms.
 */
export type Velocidad = 2 | 4 | 8;
export const VELOCIDADES: readonly Velocidad[] = [2, 4, 8];
export const CLAVE_VELOCIDAD = 'fbd.velocidad2d';
export const INTERVALO_INFORME_MS = 250;
/** Ticks del motor por lanzamiento de la tanda. */
export const TICKS_LANZAMIENTO = 60;
/** Tope del tiempo real de un paso (p. ej. si el navegador ha dejado de pintar un momento). */
const PASO_MAXIMO_S = 0.25;

export type MotivoPausa = 'gol' | 'descanso' | 'pre_prorroga';
export type EstadoReloj = 'reproduciendo' | 'gol' | 'descanso' | 'pre_prorroga' | 'cargando' | 'fin';

export interface OpcionesReloj {
  ticksPorSegundoX2?: number;
  pausaGolMs?: number;
  tandaLanzamientoMsX2?: number;
  velocidad?: Velocidad;
  /** Se llama cada ~250 ms (y al llegar a una pausa) con el tick que se muestra y la velocidad. */
  informar?: (tick: number, velocidad: Velocidad) => void;
}

/** Velocidad guardada (x2 si no hay ninguna o no se puede leer). */
export function velocidadGuardada(): Velocidad {
  try {
    const v = Number(globalThis.localStorage?.getItem(CLAVE_VELOCIDAD));
    return (VELOCIDADES as readonly number[]).includes(v) ? (v as Velocidad) : 2;
  } catch {
    return 2;
  }
}

function guardarVelocidad(v: Velocidad): void {
  try {
    globalThis.localStorage?.setItem(CLAVE_VELOCIDAD, String(v));
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): solo se pierde la preferencia.
  }
}

export class RelojReproduccion {
  /** Tick de juego que se está mostrando. */
  tick = 0;
  /** Hasta dónde se puede reproducir (final de lo recibido). */
  limite = 0;
  private _velocidad: Velocidad;
  private readonly ticksPorSegundoX2: number;
  private readonly pausaGolMs: number;
  private readonly tandaLanzamientoMsX2: number;
  private readonly informar: ((tick: number, velocidad: Velocidad) => void) | undefined;
  /** Pausas anunciadas aún no mostradas, por tick. */
  private readonly pausas = new Map<number, MotivoPausa>();
  /** Pausa en curso: el gol termina solo (`hasta` en ms reales); el descanso, con `continuar()`. */
  private pausa: { motivo: MotivoPausa; tick: number; hasta: number | null } | null = null;
  /** Ticks en los que ya se ha hecho una pausa (no se repiten). */
  private readonly hechas = new Set<string>();
  /** Tick en el que empieza la tanda de penaltis, si la hay. */
  private inicioTanda: number | null = null;
  /** Último tick del partido (al llegar, `fin` en vez de «Cargando…»). */
  private final: number | null = null;
  private ultimoPaso: number | null = null;
  private ultimoInforme = -Infinity;

  constructor(opciones: OpcionesReloj = {}) {
    this.ticksPorSegundoX2 = opciones.ticksPorSegundoX2 ?? 23.5;
    this.pausaGolMs = opciones.pausaGolMs ?? 2000;
    this.tandaLanzamientoMsX2 = opciones.tandaLanzamientoMsX2 ?? 3000;
    this._velocidad = opciones.velocidad ?? velocidadGuardada();
    this.informar = opciones.informar;
  }

  get velocidad(): Velocidad {
    return this._velocidad;
  }

  /** Cambia la velocidad al instante (sin tocar el tick en curso ni la pausa) y la recuerda. */
  set velocidad(v: Velocidad) {
    this._velocidad = v;
    guardarVelocidad(v);
  }

  /** Ticks de juego por segundo real a la velocidad actual (fuera de la tanda). */
  get ticksPorSegundo(): number {
    return (this.ticksPorSegundoX2 * this._velocidad) / 2;
  }

  /** Duración real de cada lanzamiento de la tanda: 3.000, 1.500 y 750 ms a x2, x4 y x8. */
  get duracionLanzamientoMs(): number {
    return (this.tandaLanzamientoMsX2 * 2) / this._velocidad;
  }

  /** Llegan datos nuevos: se puede reproducir hasta `hastaTick`. */
  ampliar(hastaTick: number): void {
    this.limite = Math.max(this.limite, hastaTick);
  }

  /** Coloca el reloj en un tick (al reconectar o al cargar una reproducción). */
  situar(tick: number): void {
    this.tick = Math.min(tick, this.limite);
  }

  /** Anuncia una pausa en un tick (un gol, el descanso o antes de la prórroga). */
  anunciarPausa(tick: number, motivo: MotivoPausa): void {
    if (!this.hechas.has(`${motivo}:${tick}`)) this.pausas.set(tick, motivo);
  }

  /** La tanda de penaltis empieza en este tick. */
  marcarTanda(tick: number): void {
    this.inicioTanda = tick;
  }

  /** El partido acaba en este tick. */
  marcarFinal(tick: number): void {
    this.final = tick;
    this.ampliar(tick);
  }

  /** «Seguir» o «Continuar» en el descanso o antes de la prórroga. */
  continuar(): void {
    if (this.pausa && this.pausa.hasta === null) this.pausa = null;
  }

  get estado(): EstadoReloj {
    if (this.pausa) return this.pausa.motivo;
    if (this.final !== null && this.tick >= this.final) return 'fin';
    if (this.tick >= this.limite) return 'cargando';
    return 'reproduciendo';
  }

  /** Gestión del equipo abierta (spec 003, FR-031): el reloj no avanza ni informa al servidor. */
  private detenido = false;

  get enGestion(): boolean {
    return this.detenido;
  }

  /** Se abre la gestión del equipo: la reproducción se detiene en el tick actual. */
  detener(): void {
    this.detenido = true;
  }

  /** Se cierra la gestión: la reproducción sigue en el mismo tick, sin recuperar el tiempo detenido. */
  seguirTrasGestion(): void {
    this.detenido = false;
    this.ultimoPaso = null;
  }

  /** Avanza según el tiempo real transcurrido; se llama en cada fotograma de animación. */
  paso(ahoraMs: number): number {
    if (this.detenido) {
      this.ultimoPaso = ahoraMs;
      return this.tick;
    }
    const dt = this.ultimoPaso === null ? 0 : Math.min(PASO_MAXIMO_S, Math.max(0, (ahoraMs - this.ultimoPaso) / 1000));
    this.ultimoPaso = ahoraMs;
    if (this.pausa?.hasta != null && ahoraMs >= this.pausa.hasta) this.pausa = null;
    if (!this.pausa && dt > 0) this.avanzarTicks(dt, ahoraMs);
    if (ahoraMs - this.ultimoInforme >= INTERVALO_INFORME_MS) {
      this.ultimoInforme = ahoraMs;
      this.informar?.(Math.floor(this.tick), this._velocidad);
    }
    return this.tick;
  }

  private avanzarTicks(dt: number, ahoraMs: number): void {
    const enTanda = this.inicioTanda !== null && this.tick >= this.inicioTanda;
    const ritmo = enTanda ? TICKS_LANZAMIENTO / (this.duracionLanzamientoMs / 1000) : this.ticksPorSegundo;
    let destino = Math.min(this.limite, this.tick + dt * ritmo);
    // La primera pausa anunciada en el camino detiene el reloj justo en su tick.
    let siguiente: number | null = null;
    for (const t of this.pausas.keys()) if (t > this.tick - 1e-9 && t <= destino && (siguiente === null || t < siguiente)) siguiente = t;
    if (siguiente !== null) {
      destino = siguiente;
      const motivo = this.pausas.get(siguiente)!;
      this.pausas.delete(siguiente);
      this.hechas.add(`${motivo}:${siguiente}`);
      this.pausa = { motivo, tick: siguiente, hasta: motivo === 'gol' ? ahoraMs + this.pausaGolMs : null };
      // Se informa sin esperar al intervalo: el servidor sabe enseguida dónde está el cliente.
      this.ultimoInforme = -Infinity;
    }
    this.tick = destino;
  }

  /** La pestaña vuelve a estar visible: no se recupera de golpe el tiempo en segundo plano. */
  reanudar(): void {
    this.ultimoPaso = null;
  }
}
