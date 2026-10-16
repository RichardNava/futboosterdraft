/**
 * Creación de usuarios de prueba y peticiones HTTP autenticadas por cookie.
 */
import { randomUUID } from 'node:crypto';

export interface UsuarioPrueba {
  id: string;
  tipo: 'registrado' | 'invitado';
  apodo: string;
  cookie: string;
}

function cookieDe(respuesta: Response): string {
  return respuesta.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}

export async function peticion(
  url: string,
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; cookie?: string; cabeceras?: Record<string, string> } = {},
): Promise<{ estado: number; cuerpo: any; respuesta: Response }> {
  const respuesta = await fetch(url + ruta, {
    method: opciones.metodo ?? (opciones.cuerpo === undefined ? 'GET' : 'POST'),
    headers: {
      ...(opciones.cuerpo === undefined ? {} : { 'content-type': 'application/json' }),
      ...(opciones.cookie ? { cookie: opciones.cookie } : {}),
      origin: 'http://localhost:5173',
      ...opciones.cabeceras,
    },
    body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
  });
  const texto = await respuesta.text();
  let cuerpo: unknown = texto;
  try {
    cuerpo = texto ? JSON.parse(texto) : null;
  } catch {
    /* no JSON */
  }
  return { estado: respuesta.status, cuerpo, respuesta };
}

export async function crearInvitado(url: string): Promise<UsuarioPrueba> {
  const r = await peticion(url, '/api/auth/invitado', { metodo: 'POST' });
  if (r.estado !== 200) throw new Error(`No se pudo crear el invitado: ${r.estado} ${JSON.stringify(r.cuerpo)}`);
  return { ...r.cuerpo.usuario, cookie: cookieDe(r.respuesta) };
}

export async function crearRegistrado(url: string, apodo = `Jugador${randomUUID().slice(0, 6)}`): Promise<UsuarioPrueba> {
  const email = `${randomUUID()}@pruebas.test`;
  const r = await peticion(url, '/api/auth/registro', { cuerpo: { email, password: 'contraseña-segura', apodo } });
  if (r.estado !== 200) throw new Error(`No se pudo registrar: ${r.estado} ${JSON.stringify(r.cuerpo)}`);
  const cookie = cookieDe(r.respuesta);
  const me = await peticion(url, '/api/me', { cookie });
  return { ...me.cuerpo.usuario, cookie };
}
