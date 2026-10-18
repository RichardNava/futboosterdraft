/**
 * Sonido de la aplicación (FR-010; research R17): Web Audio API con cuatro efectos cortos. El contexto de
 * audio se desbloquea con la primera interacción del usuario y la preferencia se guarda en
 * `localStorage['fbd.sonido']` (`'activado'` por defecto o `'silenciado'`), con lecturas y escrituras en
 * `try/catch` (modo privado, almacenamiento bloqueado).
 */
import { useSyncExternalStore } from 'react';

export type Efecto = 'rasgado' | 'reparto' | 'volteo' | 'revelacion';
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
  void cargar(efecto).then((b) => {
    if (!b || !activado) return;
    const fuente = c.createBufferSource();
    fuente.buffer = b;
    fuente.connect(c.destination);
    fuente.start();
  });
}
