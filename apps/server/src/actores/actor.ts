/**
 * Actor por partida (T029; research R4).
 *
 * Cada partida activa tiene un actor que procesa sus comandos de uno en uno, en orden de llegada.
 * Así no hay condiciones de carrera en el turno simultáneo del draft ni en las decisiones de un
 * partido. Regla "guardar antes de anunciar": los mensajes que emite un comando se retienen y solo
 * se envían si el comando termina bien (es decir, después de confirmar su transacción). Si el comando
 * falla, sus mensajes se descartan. Un comando puede adelantar el envío de lo ya guardado con
 * `ctx.publicar()`.
 */

/** Destinatario de un mensaje: todos los participantes conectados de la partida, o uno concreto. */
export type Destino = { tipo: 'todos' } | { tipo: 'participante'; participanteId: string };

export interface MensajeSaliente {
  destino: Destino;
  mensaje: { t: string } & Record<string, unknown>;
}

/** Quien entrega de verdad los mensajes (la pasarela WebSocket). */
export interface Difusor {
  enviar(partidaId: string, salida: MensajeSaliente): void;
}

export interface ContextoComando {
  readonly partidaId: string;
  emitirATodos(mensaje: MensajeSaliente['mensaje']): void;
  emitirA(participanteId: string, mensaje: MensajeSaliente['mensaje']): void;
  /**
   * Envía ya los mensajes retenidos hasta ahora. Solo debe llamarse cuando lo que anuncian ya está
   * guardado; sirve para que un comando largo no retrase lo que ya es definitivo (p. ej. el final de un
   * partido antes de cerrar la jornada, T140).
   */
  publicar(): void;
}

export class ActorPartida {
  private cola: Promise<unknown> = Promise.resolve();
  private pendientes = 0;
  private cerrado = false;

  constructor(
    readonly partidaId: string,
    private readonly difusor: Difusor,
  ) {}

  /** Encola un comando. Devuelve su resultado cuando le toque ejecutarse y termine. */
  ejecutar<T>(comando: (ctx: ContextoComando) => Promise<T> | T): Promise<T> {
    if (this.cerrado) return Promise.reject(new Error(`El actor de la partida ${this.partidaId} está cerrado`));
    this.pendientes++;
    const resultado = this.cola.then(async () => {
      const salida: MensajeSaliente[] = [];
      const ctx: ContextoComando = {
        partidaId: this.partidaId,
        emitirATodos: (mensaje) => salida.push({ destino: { tipo: 'todos' }, mensaje }),
        emitirA: (participanteId, mensaje) =>
          salida.push({ destino: { tipo: 'participante', participanteId }, mensaje }),
        publicar: () => {
          for (const s of salida.splice(0)) this.difusor.enviar(this.partidaId, s);
        },
      };
      try {
        const valor = await comando(ctx);
        for (const s of salida) this.difusor.enviar(this.partidaId, s);
        return valor;
      } finally {
        this.pendientes--;
      }
    });
    // La cola sigue aunque un comando falle; el error solo lo recibe quien lo encoló.
    this.cola = resultado.catch(() => undefined);
    return resultado;
  }

  /** Espera a que se vacíe la cola (útil en pruebas y al cerrar). */
  async drenar(): Promise<void> {
    while (this.pendientes > 0) await this.cola;
  }

  cerrar(): void {
    this.cerrado = true;
  }

  get estaCerrado(): boolean {
    return this.cerrado;
  }
}

export class RegistroActores<A extends { readonly partidaId: string; cerrar(): void }> {
  private readonly actores = new Map<string, A>();

  constructor(private readonly alCambiarTamano?: (n: number) => void) {}

  obtener(partidaId: string): A | undefined {
    return this.actores.get(partidaId);
  }

  obtenerOCrear(partidaId: string, crear: () => A): A {
    let actor = this.actores.get(partidaId);
    if (!actor) {
      actor = crear();
      this.actores.set(partidaId, actor);
      this.alCambiarTamano?.(this.actores.size);
    }
    return actor;
  }

  eliminar(partidaId: string): void {
    const actor = this.actores.get(partidaId);
    if (!actor) return;
    actor.cerrar();
    this.actores.delete(partidaId);
    this.alCambiarTamano?.(this.actores.size);
  }

  /** Crea los actores de todas las partidas activas al arrancar el servidor. */
  async rehidratarTodos(idsActivos: () => Promise<string[]>, crear: (partidaId: string) => Promise<A>): Promise<number> {
    const ids = await idsActivos();
    for (const id of ids) {
      if (!this.actores.has(id)) this.actores.set(id, await crear(id));
    }
    this.alCambiarTamano?.(this.actores.size);
    return ids.length;
  }

  get tamano(): number {
    return this.actores.size;
  }

  todos(): A[] {
    return [...this.actores.values()];
  }
}
