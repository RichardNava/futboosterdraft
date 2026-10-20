/**
 * Sonido de la aplicación (002/FR-010, research R17; spec 003, FR-014, research R21): Web Audio API con tres
 * efectos cortos en fichero y uno sintetizado (la apertura del sobre). El contexto de
 * audio se desbloquea con la primera interacción del usuario y la preferencia se guarda en
 * `localStorage['fbd.sonido']` (`'activado'` por defecto o `'silenciado'`), con lecturas y escrituras en
 * `try/catch` (modo privado, almacenamiento bloqueado).
 */
import { useSyncExternalStore } from 'react';

export type Efecto = 'apertura' | 'reparto' | 'volteo' | 'revelacion';
type EfectoFichero = Exclude<Efecto, 'apertura'>;

/** Ganancias (R21): la apertura, suave; la revelación de especiales, 0,4; el resto, 0,6. */
export const GANANCIA: Record<Efecto, number> = { apertura: 0.25, reparto: 0.6, volteo: 0.6, revelacion: 0.4 };
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
  if (efecto === 'apertura') {
    sintetizarApertura(c);
    return;
  }
  void cargar(efecto).then((b) => {
    if (!b || !activado) return;
    const fuente = c.createBufferSource();
    fuente.buffer = b;
    const ganancia = c.createGain();
    ganancia.gain.value = GANANCIA[efecto];
    fuente.connect(ganancia).connect(c.destination);
    fuente.start();
  });
}

/**
 * Apertura del sobre, sintetizada (R21): ruido rosa con paso bajo a 1,2 kHz y una envolvente de 350 ms, más un
 * acorde de dos senos (A3 y E4) con 30 ms de ataque y 600 ms de caída. Ganancia total 0,25.
 */
function sintetizarApertura(c: AudioContext): void {
  const t0 = c.currentTime;
  const salida = c.createGain();
  salida.gain.value = GANANCIA.apertura;
  salida.connect(c.destination);

  // Ruido rosa (filtro de Paul Kellet, versión económica).
  const muestras = Math.floor(c.sampleRate * 0.35);
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
  const ruido = c.createBufferSource();
  ruido.buffer = bufer;
  const pasoBajo = c.createBiquadFilter();
  pasoBajo.type = 'lowpass';
  pasoBajo.frequency.value = 1200;
  const envolventeRuido = c.createGain();
  envolventeRuido.gain.setValueAtTime(0, t0);
  envolventeRuido.gain.linearRampToValueAtTime(1, t0 + 0.02);
  envolventeRuido.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
  ruido.connect(pasoBajo).connect(envolventeRuido).connect(salida);
  ruido.start(t0);
  ruido.stop(t0 + 0.35);

  // Acorde A3 (220 Hz) + E4 (329,63 Hz).
  for (const frecuencia of [220, 329.63]) {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frecuencia;
    const env = c.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(0.5, t0 + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.03 + 0.6);
    osc.connect(env).connect(salida);
    osc.start(t0);
    osc.stop(t0 + 0.65);
  }
}
