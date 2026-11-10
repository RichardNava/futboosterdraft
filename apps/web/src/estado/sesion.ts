import { create } from 'zustand';
import { api, ErrorApi } from '../api/cliente';
import { soltarConexionInvitado } from '../conexion/activa';

export interface Usuario {
  id: string;
  tipo: 'registrado' | 'invitado';
  apodo: string;
  email: string | null;
}

interface EstadoSesion {
  usuario: Usuario | null;
  cargando: boolean;
  cargar(): Promise<void>;
  entrarComoInvitado(): Promise<void>;
  registrarse(datos: { email: string; password: string; apodo: string }): Promise<void>;
  iniciarSesion(datos: { email: string; password: string }): Promise<void>;
  cerrarSesion(): Promise<void>;
}

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
