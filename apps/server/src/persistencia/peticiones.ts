/**
 * Almacén de peticiones ya procesadas (FR-062): si llega otra vez el mismo `requestId` (WebSocket)
 * o la misma `Idempotency-Key` (HTTP), se devuelve la respuesta guardada sin repetir el efecto.
 */
import { and, eq } from 'drizzle-orm';
import type { BaseDatos } from './db';
import { peticionesProcesadas } from './esquema/index';

export interface AlmacenPeticiones {
  /** Respuesta guardada de una petición, si la hay. */
  obtener(ambito: string, requestId: string): Promise<unknown>;
  /** Guarda la respuesta de una petición. */
  guardar(ambito: string, requestId: string, respuesta: unknown): Promise<void>;
}

/** Respuestas de peticiones idempotentes guardadas en la base de datos. */
export class AlmacenPeticionesBD implements AlmacenPeticiones {
  constructor(private readonly db: BaseDatos) {}

  /** Respuesta guardada de una petición, si la hay. */
  async obtener(ambito: string, requestId: string): Promise<unknown> {
    const filas = await this.db
      .select({ respuesta: peticionesProcesadas.respuesta })
      .from(peticionesProcesadas)
      .where(and(eq(peticionesProcesadas.partidaId, ambito), eq(peticionesProcesadas.requestId, requestId)))
      .limit(1);
    return filas[0]?.respuesta;
  }

  /** Guarda la respuesta de una petición (la primera gana). */
  async guardar(ambito: string, requestId: string, respuesta: unknown): Promise<void> {
    await this.db
      .insert(peticionesProcesadas)
      .values({ partidaId: ambito, requestId, respuesta })
      .onConflictDoNothing();
  }
}

/** Respuestas de peticiones idempotentes en memoria (pruebas). */
export class AlmacenPeticionesMemoria implements AlmacenPeticiones {
  private readonly datos = new Map<string, unknown>();

  /** Respuesta guardada de una petición, si la hay. */
  async obtener(ambito: string, requestId: string): Promise<unknown> {
    return this.datos.get(`${ambito}|${requestId}`);
  }

  /** Guarda la respuesta de una petición (la primera gana). */
  async guardar(ambito: string, requestId: string, respuesta: unknown): Promise<void> {
    const clave = `${ambito}|${requestId}`;
    if (!this.datos.has(clave)) this.datos.set(clave, respuesta);
  }
}
