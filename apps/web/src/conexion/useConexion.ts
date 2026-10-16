import { useEffect, useRef, useState } from 'react';
import { ConexionPartida, type MensajeServidor } from './ws';

export interface EstadoServidor {
  fase: 'sala' | 'draft' | 'preparacion' | 'partido' | 'torneo';
  vista: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- la forma depende de la fase
}

/**
 * Conexión en tiempo real a una partida. Devuelve la conexión, la última instantánea `estado` y si
 * hay conexión. `alMensaje` recibe cada mensaje del servidor.
 */
export function useConexion(partidaId: string | undefined, alMensaje?: (m: MensajeServidor) => void) {
  const [conexion, setConexion] = useState<ConexionPartida | null>(null);
  const [estado, setEstado] = useState<EstadoServidor | null>(null);
  const [conectada, setConectada] = useState(false);
  const oyente = useRef(alMensaje);
  oyente.current = alMensaje;

  useEffect(() => {
    if (!partidaId) return;
    const c = new ConexionPartida(partidaId);
    const quitarMensajes = c.alRecibir((m) => {
      if (m.t === 'estado') setEstado({ fase: m.fase as EstadoServidor['fase'], vista: m.vista });
      oyente.current?.(m);
    });
    const quitarConexion = c.alCambiarConexion(setConectada);
    c.conectar();
    setConexion(c);
    return () => {
      quitarMensajes();
      quitarConexion();
      c.cerrar();
    };
  }, [partidaId]);

  return { conexion, estado, conectada };
}

/** Segundos que faltan hasta `venceEn` según el reloj del servidor; se actualiza cada 250 ms. */
export function useCuentaAtras(venceEn: string | null | undefined, conexion: ConexionPartida | null): number | null {
  const [restante, setRestante] = useState<number | null>(null);
  useEffect(() => {
    if (!venceEn) {
      setRestante(null);
      return;
    }
    const objetivo = Date.parse(venceEn);
    const calcular = () => setRestante(Math.max(0, Math.ceil((objetivo - (conexion?.ahoraServidor() ?? Date.now())) / 1000)));
    calcular();
    const id = window.setInterval(calcular, 250);
    return () => window.clearInterval(id);
  }, [venceEn, conexion]);
  return restante;
}
