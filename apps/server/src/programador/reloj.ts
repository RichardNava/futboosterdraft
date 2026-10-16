/**
 * Reloj inyectable (T028). El servidor nunca llama a `Date.now()` directamente para la lógica de
 * juego: así las pruebas (y `pnpm dev --fake-clock`) pueden adelantar el tiempo.
 */

export interface Reloj {
  ahora(): number;
  /** Ejecuta `fn` cuando el reloj alcance `instanteMs`. Devuelve una función para cancelar. */
  programar(instanteMs: number, fn: () => void): () => void;
}

export class RelojReal implements Reloj {
  ahora(): number {
    return Date.now();
  }

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

  ahora(): number {
    return this.actual;
  }

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

  get numPendientes(): number {
    return this.pendientes.length;
  }
}
