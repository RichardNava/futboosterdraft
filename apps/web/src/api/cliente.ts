/**
 * Cliente HTTP: envía la cookie de sesión y traduce el formato de error común
 * `{ error: { codigo, mensaje, detalles } }` a `ErrorApi`.
 */
import type {
  RespuestaCambiarActiva,
  RespuestaColeccion,
  RespuestaDesfragmentar,
  RespuestaMovimientos,
  RespuestaTienda,
  ResumenCompra,
} from '@fbd/protocol';

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
/** Abre el partido con la modalidad elegida (spec 003, FR-032 a FR-035); si ya estaba abierto, devuelve la suya. */
export function abrirPartido(partidoId: string, modalidad: 'rapida' | '2d' = 'rapida'): Promise<{ modo: 'directo' | 'reproduccion'; modalidad: 'rapida' | '2d' }> {
  return api(`/api/partidos/${partidoId}/abrir`, { metodo: 'POST', idempotente: true, cuerpo: { modalidad } });
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

/** «Simular resto del torneo» (spec 003, FR-041a): juega lo que queda y devuelve el campeón. */
export function simularResto(partidaId: string): Promise<{ ok: true; campeon: { id: string; nombre: string } }> {
  return api(`/api/partidas/${partidaId}/simular-resto`, { metodo: 'POST', idempotente: true });
}

/** Pantalla de derrota o de campeón ya vista (spec 003, FR-041). */
export function marcarPantallaVista(partidaId: string, pantalla: 'derrota' | 'campeon'): Promise<{ ok: true }> {
  return api(`/api/partidas/${partidaId}/pantalla-vista`, { metodo: 'POST', cuerpo: { pantalla } });
}

// ---------- Colección, fragmentos y tienda (spec 006, contracts/http-api.md) ----------

export function obtenerColeccion(): Promise<RespuestaColeccion> {
  return api('/api/coleccion');
}

export function cambiarActiva(jugadorId: number, activa: boolean): Promise<RespuestaCambiarActiva> {
  return api(`/api/coleccion/cartas/${jugadorId}`, { metodo: 'PUT', cuerpo: { activa } });
}

export function desfragmentar(jugadorId: number): Promise<RespuestaDesfragmentar> {
  return api(`/api/coleccion/cartas/${jugadorId}/desfragmentar`, { metodo: 'POST' });
}

/** Historial del más reciente al más antiguo; `antes` pide la página siguiente (FR-018). */
export function obtenerMovimientos(antes?: string): Promise<RespuestaMovimientos> {
  return api(`/api/fragmentos/movimientos${antes ? `?antes=${encodeURIComponent(antes)}` : ''}`);
}

export function obtenerTienda(): Promise<RespuestaTienda> {
  return api('/api/tienda');
}

/** Las compras se repiten con el mismo `idCompra` (lo genera quien llama): el servidor no cobra dos veces (FR-032). */
export function comprarSobre(idCompra: string, moneda: 'eur' | 'fragmentos'): Promise<ResumenCompra> {
  return api('/api/tienda/sobre/comprar', { cuerpo: { idCompra, moneda } });
}

export function comprarColeccion(coleccionId: string, idCompra: string): Promise<ResumenCompra> {
  return api(`/api/tienda/colecciones/${coleccionId}/comprar`, { cuerpo: { idCompra } });
}

export function comprarFragmentos(paqueteId: string, idCompra: string): Promise<ResumenCompra> {
  return api(`/api/tienda/fragmentos/${paqueteId}/comprar`, { cuerpo: { idCompra } });
}
