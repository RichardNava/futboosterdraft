/**
 * Límite de peticiones por sesión (T141): un cubo de fichas por clave. Cada petición gasta una ficha y
 * las fichas se reponen a ritmo constante hasta la capacidad, de modo que se admiten ráfagas cortas
 * pero no un flujo sostenido por encima del ritmo.
 *
 * Usa el tiempo real (no el `Reloj` de la partida): el reloj simulado de las pruebas no debe cambiar
 * los límites.
 */
export interface OpcionesLimitador {
  /** Fichas máximas (tamaño de la ráfaga). */
  capacidad: number;
  /** Fichas que se reponen por segundo. */
  porSegundo: number;
  ahora?: () => number;
}

/** Con más claves que esto se olvidan las que ya tienen el cubo lleno (no aportan nada). */
const MAX_CLAVES = 10_000;

export class Limitador {
  private readonly cubos = new Map<string, { fichas: number; en: number }>();
  private readonly ahora: () => number;

  constructor(private readonly opciones: OpcionesLimitador) {
    this.ahora = opciones.ahora ?? Date.now;
  }

  /** Gasta una ficha de `clave`; devuelve `false` si no quedan (hay que rechazar la petición). */
  permitir(clave: string): boolean {
    const ahora = this.ahora();
    const { capacidad, porSegundo } = this.opciones;
    const cubo = this.cubos.get(clave) ?? { fichas: capacidad, en: ahora };
    cubo.fichas = Math.min(capacidad, cubo.fichas + ((ahora - cubo.en) / 1000) * porSegundo);
    cubo.en = ahora;
    const permitido = cubo.fichas >= 1;
    if (permitido) cubo.fichas -= 1;
    this.cubos.set(clave, cubo);
    if (this.cubos.size > MAX_CLAVES) this.olvidarLlenos(ahora);
    return permitido;
  }

  private olvidarLlenos(ahora: number): void {
    const { capacidad, porSegundo } = this.opciones;
    for (const [clave, c] of this.cubos) {
      if (c.fichas + ((ahora - c.en) / 1000) * porSegundo >= capacidad) this.cubos.delete(clave);
    }
  }
}

/** HTTP: ráfagas de 60 peticiones y 20 por segundo sostenidas por sesión. */
export const LIMITE_HTTP: OpcionesLimitador = { capacidad: 60, porSegundo: 20 };
/** WebSocket: ráfagas de 40 mensajes y 10 por segundo por participante (la reproducción 2D envía 2/s). */
export const LIMITE_WS: OpcionesLimitador = { capacidad: 40, porSegundo: 10 };
/** Tamaño máximo de un mensaje (cuerpo HTTP o mensaje WebSocket). */
export const TAMANO_MAXIMO_MENSAJE = 64 * 1024;
