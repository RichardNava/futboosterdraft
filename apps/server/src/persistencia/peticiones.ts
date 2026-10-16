/**
 * Almacén de peticiones ya procesadas (FR-062): si llega otra vez el mismo `requestId` (WebSocket)
 * o la misma `Idempotency-Key` (HTTP), se devuelve la respuesta guardada sin repetir el efecto.
 */
import { and, eq } from 'drizzle-orm';
import type { BaseDatos } from './db';
import { peticionesProcesadas } from './esquema/index';

export interface AlmacenPeticiones {
  obtener(ambito: string, requestId: string): Promise<unknown>;
  guardar(ambito: string, requestId: string, respuesta: unknown): Promise<void>;
}

export class AlmacenPeticionesBD implements AlmacenPeticiones {
  constructor(private readonly db: BaseDatos) {}

  async obtener(ambito: string, requestId: string): Promise<unknown> {
    const filas = await this.db
      .select({ respuesta: peticionesProcesadas.respuesta })
      .from(peticionesProcesadas)
      .where(and(eq(peticionesProcesadas.partidaId, ambito), eq(peticionesProcesadas.requestId, requestId)))
      .limit(1);
    return filas[0]?.respuesta;
  }

  async guardar(ambito: string, requestId: string, respuesta: unknown): Promise<void> {
    await this.db
      .insert(peticionesProcesadas)
      .values({ partidaId: ambito, requestId, respuesta })
      .onConflictDoNothing();
  }
}

export class AlmacenPeticionesMemoria implements AlmacenPeticiones {
  private readonly datos = new Map<string, unknown>();

  async obtener(ambito: string, requestId: string): Promise<unknown> {
    return this.datos.get(`${ambito}|${requestId}`);
  }

  async guardar(ambito: string, requestId: string, respuesta: unknown): Promise<void> {
    const clave = `${ambito}|${requestId}`;
    if (!this.datos.has(clave)) this.datos.set(clave, respuesta);
  }
}
