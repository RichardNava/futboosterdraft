import { useEffect, useState } from 'react';
import { create } from 'zustand';

/** Spec 013 (FR-022, FR-023): un GET está esperando a que el servidor vuelva a responder. */
interface EstadoConexionServidor {
  conectando: boolean;
  /** Inicio de la espera (ms), o null. */
  desde: number | null;
}

/** Si se está intentando contactar con el servidor y desde cuándo. */
export const useConexionServidor = create<EstadoConexionServidor>(() => ({ conectando: false, desde: null }));

/** Anota que se está (o ya no) reintentando contactar con el servidor. */
export function marcarConectando(conectando: boolean): void {
  const actual = useConexionServidor.getState();
  if (actual.conectando === conectando) return;
  useConexionServidor.setState({ conectando, desde: conectando ? Date.now() : null });
}

/** Más de 3 s esperando al servidor: se avisa (FR-023). */
export function useConectandoLargo(): boolean {
  const desde = useConexionServidor((s) => s.desde);
  const [largo, setLargo] = useState(false);
  useEffect(() => {
    setLargo(false);
    if (desde === null) return;
    const t = setTimeout(() => setLargo(true), Math.max(0, desde + 3000 - Date.now()));
    return () => clearTimeout(t);
  }, [desde]);
  return largo;
}
