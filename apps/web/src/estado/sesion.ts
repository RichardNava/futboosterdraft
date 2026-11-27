import type { Rol } from '@fbd/domain';
import { create } from 'zustand';
import { api, ErrorApi, escucharSesionPerdida } from '../api/cliente';
import { soltarConexionInvitado } from '../conexion/activa';
import { mostrarAviso } from './avisos';
import { usePartidaActiva } from './partidaActiva';

interface Usuario {
  id: string;
  tipo: 'registrado' | 'invitado';
  apodo: string;
  email: string | null;
  rol: Rol;
}

interface EstadoSesion {
  usuario: Usuario | null;
  cargando: boolean;
  cargar(): Promise<void>;
  /** El servidor cerró el canal por falta de sesión (spec 017): si es cierto, vuelve a la portada con el aviso. */
  comprobarSesionTerminada(): Promise<void>;
  entrarComoInvitado(): Promise<void>;
  registrarse(datos: { email: string; password: string; apodo: string }): Promise<void>;
  iniciarSesion(datos: { email: string; password: string }): Promise<void>;
  cerrarSesion(): Promise<void>;
}

/** Usuario de la sesión, con su carga, acceso y salida. */
export const useSesion = create<EstadoSesion>((set, get) => ({
  usuario: null,
  cargando: true,
  async cargar() {
    try {
      const { usuario } = await api<{ usuario: Usuario }>('/api/me');
      set({ usuario, cargando: false });
    } catch (e) {
      // Spec 013 (FR-022): `api()` ya reintenta mientras el servidor no responde; cualquier otro error termina la carga
      // sin sesión (un 401, la sesión caducada, lleva a iniciar sesión) en lugar de dejar la pantalla cargando.
      set({ usuario: null, cargando: false });
      if (!(e instanceof ErrorApi && e.estado === 401)) throw e;
    }
  },
  async comprobarSesionTerminada() {
    // Un 401 lo recoge `escucharSesionPerdida`, más abajo.
    if (get().usuario) await api('/api/me', { sinCache: true }).catch(() => undefined);
  },
  async entrarComoInvitado() {
    const { usuario } = await api<{ usuario: Usuario }>('/api/auth/invitado', { metodo: 'POST' });
    set({ usuario });
  },
  async registrarse(datos) {
    await api('/api/auth/registro', { cuerpo: datos });
    await get().cargar();
  },
  async iniciarSesion(datos) {
    await api('/api/auth/login', { cuerpo: datos });
    await get().cargar();
  },
  async cerrarSesion() {
    await api('/api/auth/logout', { metodo: 'POST' });
    soltarConexionInvitado();
    set({ usuario: null });
  },
}));

// Suspensión o cambio de contraseña: a la portada con el aviso. Se olvida la partida para que salir no pregunte ni la pause.
escucharSesionPerdida(() => {
  if (!useSesion.getState().usuario) return;
  soltarConexionInvitado();
  usePartidaActiva.getState().actualizar({ partidaId: null });
  useSesion.setState({ usuario: null });
  mostrarAviso('advertencia', 'Tu sesión ha terminado', { id: 'sesion-terminada' });
});
