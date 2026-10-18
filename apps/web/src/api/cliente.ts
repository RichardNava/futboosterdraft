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

// ---------- Partidos (spec 002, contracts/http-api.md) ----------

/** «Comenzar partido» o «Ver partido»: en directo contra un NPC, o la reproducción de un partido entre humanos. */
export function abrirPartido(partidoId: string): Promise<{ modo: 'directo' | 'reproduccion' }> {
  return api(`/api/partidos/${partidoId}/abrir`, { metodo: 'POST', idempotente: true });
}

/** Partido entre humanos ya resuelto, entero: el mismo para los dos participantes. */
export function obtenerReproduccion<T>(partidoId: string): Promise<T> {
  return api<T>(`/api/partidos/${partidoId}/reproduccion`);
}

/** Al llegar al final de la reproducción o al pulsar «Finalizar partido». */
export function marcarVisto(partidoId: string): Promise<{ ok: true }> {
  return api(`/api/partidos/${partidoId}/visto`, { metodo: 'POST', idempotente: true });
}

/** «Mostrar resultado» sin ver el partido. */
export function revelarResultado(partidoId: string): Promise<{ ok: true }> {
  return api(`/api/partidos/${partidoId}/revelar`, { metodo: 'POST', idempotente: true });
}

/** «Siguiente jornada» con un solo humano (research R9). */
export function siguienteJornada(partidaId: string): Promise<{ ok: true; jornadaActual: number | null }> {
  return api(`/api/partidas/${partidaId}/siguiente-jornada`, { metodo: 'POST', idempotente: true });
}
