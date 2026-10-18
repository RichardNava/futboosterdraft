/**
 * Conexión de fondo de la partida activa de un invitado (research R10): la regla de pérdida de la partida
 * (10 minutos sin conexión, 001/FR-000) mide la conexión con la aplicación, no con la pantalla de la
 * partida. Mientras la pestaña esté abierta, el invitado mantiene abierta la conexión de su partida aunque
 * navegue a otra sección. Un invitado solo tiene una partida activa, así que basta con una.
 */
import { ConexionPartida } from './ws';

let activa: { partidaId: string; conexion: ConexionPartida } | null = null;

/** Mantiene abierta la conexión de la partida de un invitado (cierra la anterior si era otra). */
export function mantenerConexionInvitado(partidaId: string): void {
  if (activa?.partidaId === partidaId) return;
  activa?.conexion.cerrar();
  const conexion = new ConexionPartida(partidaId);
  // Si la partida termina, la abandona o la sesión se cierra, el servidor cierra la conexión: se suelta.
  conexion.alRecibir((m) => {
    if (m.t === 'error' && m.codigo === 'PARTIDA_ABANDONADA') soltarConexionInvitado();
  });
  conexion.conectar();
  activa = { partidaId, conexion };
}

export function soltarConexionInvitado(): void {
  activa?.conexion.cerrar();
  activa = null;
}
