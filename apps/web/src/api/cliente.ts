/**
 * Cliente HTTP: envía la cookie de sesión y traduce el formato de error común
 * `{ error: { codigo, mensaje, detalles } }` a `ErrorApi`.
 */

export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
    readonly detalles: Record<string, unknown> = {},
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

export interface OpcionesPeticion {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  cuerpo?: unknown;
  /** Para operaciones que no deben repetirse (FR-062). */
  idempotente?: boolean;
}

export async function api<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const metodo = opciones.metodo ?? (opciones.cuerpo === undefined ? 'GET' : 'POST');
  const cabeceras: Record<string, string> = {};
  if (opciones.cuerpo !== undefined) cabeceras['content-type'] = 'application/json';
  if (opciones.idempotente) cabeceras['idempotency-key'] = crypto.randomUUID();

  const respuesta = await fetch(ruta, {
    method: metodo,
    credentials: 'include',
    headers: cabeceras,
    body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
  });
  const texto = await respuesta.text();
  const datos: unknown = texto ? JSON.parse(texto) : null;
  if (!respuesta.ok) {
    const error = (datos as { error?: { codigo?: string; mensaje?: string; detalles?: Record<string, unknown> } } | null)
      ?.error;
    // Las rutas internas de Better Auth devuelven { message, code }.
    const alternativo = datos as { message?: string; code?: string } | null;
    throw new ErrorApi(
      respuesta.status,
      error?.codigo ?? alternativo?.code ?? 'ERROR',
      error?.mensaje ?? alternativo?.message ?? `Error ${respuesta.status}`,
      error?.detalles ?? {},
    );
  }
  return datos as T;
}
