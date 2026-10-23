/**
 * Sonido de la aplicación (002/FR-010, research R17; spec 003, FR-014, research R21): Web Audio API con tres
 * efectos cortos en fichero y tres sintetizados (la apertura del sobre y, desde la ronda 2 de la spec 005, la entrada
 * y el choque de los duelos). El contexto de
 * audio se desbloquea con la primera interacción del usuario y la preferencia se guarda en
 * `localStorage['fbd.sonido']` (`'activado'` por defecto o `'silenciado'`), con lecturas y escrituras en
 * `try/catch` (modo privado, almacenamiento bloqueado).
 */
import { useSyncExternalStore } from 'react';

export type Efecto = 'apertura' | 'reparto' | 'volteo' | 'revelacion' | 'entradaDuelo' | 'choqueDuelo';
type EfectoSintetizado = 'apertura' | 'entradaDuelo' | 'choqueDuelo';
type EfectoFichero = Exclude<Efecto, EfectoSintetizado>;

/**
 * Ganancias (R21): la apertura, suave; la revelación de virtudes, 0,4; el resto de ficheros, 0,6. Los duelos suenan
 * once veces seguidas: su entrada y su choque van bastante más bajos que la apertura.
 */
export const GANANCIA: Record<Efecto, number> = {
  apertura: 0.2,
  reparto: 0.6,
  volteo: 0.6,
  revelacion: 0.4,
  entradaDuelo: 0.05,
  choqueDuelo: 0.1,
};

const SINTETIZADOS: Record<EfectoSintetizado, (c: AudioContext, salida: GainNode) => void> = {
  apertura: sintetizarApertura,
  entradaDuelo: sintetizarEntradaDuelo,
  choqueDuelo: sintetizarChoqueDuelo,
};
export const CLAVE_SONIDO = 'fbd.sonido';

let contexto: AudioContext | null = null;
const buferes = new Map<EfectoFichero, Promise<AudioBuffer | null>>();
const oyentes = new Set<() => void>();

function leerPreferencia(): boolean {
  try {
    return globalThis.localStorage?.getItem(CLAVE_SONIDO) !== 'silenciado';
  } catch {
    return true;
  }
}

let activado = leerPreferencia();

export function sonidoActivado(): boolean {
  return activado;
}

export function cambiarSonido(valor: boolean): void {
  activado = valor;
  try {
    globalThis.localStorage?.setItem(CLAVE_SONIDO, valor ? 'activado' : 'silenciado');
  } catch {
    // Sin almacenamiento: la preferencia dura lo que la pestaña.
  }
  for (const o of oyentes) o();
}

/** Estado del interruptor para React (🔊/🔇). */
export function useSonido(): [boolean, (v: boolean) => void] {
  const valor = useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    sonidoActivado,
    () => true,
  );
  return [valor, cambiarSonido];
}

function obtenerContexto(): AudioContext | null {
  if (contexto) return contexto;
  const Ctor = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  contexto = new Ctor();
  return contexto;
}

/** Desbloquea el audio con la primera interacción (los navegadores lo exigen). */
export function prepararDesbloqueo(): void {
  if (typeof window === 'undefined') return;
  const desbloquear = () => {
    const c = obtenerContexto();
    if (c?.state === 'suspended') void c.resume();
    window.removeEventListener('pointerdown', desbloquear);
    window.removeEventListener('keydown', desbloquear);
  };
  window.addEventListener('pointerdown', desbloquear);
  window.addEventListener('keydown', desbloquear);
}

function cargar(efecto: EfectoFichero): Promise<AudioBuffer | null> {
  let b = buferes.get(efecto);
  if (!b) {
    const c = obtenerContexto();
    b = c
      ? fetch(`/sonidos/${efecto}.wav`)
          .then((r) => r.arrayBuffer())
          .then((datos) => c.decodeAudioData(datos))
          .catch(() => null)
      : Promise.resolve(null);
    buferes.set(efecto, b);
  }
  return b;
}

/** Reproduce un efecto si el sonido está activado (sin errores si el navegador no tiene audio). */
export function reproducir(efecto: Efecto): void {
  if (!activado) return;
  const c = obtenerContexto();
  if (!c || c.state !== 'running') return;
  if (efecto in SINTETIZADOS) {
    const salida = c.createGain();
    salida.gain.value = GANANCIA[efecto];
    salida.connect(c.destination);
    SINTETIZADOS[efecto as EfectoSintetizado](c, salida);
    return;
  }
  void cargar(efecto as EfectoFichero).then((b) => {
    if (!b || !activado) return;
    const fuente = c.createBufferSource();
    fuente.buffer = b;
    const ganancia = c.createGain();
    ganancia.gain.value = GANANCIA[efecto];
    fuente.connect(ganancia).connect(c.destination);
    fuente.start();
  });
}

/** Ruido rosa (filtro de Paul Kellet, versión económica) de `segundos` de duración. */
function ruidoRosa(c: AudioContext, segundos: number): AudioBufferSourceNode {
  const muestras = Math.floor(c.sampleRate * segundos);
  const bufer = c.createBuffer(1, muestras, c.sampleRate);
  const datos = bufer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < muestras; i++) {
    const blanco = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + blanco * 0.099046;
    b1 = 0.963 * b1 + blanco * 0.2965164;
    b2 = 0.57 * b2 + blanco * 1.0526913;
    datos[i] = (b0 + b1 + b2 + blanco * 0.1848) * 0.2;
  }
  const fuente = c.createBufferSource();
  fuente.buffer = bufer;
  return fuente;
}

/** Nota senoidal o triangular con ataque suave y caída exponencial. */
function nota(c: AudioContext, salida: AudioNode, frecuencia: number, inicio: number, caida: number, volumen: number, tipo: OscillatorType = 'sine'): void {
  const osc = c.createOscillator();
  osc.type = tipo;
  osc.frequency.value = frecuencia;
  const env = c.createGain();
  env.gain.setValueAtTime(0, inicio);
  env.gain.linearRampToValueAtTime(volumen, inicio + 0.015);
  env.gain.exponentialRampToValueAtTime(0.001, inicio + 0.015 + caida);
  osc.connect(env).connect(salida);
  osc.start(inicio);
  osc.stop(inicio + 0.05 + caida);
}

/**
 * Apertura del sobre, sintetizada (R21; suavizada en la ronda 2 de la spec 005): un roce de papel corto y apagado
 * (ruido rosa con paso banda a 1,6 kHz, 220 ms) y un arpegio ascendente de Do mayor (C5, E5, G5, C6) en senos, con
 * 15 ms de ataque, 70 ms entre notas y medio segundo de caída. Ganancia total 0,2.
 */
function sintetizarApertura(c: AudioContext, salida: GainNode): void {
  const t0 = c.currentTime;
  const ruido = ruidoRosa(c, 0.22);
  const pasoBanda = c.createBiquadFilter();
  pasoBanda.type = 'bandpass';
  pasoBanda.frequency.value = 1600;
  pasoBanda.Q.value = 0.8;
  const envolventeRuido = c.createGain();
  envolventeRuido.gain.setValueAtTime(0, t0);
  envolventeRuido.gain.linearRampToValueAtTime(0.5, t0 + 0.03);
  envolventeRuido.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
  ruido.connect(pasoBanda).connect(envolventeRuido).connect(salida);
  ruido.start(t0);
  ruido.stop(t0 + 0.22);

  [523.25, 659.25, 783.99, 1046.5].forEach((frecuencia, i) => nota(c, salida, frecuencia, t0 + 0.08 + i * 0.07, 0.5, 0.35));
}

/** Entrada de las cartas de un duelo: un soplo de aire que sube de 400 Hz a 1,4 kHz en 280 ms. */
function sintetizarEntradaDuelo(c: AudioContext, salida: GainNode): void {
  const t0 = c.currentTime;
  const ruido = ruidoRosa(c, 0.3);
  const pasoBanda = c.createBiquadFilter();
  pasoBanda.type = 'bandpass';
  pasoBanda.Q.value = 1.2;
  pasoBanda.frequency.setValueAtTime(400, t0);
  pasoBanda.frequency.exponentialRampToValueAtTime(1400, t0 + 0.28);
  const env = c.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(1, t0 + 0.2);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
  ruido.connect(pasoBanda).connect(env).connect(salida);
  ruido.start(t0);
  ruido.stop(t0 + 0.3);
}

/**
 * Choque de las cartas de un duelo: un golpe sordo (seno que cae de 160 a 60 Hz en 180 ms) y una campanilla corta
 * en quinta (G5 y D6) que lo endulza.
 */
function sintetizarChoqueDuelo(c: AudioContext, salida: GainNode): void {
  const t0 = c.currentTime;
  const golpe = c.createOscillator();
  golpe.type = 'sine';
  golpe.frequency.setValueAtTime(160, t0);
  golpe.frequency.exponentialRampToValueAtTime(60, t0 + 0.18);
  const env = c.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(1, t0 + 0.005);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
  golpe.connect(env).connect(salida);
  golpe.start(t0);
  golpe.stop(t0 + 0.22);

  nota(c, salida, 783.99, t0 + 0.01, 0.35, 0.3, 'triangle');
  nota(c, salida, 1174.66, t0 + 0.01, 0.3, 0.18, 'triangle');
}
