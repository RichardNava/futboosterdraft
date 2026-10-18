/**
 * Textos de los specials (FR-004; research R16): nombre visible y descripción, de
 * `GET /api/catalogo/specials`. Se cargan una sola vez por sesión del navegador.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from '../api/cliente';

export interface TextoSpecial {
  id: string;
  nombre: string;
  descripcion: string;
}

interface EstadoCatalogo {
  specials: Record<string, TextoSpecial> | null;
  cargando: boolean;
  cargarSpecials(): Promise<void>;
}

const useCatalogo = create<EstadoCatalogo>((set, get) => ({
  specials: null,
  cargando: false,
  async cargarSpecials() {
    if (get().specials || get().cargando) return;
    set({ cargando: true });
    try {
      const lista = await api<TextoSpecial[]>('/api/catalogo/specials');
      set({ specials: Object.fromEntries(lista.map((s) => [s.id, s])) });
    } finally {
      set({ cargando: false });
    }
  },
}));

/** Textos de los specials; mientras se cargan, `null` (la carta muestra el identificador). */
export function useTextosSpecials(): Record<string, TextoSpecial> | null {
  const specials = useCatalogo((s) => s.specials);
  const cargar = useCatalogo((s) => s.cargarSpecials);
  useEffect(() => {
    if (!specials) void cargar().catch(() => undefined);
  }, [specials, cargar]);
  return specials;
}
