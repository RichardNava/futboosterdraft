/**
 * Textos de los rasgos, virtudes y defectos (FR-004; research R16; spec 005): nombre visible y descripción, de
 * `GET /api/catalogo/rasgos`. Se cargan una sola vez por sesión del navegador. Los ids de virtudes y defectos no se
 * repiten, así que van en un solo mapa.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from '../api/cliente';

export interface TextoRasgo {
  id: string;
  nombre: string;
  descripcion: string;
  ambito?: string;
  impacto?: number;
}

interface EstadoCatalogo {
  rasgos: Record<string, TextoRasgo> | null;
  cargando: boolean;
  cargarRasgos(): Promise<void>;
}

const useCatalogo = create<EstadoCatalogo>((set, get) => ({
  rasgos: null,
  cargando: false,
  async cargarRasgos() {
    if (get().rasgos || get().cargando) return;
    set({ cargando: true });
    try {
      const { virtudes, defectos } = await api<{ virtudes: TextoRasgo[]; defectos: TextoRasgo[] }>('/api/catalogo/rasgos');
      set({ rasgos: Object.fromEntries([...virtudes, ...defectos].map((s) => [s.id, s])) });
    } finally {
      set({ cargando: false });
    }
  },
}));

/** Textos de los rasgos; mientras se cargan, `null` (la carta muestra el identificador). */
export function useTextosRasgos(): Record<string, TextoRasgo> | null {
  const rasgos = useCatalogo((s) => s.rasgos);
  const cargar = useCatalogo((s) => s.cargarRasgos);
  useEffect(() => {
    if (!rasgos) void cargar().catch(() => undefined);
  }, [rasgos, cargar]);
  return rasgos;
}
