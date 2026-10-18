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
      if (e instanceof ErrorApi && e.estado === 401) set({ usuario: null, cargando: false });
      else throw e;
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
