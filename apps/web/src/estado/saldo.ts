import { create } from 'zustand';

/** Saldo de fragmentos de la barra: lo pide el `Marco` al navegar y lo actualizan la tienda y la colección. */
export const useSaldo = create<{ saldo: number | null }>(() => ({ saldo: null }));
