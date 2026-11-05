/**
 * Catálogo de cosméticos (`GET /api/cosmeticos`, spec 011): lo comparten la tienda y los selectores de escudo y de
 * sobre. Con sesión registrada lleva la posesión; tras una compra se recarga.
 */
import type { RespuestaCosmeticos } from '@fbd/protocol';
import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from '../api/cliente';

interface EstadoCosmeticos {
  catalogo: RespuestaCosmeticos | null;
  error: boolean;
  recargar(): Promise<void>;
}

export const useCosmeticos = create<EstadoCosmeticos>((set) => ({
  catalogo: null,
  error: false,
  async recargar() {
    try {
      set({ catalogo: await api<RespuestaCosmeticos>('/api/cosmeticos'), error: false });
    } catch {
      set({ error: true });
    }
  },
}));

/** Catálogo cargado al montar quien lo usa (se recarga por si cambió la sesión o hubo compras). */
export function useCatalogoCosmeticos(): EstadoCosmeticos {
  const estado = useCosmeticos();
  useEffect(() => {
    void useCosmeticos.getState().recargar();
  }, []);
  return estado;
}
