/**
 * Aspecto de la cuenta: escudo y sobres (spec 011, research R14). Se carga una vez por usuario y lo actualizan el
 * perfil y la tienda. Si la petición falla, el juego sigue con el sobre original y los círculos de color.
 */
import type { Aspecto, CuerpoAspecto } from '@fbd/protocol';
import { create } from 'zustand';
import { api } from '../api/cliente';
import { urlSobre } from '../componentes/arte/SobreArte';
import { useSesion } from './sesion';

interface EstadoAspecto {
  aspecto: Aspecto | null;
  /** Usuario al que pertenece `aspecto`: otro usuario obliga a recargar. */
  de: string | null;
  cargar(): Promise<Aspecto | null>;
  recargar(): Promise<Aspecto | null>;
  actualizar(cambios: CuerpoAspecto): Promise<Aspecto>;
}

export const useAspecto = create<EstadoAspecto>((set, get) => ({
  aspecto: null,
  de: null,
  async cargar() {
    const usuario = useSesion.getState().usuario;
    if (!usuario) return null;
    if (get().de === usuario.id && get().aspecto) return get().aspecto;
    return get().recargar();
  },
  async recargar() {
    const usuario = useSesion.getState().usuario;
    if (!usuario) return null;
    try {
      const aspecto = await api<Aspecto>('/api/perfil/aspecto');
      set({ aspecto, de: usuario.id });
      return aspecto;
    } catch {
      return null;
    }
  },
  async actualizar(cambios) {
    const aspecto = await api<Aspecto>('/api/perfil/aspecto', { metodo: 'PUT', cuerpo: cambios });
    set({ aspecto, de: useSesion.getState().usuario?.id ?? null });
    return aspecto;
  },
}));

/** Diseño del sobre de la siguiente apertura (avanza el carrusel); el original si la petición falla. */
export async function sobreSiguiente(): Promise<string> {
  try {
    return (await api<{ diseno: string }>('/api/perfil/aspecto/sobre-siguiente', { metodo: 'POST' })).diseno;
  } catch {
    return 'sobre-original';
  }
}

/** Espera máxima a la imagen del sobre antes de empezar la apertura; si tarda más, se abre el original. */
const ESPERA_IMAGEN_MS = 1500;

/**
 * Siguiente diseño con su imagen ya descargada y decodificada: la apertura no empieza con el sobre original ni con
 * un hueco que luego cambia (el «pestañeo» del carrusel).
 */
export async function prepararSobre(): Promise<string> {
  const diseno = await sobreSiguiente();
  if (diseno === 'sobre-original' || typeof Image === 'undefined') return diseno;
  const img = new Image();
  img.src = urlSobre(diseno);
  const cargada = img.decode().then(
    () => diseno,
    () => 'sobre-original',
  );
  return Promise.race([
    cargada,
    new Promise<string>((r) => setTimeout(() => r('sobre-original'), ESPERA_IMAGEN_MS)),
  ]);
}
