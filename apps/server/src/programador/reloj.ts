/**
 * Reloj inyectable (T028). El servidor nunca llama a `Date.now()` directamente para la lógica de
 * juego: así las pruebas (y `pnpm dev --fake-clock`) pueden adelantar el tiempo.
 */

export interface Reloj {
  /** Instante actual en milisegundos. */
  ahora(): number;
  /** Ejecuta `fn` cuando el reloj alcance `instanteMs`. Devuelve una función para cancelar. */
  programar(instanteMs: number, fn: () => void): () => void;
}

/** Reloj del sistema. */
export class RelojReal implements Reloj {
  /** Instante actual en milisegundos. */
  ahora(): number {
    return Date.now();
  }

  /** Ejecuta `fn` al llegar a `instanteMs`; devuelve la función para cancelarlo. */
  programar(instanteMs: number, fn: () => void): () => void {
    // setTimeout admite como máximo ~24,8 días: si el plazo es mayor, se rearma al llegar a ese máximo.
    const MAXIMO = 2_147_483_647;
    let id: ReturnType<typeof setTimeout>;
    const armar = () => {
      const espera = Math.max(0, instanteMs - this.ahora());
      id = espera > MAXIMO ? setTimeout(armar, MAXIMO) : setTimeout(fn, espera);
    };
    armar();
    return () => clearTimeout(id);
  }
}

interface Pendiente {
  id: number;
  instanteMs: number;
  fn: () => void;
}

/** Reloj manual para pruebas: el tiempo solo avanza con `avanzar()` o `fijar()`. */
export class RelojFalso implements Reloj {
  private actual: number;
  private siguienteId = 1;
  private pendientes: Pendiente[] = [];

  constructor(inicioMs = Date.UTC(2026, 0, 1)) {
    this.actual = inicioMs;
  }

  /** Instante actual en milisegundos. */
  ahora(): number {
    return this.actual;
  }

  /** Ejecuta `fn` al llegar a `instanteMs`; devuelve la función para cancelarlo. */
  programar(instanteMs: number, fn: () => void): () => void {
    const id = this.siguienteId++;
    this.pendientes.push({ id, instanteMs, fn });
    return () => {
      this.pendientes = this.pendientes.filter((p) => p.id !== id);
    };
  }

  /** Avanza el reloj y ejecuta, en orden, todo lo programado hasta el nuevo instante. */
  avanzar(ms: number): void {
    this.fijar(this.actual + ms);
  }

  /** Avanza el reloj hasta el instante y ejecuta en orden lo programado hasta él. */
  fijar(instanteMs: number): void {
    for (;;) {
      const vencidos = this.pendientes
        .filter((p) => p.instanteMs <= instanteMs)
        .sort((a, b) => a.instanteMs - b.instanteMs || a.id - b.id);
      const siguiente = vencidos[0];
      if (!siguiente) break;
      this.pendientes = this.pendientes.filter((p) => p.id !== siguiente.id);
      this.actual = Math.max(this.actual, siguiente.instanteMs);
      siguiente.fn();
    }
    this.actual = Math.max(this.actual, instanteMs);
  }

  /** Tareas programadas aún sin ejecutar. */
  get numPendientes(): number {
    return this.pendientes.length;
  }
}
