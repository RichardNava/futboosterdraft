/**
 * Límites de uso (T141; spec 017, FR-013, FR-014): un cubo de fichas por clave. Cada petición gasta una ficha y
 * las fichas se reponen a ritmo constante hasta la capacidad, de modo que se admiten ráfagas cortas
 * pero no un flujo sostenido por encima del ritmo.
 *
 * Usa el tiempo real (no el `Reloj` de la partida): el reloj simulado de las pruebas no debe cambiar
 * los límites.
 */
import { isIPv6 } from 'node:net';

export interface OpcionesLimitador {
  /** Fichas máximas (tamaño de la ráfaga). */
  capacidad: number;
  /** Fichas que se reponen por segundo. */
  porSegundo: number;
  ahora?: () => number;
}

/** Tope real de claves. Al superarlo se olvidan las llenas y, si hace falta, las usadas hace más tiempo. */
const MAX_CLAVES = 10_000;
/** Se recorta por debajo del tope para no recorrer el mapa en cada petición (SEG-022). */
const CLAVES_TRAS_RECORTE = 9_000;

/** Limitador de peticiones por clave con cubos de fichas. */
export class Limitador {
  /** En orden de último uso: la primera clave es la más antigua. */
  private readonly cubos = new Map<string, { fichas: number; en: number }>();
  private readonly ahora: () => number;

  constructor(private readonly opciones: OpcionesLimitador) {
    this.ahora = opciones.ahora ?? Date.now;
  }

  /** Gasta una ficha de `clave`; devuelve `false` si no quedan (hay que rechazar la petición). */
  permitir(clave: string): boolean {
    const ahora = this.ahora();
    const fichas = this.fichas(clave, ahora);
    const permitido = fichas >= 1;
    this.cubos.delete(clave);
    this.cubos.set(clave, { fichas: permitido ? fichas - 1 : fichas, en: ahora });
    if (this.cubos.size > MAX_CLAVES) this.recortar(ahora);
    return permitido;
  }

  /** Consulta sin gastar: para los límites que solo cuentan los fallos. */
  disponible(clave: string): boolean {
    return this.fichas(clave, this.ahora()) >= 1;
  }

  /** Olvida una clave (p. ej. los fallos de una cuenta tras restablecer su contraseña). */
  borrar(clave: string): void {
    this.cubos.delete(clave);
  }

  private fichas(clave: string, ahora: number): number {
    const { capacidad, porSegundo } = this.opciones;
    const cubo = this.cubos.get(clave);
    return cubo ? Math.min(capacidad, cubo.fichas + ((ahora - cubo.en) / 1000) * porSegundo) : capacidad;
  }

  private recortar(ahora: number): void {
    const { capacidad, porSegundo } = this.opciones;
    for (const [clave, c] of this.cubos) {
      if (c.fichas + ((ahora - c.en) / 1000) * porSegundo >= capacidad) this.cubos.delete(clave);
    }
    for (const clave of this.cubos.keys()) {
      if (this.cubos.size <= CLAVES_TRAS_RECORTE) break;
      this.cubos.delete(clave);
    }
  }
}

/** Identifica al cliente: una dirección IPv4, o el /64 de una IPv6 (un solo cliente controla el /64 entero). */
export function claveCliente(ip: string | undefined): string {
  // Sin dirección si el cliente ya ha cortado la conexión.
  if (!ip) return 'desconocida';
  const sinZona = ip.split('%')[0]!;
  if (!isIPv6(sinZona)) return ip;
  // La URL normaliza la dirección: minúsculas, sin ceros a la izquierda y con la IPv4 final en hexadecimal.
  const [inicio = '', fin] = new URL(`http://[${sinZona}]`).hostname.slice(1, -1).split('::');
  const izquierda = inicio ? inicio.split(':') : [];
  const derecha = fin ? fin.split(':') : [];
  const grupos = fin === undefined ? izquierda : [...izquierda, ...Array<string>(8 - izquierda.length - derecha.length).fill('0'), ...derecha];
  if (grupos.slice(0, 5).every((g) => g === '0') && grupos[5] === 'ffff') return `v4:${grupos[6]}:${grupos[7]}`;
  return `${grupos.slice(0, 4).join(':')}::/64`;
}

/** Correo como clave de los límites por cuenta. */
export const normalizarCorreo = (email: string): string => email.trim().toLowerCase();

/** HTTP: ráfagas de 60 peticiones y 20 por segundo sostenidas por usuario. */
export const LIMITE_HTTP: OpcionesLimitador = { capacidad: 60, porSegundo: 20 };
/** Toda la API por cliente, también sin sesión (spec 017, R5). */
export const LIMITE_IP: OpcionesLimitador = { capacidad: 300, porSegundo: 100 };
/** WebSocket: ráfagas de 40 mensajes y 10 por segundo por participante (la reproducción 2D envía 4/s). */
export const LIMITE_WS: OpcionesLimitador = { capacidad: 40, porSegundo: 10 };
/** Operaciones de cuenta sin sesión (spec 017, contracts/seguridad.md). */
export const LIMITES_CUENTA = {
  loginIp: { capacidad: 10, porSegundo: 10 / 60 },
  loginFallos: { capacidad: 20, porSegundo: 20 / 3600 },
  registro: { capacidad: 5, porSegundo: 5 / 3600 },
  invitado: { capacidad: 20, porSegundo: 20 / 3600 },
  recuperacionIp: { capacidad: 5, porSegundo: 1 / 60 },
  recuperacionCorreo: { capacidad: 3, porSegundo: 3 / 3600 },
} satisfies Record<string, OpcionesLimitador>;
/** Sin límites: pruebas y prueba de carga (`LIMITES_DESACTIVADOS=1`, rechazada en producción). */
export const SIN_LIMITE: OpcionesLimitador = { capacidad: 1e9, porSegundo: 1e9 };
/** Tamaño máximo de un mensaje (cuerpo HTTP o mensaje WebSocket). */
export const TAMANO_MAXIMO_MENSAJE = 64 * 1024;
