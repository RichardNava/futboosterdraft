import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ErrorApi } from '../api/cliente';
import { BandejaAvisos } from '../componentes/BandejaAvisos';
import { useSesion } from '../estado/sesion';

type Modo = 'menu' | 'login' | 'registro';

export function Inicio() {
  const { usuario, entrarComoInvitado, iniciarSesion, registrarse, cerrarSesion } = useSesion();
  const navegar = useNavigate();
  const [modo, setModo] = useState<Modo>('menu');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const ejecutar = async (accion: () => Promise<void>) => {
    setError(null);
    setEnviando(true);
    try {
      await accion();
      navegar('/partidas/nueva');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo completar la operación');
    } finally {
      setEnviando(false);
    }
  };

  const enviarFormulario = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const email = String(datos.get('email') ?? '');
    const password = String(datos.get('password') ?? '');
    if (modo === 'login') void ejecutar(() => iniciarSesion({ email, password }));
    else void ejecutar(() => registrarse({ email, password, apodo: String(datos.get('apodo') ?? '') }));
  };

  if (usuario) {
    return (
      <main className="pantalla inicio">
        <h1>Fútboosterdraft</h1>
        <p>
          Hola, <strong>{usuario.apodo}</strong>
          {usuario.tipo === 'invitado' && ' (invitado)'}
        </p>
        <div className="acciones">
          <button type="button" onClick={() => navegar('/partidas/nueva')}>
            Crear partida
          </button>
          {usuario.tipo === 'invitado' && (
            <button type="button" onClick={() => setModo('registro')}>
              Crear cuenta y conservar mi partida
            </button>
          )}
          <button type="button" className="secundario" onClick={() => void cerrarSesion()}>
            Cerrar sesión
          </button>
          {usuario.tipo === 'registrado' && (
            <button type="button" className="secundario" onClick={() => navegar('/perfil')}>
              Mi perfil
            </button>
          )}
          {usuario.tipo === 'registrado' && <BandejaAvisos />}
        </div>
        {modo === 'registro' && usuario.tipo === 'invitado' && <FormularioCuenta modo="registro" onEnviar={enviarFormulario} enviando={enviando} />}
        {error && <p className="error" role="alert">{error}</p>}
      </main>
    );
  }

  return (
    <main className="pantalla inicio">
      <h1>Fútboosterdraft</h1>
      <p className="lema">Draftea tu plantilla sobre a sobre y compite.</p>
      <div className="acciones">
        <button type="button" disabled={enviando} onClick={() => void ejecutar(entrarComoInvitado)}>
          Jugar como invitado
        </button>
        <button type="button" className="secundario" onClick={() => setModo('login')}>
          Iniciar sesión
        </button>
        <button type="button" className="secundario" onClick={() => setModo('registro')}>
          Registrarse
        </button>
      </div>
      {modo !== 'menu' && <FormularioCuenta modo={modo} onEnviar={enviarFormulario} enviando={enviando} />}
      {error && <p className="error" role="alert">{error}</p>}
      <p className="nota">Como invitado puedes jugar en directo contra la IA. Para jugar con otras personas o en torneos asíncronos necesitas una cuenta.</p>
    </main>
  );
}

function FormularioCuenta({
  modo,
  onEnviar,
  enviando,
}: {
  modo: 'login' | 'registro';
  onEnviar: (e: FormEvent<HTMLFormElement>) => void;
  enviando: boolean;
}) {
  return (
    <form className="formulario" onSubmit={onEnviar}>
      {modo === 'registro' && (
        <label>
          Apodo
          <input name="apodo" required minLength={3} maxLength={20} autoComplete="nickname" />
        </label>
      )}
      <label>
        Correo electrónico
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Contraseña
        <input name="password" type="password" required minLength={8} autoComplete={modo === 'login' ? 'current-password' : 'new-password'} />
      </label>
      <button type="submit" disabled={enviando}>
        {modo === 'login' ? 'Entrar' : 'Crear cuenta'}
      </button>
    </form>
  );
}
