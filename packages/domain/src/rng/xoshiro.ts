/**
 * PRNG determinista xoshiro128** (research R7).
 *
 * Toda aleatoriedad del dominio y del motor pasa por aquí: con la misma semilla se obtiene
 * exactamente la misma secuencia, lo que permite reproducir drafts y partidos (FR-040).
 * El estado es un array de 4 enteros sin signo de 32 bits, serializable tal cual.
 */

export type EstadoRng = [number, number, number, number];

/** Semilla de 128 bits en hexadecimal (32 caracteres). */
export type Semilla = string;

const PATRON_SEMILLA = /^[0-9a-f]{32}$/;

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

export function estadoDesdeSemilla(semilla: Semilla): EstadoRng {
  const normalizada = semilla.toLowerCase();
  if (!PATRON_SEMILLA.test(normalizada)) {
    throw new Error(`Semilla inválida: se esperaban 32 caracteres hexadecimales, recibido "${semilla}"`);
  }
  const estado: EstadoRng = [
    parseInt(normalizada.slice(0, 8), 16) >>> 0,
    parseInt(normalizada.slice(8, 16), 16) >>> 0,
    parseInt(normalizada.slice(16, 24), 16) >>> 0,
    parseInt(normalizada.slice(24, 32), 16) >>> 0,
  ];
  // xoshiro no admite el estado todo a cero.
  if (estado.every((v) => v === 0)) estado[0] = 0x9e3779b9;
  return estado;
}

export function semillaDesdeEstado(estado: EstadoRng): Semilla {
  return estado.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

/**
 * Hash determinista de 128 bits (cyrb128) para derivar semillas a partir de texto.
 */
function hash128(texto: string): EstadoRng {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < texto.length; i++) {
    const k = texto.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Semilla a partir de cualquier texto (útil para semillas raíz legibles en pruebas). */
export function semillaDesdeTexto(texto: string): Semilla {
  return semillaDesdeEstado(hash128(texto));
}

/**
 * Deriva una semilla hija independiente de la raíz y una etiqueta.
 * P. ej. `derivarSemilla(semillaPartida, 'mesa:0')` o `derivarSemilla(semillaPartida, 'partido:<id>')`.
 */
export function derivarSemilla(raiz: Semilla, etiqueta: string): Semilla {
  return semillaDesdeEstado(hash128(`${raiz.toLowerCase()}|${etiqueta}`));
}

export class Rng {
  private readonly s: EstadoRng;

  constructor(semillaOEstado: Semilla | EstadoRng) {
    this.s = typeof semillaOEstado === 'string' ? estadoDesdeSemilla(semillaOEstado) : [...semillaOEstado];
  }

  /** Siguiente entero sin signo de 32 bits. */
  siguiente(): number {
    const s = this.s;
    const resultado = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] = (s[2] ^ s[0]) >>> 0;
    s[3] = (s[3] ^ s[1]) >>> 0;
    s[1] = (s[1] ^ s[2]) >>> 0;
    s[0] = (s[0] ^ s[3]) >>> 0;
    s[2] = (s[2] ^ t) >>> 0;
    s[3] = rotl(s[3], 11);
    return resultado;
  }

  /** Entero uniforme en [min, max], ambos incluidos, sin sesgo (muestreo por rechazo). */
  entero(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error(`Rango inválido [${min}, ${max}]`);
    }
    const rango = max - min + 1;
    if (rango > 0x1_0000_0000) throw new Error('Rango demasiado grande');
    const limite = 0x1_0000_0000 - (0x1_0000_0000 % rango);
    let x = this.siguiente();
    while (x >= limite) x = this.siguiente();
    return min + (x % rango);
  }

  /** `true` con probabilidad `milesimas / 1000` (0..1000). */
  probabilidad(milesimas: number): boolean {
    if (milesimas <= 0) return false;
    if (milesimas >= 1000) return true;
    return this.entero(0, 999) < milesimas;
  }

  /** Elemento al azar de una lista no vacía. */
  elegir<T>(lista: readonly T[]): T {
    if (lista.length === 0) throw new Error('No se puede elegir de una lista vacía');
    return lista[this.entero(0, lista.length - 1)] as T;
  }

  /** Copia barajada (Fisher-Yates); no modifica la original. */
  barajar<T>(lista: readonly T[]): T[] {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = this.entero(0, i);
      const tmp = copia[i] as T;
      copia[i] = copia[j] as T;
      copia[j] = tmp;
    }
    return copia;
  }

  /** Estado actual (copia) para guardarlo o reanudar la secuencia. */
  estado(): EstadoRng {
    return [...this.s];
  }

  clonar(): Rng {
    return new Rng(this.estado());
  }
}
