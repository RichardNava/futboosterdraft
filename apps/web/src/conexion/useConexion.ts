import { useEffect, useRef, useState } from 'react';
import { cerrarAviso, mostrarAviso } from '../estado/avisos';
import { usePartidaActiva } from '../estado/partidaActiva';
import { useSesion } from '../estado/sesion';
import { mantenerConexionInvitado } from './activa';
import { ConexionPartida, type MensajeServidor } from './ws';

export interface EstadoServidor {
  fase: 'sala' | 'draft' | 'preparacion' | 'partido' | 'torneo';
  vista: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- la forma depende de la fase
}

const AVISO_CONEXION = 'conexion';

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
    const activa = usePartidaActiva.getState();
    const quitarMensajes = c.alRecibir((m) => {
      if (m.t === 'estado') {
        setEstado({ fase: m.fase as EstadoServidor['fase'], vista: m.vista });
        // La barra de navegación necesita saber en qué partida y fase está, y con quién (research R10, R11).
        const vista = m.vista as { partida?: { miParticipanteId?: string | null; participantes?: [] } };
        activa.actualizar({
          partidaId,
          fase: m.fase as string,
          miParticipanteId: vista.partida?.miParticipanteId ?? null,
          participantes: vista.partida?.participantes ?? [],
          conexion: c,
        });
      }
      if (m.t === 'sala.actualizada' && Array.isArray(m.participantes)) activa.actualizar({ participantes: m.participantes as [] });
      if (m.t === 'draft.turno' && m.animacion === true) activa.actualizar({ aperturaPendiente: { partidaId, ronda: m.ronda as number } });
      oyente.current?.(m);
    });
    const quitarConexion = c.alCambiarConexion(setConectada);
    // Aviso de conexión perdida (spec 004, FR-026; contracts/ui.md §8): advertencia mientras se reintenta y error si
    // ya no se puede reintentar. Solo tras haber conectado una vez.
    let haConectado = false;
    const quitarAviso = c.alCambiarConexion((ok) => {
      if (ok) {
        haConectado = true;
        cerrarAviso(AVISO_CONEXION);
        return;
      }
      if (!haConectado) return;
      if (c.sinReintento) {
        mostrarAviso('error', 'Sin conexión con el servidor. Recarga la página; si sigue igual, vuelve a iniciar sesión.', {
          id: AVISO_CONEXION,
          persistente: true,
          accion: { etiqueta: 'Recargar', onClick: () => window.location.reload() },
        });
      } else {
        mostrarAviso('advertencia', 'Sin conexión con el servidor. Reintentando…', {
          id: AVISO_CONEXION,
          persistente: true,
          accion: { etiqueta: 'Reintentar ahora', onClick: () => c.reintentarAhora() },
        });
      }
    });
    c.conectar();
    setConexion(c);
    // Un invitado mantiene abierta la conexión de su partida mientras navega por otras secciones.
    if (useSesion.getState().usuario?.tipo === 'invitado') mantenerConexionInvitado(partidaId);
    return () => {
      quitarMensajes();
      quitarConexion();
      quitarAviso();
      cerrarAviso(AVISO_CONEXION);
      usePartidaActiva.getState().olvidarConexion(c);
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
