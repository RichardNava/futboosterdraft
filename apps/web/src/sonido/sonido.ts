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
 * Ganancia de cada fichero (normalizados a −3 dBFS) para que suene como el efecto anterior equivalente. Los duelos
 * suenan once veces seguidas: su entrada, su choque y la ruleta van bastante más bajos que el resto.
 */
const BASE: Record<Efecto, number> = {
  apertura: 0.35,
  reparto: 0.6,
  volteo: 0.6,
  revelacion: 0.4,
  entradaDuelo: 0.15,
  choqueDuelo: 0.3,
  ruletaForma: 0.25,
  aplausos: 0.5,
  trompetas: 0.45,
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

function cargar(efecto: Efecto): Promise<AudioBuffer | null> {
  let b = buferes.get(efecto);
  if (!b) {
    const c = obtenerContexto();
    b = c
      ? fetch(`/sonidos/${efecto}.mp3`)
          .then((r) => r.arrayBuffer())
          .then((datos) => c.decodeAudioData(datos))
          .catch(() => null)
      : Promise.resolve(null);
    buferes.set(efecto, b);
  }
  return b;
}

const nada = () => {};

/**
 * Reproduce un efecto si el sonido está activado (sin errores si el navegador no tiene audio). Devuelve una función
 * que lo detiene si aún suena (la ruleta del estado de forma se corta al saltar); si no sonaba, no hace nada.
 */
export function reproducir(efecto: Efecto): () => void {
  if (!activado) return nada;
  const c = obtenerContexto();
  if (!c || c.state !== 'running') return nada;
  let detenido = false;
  let fuente: AudioBufferSourceNode | null = null;
  void cargar(efecto).then((b) => {
    if (!b || !activado || detenido) return;
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
