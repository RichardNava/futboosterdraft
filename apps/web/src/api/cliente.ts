/**
 * Cliente HTTP: envía la cookie de sesión y traduce el formato de error común
 * `{ error: { codigo, mensaje, detalles } }` a `ErrorApi`.
 */
import type {
  RespuestaCambiarActiva,
  RespuestaDesfragmentar,
  RespuestaMovimientos,
  RespuestaCompraPase,
  ResumenCompra,
} from '@fbd/protocol';
import { marcarConectando } from '../estado/conexionServidor';
import { caducar, enCache } from './cache';

/** Error de la API con su estado HTTP, código y detalles (formato de error común). */
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

interface OpcionesPeticion {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  cuerpo?: unknown;
  /** Para operaciones que no deben repetirse (FR-062): una clave nueva por petición. */
  idempotente?: boolean;
  /** Clave de idempotencia fija, para reutilizarla en los reintentos de un mismo envío (spec 013, FR-033). */
  clave?: string;
  /** Solo la caché de navegación: pedir a la red aunque haya un valor recién cargado. */
  sinCache?: boolean;
}

/** El servidor no ha respondido (red caída, cuerpo no JSON o 5xx del proxy sin el error común). */
class SinRespuesta extends Error {
  constructor(readonly causa: unknown) {
    super('Sin respuesta del servidor');
  }
}

/** Esperas entre reintentos de un GET: 0,5 s, 1 s y, desde ahí, 2 s (research R8). */
const ESPERAS_MS = [500, 1000, 2000];

/** Petición a la API con la cookie de sesión; los GET se reintentan si el servidor no responde y reutilizan lo que acaba de cargar el loader. */
export async function api<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const metodo = opciones.metodo ?? (opciones.cuerpo === undefined ? 'GET' : 'POST');
  // Spec 013 (FR-022): solo los GET se reintentan; el resto podría repetir efectos.
  if (metodo !== 'GET') {
    try {
      const datos = await enviar<T>(ruta, metodo, opciones);
      // Lo que se guardó para la navegación ya no vale como dato fresco (spec 014, FR-025).
      caducar();
      return datos;
    } catch (e) {
      throw e instanceof SinRespuesta ? e.causa : e;
    }
  }
  // Lo que acaba de pedir el loader de esta navegación no se vuelve a pedir (spec 014, research R8).
  const reciente = opciones.sinCache ? undefined : enCache<T>(ruta, { fresco: true });
  if (reciente !== undefined) return reciente;
  for (let intento = 0; ; intento++) {
    try {
      const datos = await enviar<T>(ruta, metodo, opciones);
      marcarConectando(false);
      return datos;
    } catch (e) {
      if (!(e instanceof SinRespuesta)) {
        marcarConectando(false);
        throw e;
      }
      marcarConectando(true);
      await new Promise((r) => setTimeout(r, ESPERAS_MS[Math.min(intento, ESPERAS_MS.length - 1)]));
    }
  }
}

async function enviar<T>(ruta: string, metodo: string, opciones: OpcionesPeticion): Promise<T> {
  const cabeceras: Record<string, string> = {};
  if (opciones.cuerpo !== undefined) cabeceras['content-type'] = 'application/json';
  if (opciones.idempotente) cabeceras['idempotency-key'] = crypto.randomUUID();
  if (opciones.clave) cabeceras['idempotency-key'] = opciones.clave;

  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, {
      method: metodo,
      credentials: 'include',
      headers: cabeceras,
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
    });
  } catch (e) {
    throw new SinRespuesta(e);
  }
  const texto = await respuesta.text();
  let datos: unknown;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch (e) {
    throw new SinRespuesta(respuesta.ok ? e : new ErrorApi(respuesta.status, 'ERROR', `Error ${respuesta.status}`));
  }
  if (!respuesta.ok) {
    const error = (datos as { error?: { codigo?: string; mensaje?: string; detalles?: Record<string, unknown> } } | null)
      ?.error;
    // Las rutas internas de Better Auth devuelven { message, code }.
    const alternativo = datos as { message?: string; code?: string } | null;
    const fallo = new ErrorApi(
      respuesta.status,
      error?.codigo ?? alternativo?.code ?? 'ERROR',
      error?.mensaje ?? alternativo?.message ?? `Error ${respuesta.status}`,
      error?.detalles ?? {},
    );
    if (!error && !alternativo?.code && [500, 502, 503, 504].includes(respuesta.status)) throw new SinRespuesta(fallo);
    throw fallo;
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

/** Activa o desactiva una carta de la colección para los drafts. */
export function cambiarActiva(jugadorId: number, activa: boolean): Promise<RespuestaCambiarActiva> {
  return api(`/api/coleccion/cartas/${jugadorId}`, { metodo: 'PUT', cuerpo: { activa } });
}

/** Convierte una carta repetida en fragmentos. */
export function desfragmentar(jugadorId: number): Promise<RespuestaDesfragmentar> {
  return api(`/api/coleccion/cartas/${jugadorId}/desfragmentar`, { metodo: 'POST' });
}

/** Historial del más reciente al más antiguo; `antes` pide la página siguiente (FR-018). */
export function obtenerMovimientos(antes?: string): Promise<RespuestaMovimientos> {
  return api(`/api/fragmentos/movimientos${antes ? `?antes=${encodeURIComponent(antes)}` : ''}`);
}

/** Las compras se repiten con el mismo `idCompra` (lo genera quien llama): el servidor no cobra dos veces (FR-032). */
/** Los sobres de cartas solo se pagan con fragmentos (spec 011, FR-002). */
export function comprarSobre(idCompra: string): Promise<ResumenCompra> {
  return api('/api/tienda/sobre/comprar', { cuerpo: { idCompra, moneda: 'fragmentos' } });
}

/** Pase premium (spec 013, FR-034): idempotente por `idCompra`. */
export function comprarPase(moneda: 'fragmentos' | 'eur', idCompra: string): Promise<RespuestaCompraPase> {
  return api('/api/tienda/pase-premium', { cuerpo: { idCompra, moneda } });
}

/** Compra una colección de la tienda (idempotente por `idCompra`). */
export function comprarColeccion(coleccionId: string, idCompra: string): Promise<ResumenCompra> {
  return api(`/api/tienda/colecciones/${coleccionId}/comprar`, { cuerpo: { idCompra } });
}

