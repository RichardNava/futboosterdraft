/**
 * Sonido de la aplicación (002/FR-010, research R17; spec 003, FR-014; spec 007, FR-010 a FR-015, research R5 a R7):
 * Web Audio API con nueve efectos cortos, todos grabaciones CC0 en MP3 (`public/sonidos/LICENCIA`). El contexto de
 * audio se desbloquea con la primera interacción del usuario y la preferencia se guarda en
 * `localStorage['fbd.sonido']` (`'activado'` por defecto o `'silenciado'`), con lecturas y escrituras en
 * `try/catch` (modo privado, almacenamiento bloqueado).
 */
import { useSyncExternalStore } from 'react';

export type Efecto =
  | 'apertura'
  | 'reparto'
  | 'volteo'
  | 'revelacion'
  | 'entradaDuelo'
  | 'choqueDuelo'
  | 'ruletaForma'
  | 'aplausos'
  | 'trompetas';

/**
 * Ganancia de cada fichero, calculada con su sonoridad medida (EBU R128, LUFS) para que, ya con `FACTOR_VOLUMEN`,
 * quede en su objetivo: −28 apertura y volteo, −30 reparto, −27 revelación, −32 entrada, −29 choque, −31 ruleta y
 * −22 aplausos y trompetas. Los duelos suenan once veces seguidas, así que su entrada y su ruleta van algo más bajas.
 */
const BASE: Record<Efecto, number> = {
  apertura: 0.75, // −23,5 LUFS
  reparto: 0.81, // −26,2
  volteo: 1.03, // −26,3
  revelacion: 0.53, // −19,5
  entradaDuelo: 0.72, // −27,2
  choqueDuelo: 0.53, // −21,5
  ruletaForma: 0.68, // −25,7
  aplausos: 0.34, // −10,7
  trompetas: 0.75, // −17,6
};

/** Todos los efectos, un 20 % más bajos que antes de la spec 007 (FR-011). */
export const FACTOR_VOLUMEN = 0.8;

export const GANANCIA = Object.fromEntries(Object.entries(BASE).map(([e, g]) => [e, g * FACTOR_VOLUMEN])) as Record<Efecto, number>;

export const CLAVE_SONIDO = 'fbd.sonido';

let contexto: AudioContext | null = null;
const buferes = new Map<Efecto, Promise<AudioBuffer | null>>();
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
  // Precarga: así ningún efecto llega tarde la primera vez (la primera ruleta se cortaba antes de cargarse).
  for (const e of Object.keys(BASE) as Efecto[]) void cargar(e);
  return contexto;
}

/**
 * Desbloquea el audio con las interacciones del usuario (los navegadores lo exigen). Escucha todos los gestos, no solo
 * el primero: el contexto puede volver a suspenderse (cambio de dispositivo de salida, recarga sin gesto…).
 */
export function prepararDesbloqueo(): (() => void) | undefined {
  if (typeof window === 'undefined') return;
  const desbloquear = () => {
    const c = obtenerContexto();
    if (c && c.state !== 'running') void c.resume().catch(nada);
  };
  window.addEventListener('pointerdown', desbloquear);
  window.addEventListener('keydown', desbloquear);
  return () => {
    window.removeEventListener('pointerdown', desbloquear);
    window.removeEventListener('keydown', desbloquear);
  };
}

function cargar(efecto: Efecto): Promise<AudioBuffer | null> {
  let b = buferes.get(efecto);
  if (!b) {
    const c = obtenerContexto();
    b = c
      ? fetch(`/sonidos/${efecto}.mp3`)
          .then((r) => r.arrayBuffer())
          .then((datos) => c.decodeAudioData(datos))
          .catch(() => {
            // Sin caché del fallo: se reintenta la próxima vez que suene.
            buferes.delete(efecto);
            return null;
          })
      : Promise.resolve(null);
    buferes.set(efecto, b);
  }
  return b;
}

const nada = () => {};

/**
 * Reproduce un efecto si el sonido está activado (sin errores si el navegador no tiene audio). Si el contexto está
 * suspendido, intenta reanudarlo; si no arranca en 300 ms, el efecto se descarta (no se acumulan para más tarde).
 * Devuelve una función que lo detiene si aún suena (la ruleta del estado de forma se corta al saltar); si no sonaba,
 * no hace nada.
 */
export function reproducir(efecto: Efecto): () => void {
  if (!activado) return nada;
  const c = obtenerContexto();
  if (!c) return nada;
  let detenido = false;
  let fuente: AudioBufferSourceNode | null = null;
  const listo = c.state === 'running' ? null : Promise.race([c.resume().catch(nada), new Promise((r) => setTimeout(r, 300))]);
  void Promise.all([cargar(efecto), listo]).then(([b]) => {
    if (!b || !activado || detenido || c.state !== 'running') return;
    fuente = c.createBufferSource();
    fuente.buffer = b;
    const ganancia = c.createGain();
    ganancia.gain.value = GANANCIA[efecto];
    fuente.connect(ganancia).connect(c.destination);
    fuente.start();
  });
  return () => {
    detenido = true;
    try {
      fuente?.stop();
    } catch {
      // Ya había terminado.
    }
  };
}
