import { enCache } from '../api/cache';
import type { Jugador, Nivel } from '@fbd/domain';
import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api } from '../api/cliente';
import { AvisoAcceso } from '../componentes/AvisoAcceso';
import { BandejaAvisos } from '../componentes/BandejaAvisos';
import { CartaJugador, type CartaResumen } from '../componentes/CartaJugador';
import { Icono } from '../componentes/Icono';
import { Estadio } from '../componentes/arte/Estadio';
import { SobreDecorativo } from '../componentes/SobreDecorativo';
import { useSesion } from '../estado/sesion';
import { destinoPartida, type PartidaResumen } from './MisPartidas';

type Modo = 'menu' | 'login' | 'registro';

const masReciente = (enCurso: PartidaResumen[]) => [...enCurso].sort((a, b) => Date.parse(b.actualizadaEn) - Date.parse(a.actualizadaEn))[0] ?? null;

/** La partida en curso más reciente, para «Continuar partida» (spec 004, FR-015). `undefined` mientras se carga. */
function usePartidaEnCurso(activa: boolean): PartidaResumen | null | undefined {
  // Spec 014 (US6): con lo que acaba de cargar el loader, sin esperar.
  const [partida, setPartida] = useState<PartidaResumen | null | undefined>(() => {
    const r = enCache<{ enCurso: PartidaResumen[] }>('/api/mis-partidas', { fresco: true });
    return r ? masReciente(r.enCurso) : undefined;
  });
  useEffect(() => {
    if (!activa) return;
    let vigente = true;
    api<{ enCurso: PartidaResumen[] }>('/api/mis-partidas')
      .then((r) => {
        if (vigente) setPartida(masReciente(r.enCurso));
      })
      .catch(() => vigente && setPartida(null));
    return () => {
      vigente = false;
    };
  }, [activa]);
  return partida;
}

/**
 * Inicio (spec 004, FR-014, FR-015; contracts/ui.md §3). Sin sesión: el nombre del juego en cartel, una frase que
 * lo explica y «Empezar a jugar», que abre el registro (o el acceso). Con sesión: «Continuar partida» hacia la
 * partida en curso más reciente o, si no hay ninguna, «Nueva partida»; «Mis partidas» de secundario.
 */
export function Inicio() {
  const { usuario, entrarComoInvitado, iniciarSesion, registrarse, cerrarSesion } = useSesion();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const acceso = parametros.get('acceso');
  const pideAcceso = acceso === 'entrar' || acceso === 'registro';
  const [modo, setModo] = useState<Modo>(acceso === 'entrar' ? 'login' : acceso === 'registro' ? 'registro' : 'menu');
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);
  const enCurso = usePartidaEnCurso(usuario !== null);

  useEffect(() => {
    if (pideAcceso) setModo(acceso === 'registro' ? 'registro' : 'login');
  }, [pideAcceso, acceso]);

  const ejecutar = async (accion: () => Promise<void>) => {
    setError(null);
    setEnviando(true);
    try {
      await accion();
      navegar('/partidas/nueva');
    } catch (e) {
      setError(e);
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

  // Spec 013 (FR-026, FR-028): en los formularios, el aviso va arriba, sobre su cabecera, sin cambiar su altura.
  const errorVisible = error !== null && modo === 'menu' && <AvisoAcceso error={error} />;
  const avisoFormulario = error !== null && modo !== 'menu' ? <AvisoAcceso error={error} /> : null;

  if (usuario) {
    return (
      <main className="pantalla inicio">
        <section className="portada" aria-labelledby="titulo-inicio">
          <div className="portada-texto">
            <h1 id="titulo-inicio" className="cartel">
              Fútbooster<wbr />
              draft
            </h1>
            <p className="entradilla">
              Hola, <strong>{usuario.apodo}</strong>
              {usuario.tipo === 'invitado' && ' (invitado)'}.{' '}
              {enCurso ? 'Tu partida te espera.' : 'Abre sobres, elige a tus jugadores por turnos y gana el torneo con tu once.'}
            </p>
            <div className="inicio-acciones">
              <Link className="boton boton-principal" data-principal="" to={enCurso ? destinoPartida(enCurso) : '/partidas/nueva'}>
                {enCurso ? 'Continuar partida' : 'Nueva partida'}
              </Link>
              <Link className="boton secundario" to="/mis-partidas">
                Mis partidas
              </Link>
              {usuario.tipo === 'registrado' && (
                <Link className="boton secundario" to="/coleccion">
                  Colección
                </Link>
              )}
              {usuario.tipo === 'registrado' && <BandejaAvisos />}
            </div>
            <div className="inicio-cuenta">
              {usuario.tipo === 'invitado' && modo !== 'registro' && (
                <button type="button" className="secundario" onClick={() => setModo('registro')}>
                  Crear cuenta y conservar mi partida
                </button>
              )}
              {usuario.tipo === 'registrado' && (
                <Link className="boton texto" to="/perfil">
                  Mi perfil
                </Link>
              )}
              {/* Botón con presencia, visible sin desplazarse (spec 012, FR-031). */}
              <button type="button" className="secundario boton-sesion" onClick={() => void cerrarSesion()}>
                <Icono nombre="perfil" />
                Cerrar sesión
              </button>
            </div>
            {modo === 'registro' && usuario.tipo === 'invitado' && (
              <FormularioCuenta modo="registro" onEnviar={enviarFormulario} enviando={enviando} onVolver={() => setModo('menu')} principal={false} aviso={avisoFormulario} />
            )}
            {errorVisible}
          </div>
          <EscenaPortada />
        </section>
      </main>
    );
  }

  return (
    <main className="pantalla inicio">
      <section className="portada" aria-labelledby="titulo-inicio">
        <div className="portada-texto">
          <h1 id="titulo-inicio" className="cartel">
            Fútbooster<wbr />
            draft
          </h1>
          <p className="entradilla">Abre sobres, elige a tus jugadores por turnos y gana el torneo con tu once.</p>
          {modo === 'menu' && (
            <div className="inicio-acciones">
              <button type="button" className="boton-principal" data-principal="" onClick={() => setModo('registro')}>
                Empezar a jugar
              </button>
              <button type="button" className="secundario alternativa" disabled={enviando} onClick={() => void ejecutar(entrarComoInvitado)}>
                Jugar como invitado
              </button>
              <button type="button" className="secundario boton-sesion" onClick={() => setModo('login')}>
                <Icono nombre="perfil" />
                Iniciar sesión
              </button>
            </div>
          )}
          {modo !== 'menu' && (
            <FormularioCuenta
              modo={modo}
              onEnviar={enviarFormulario}
              enviando={enviando}
              onVolver={() => setModo('menu')}
              onCambiar={() => setModo(modo === 'login' ? 'registro' : 'login')}
              principal
              aviso={avisoFormulario}
            />
          )}
          {errorVisible}
          <p className="nota">Como invitado puedes jugar en directo contra la IA. Para jugar con otras personas o en torneos asíncronos necesitas una cuenta.</p>
        </div>
        <EscenaPortada />
      </section>
      <ol className="pasos" aria-label="Cómo se juega">
        <li>
          <Icono nombre="cartas" tamano={28} />
          <h2>Abre sobres</h2>
          <p>Cada ronda abres un sobre de 8 jugadores: plata, violeta, oro y, con suerte, un GOAT.</p>
        </li>
        <li>
          <Icono nombre="flecha" tamano={28} />
          <h2>Elige por turnos</h2>
          <p>Te quedas con uno y pasas el resto a la mesa. Al final de tres sobres tienes 24 jugadores.</p>
        </li>
        <li>
          <Icono nombre="trofeo" tamano={28} />
          <h2>Gana el torneo</h2>
          <p>Elige tu once y la táctica, y juega cada partido en simulación rápida o en 2D.</p>
        </li>
      </ol>
    </main>
  );
}

/**
 * Composición de la portada (spec 004, FR-045): el sobre recién abierto con cuatro cartas reales en abanico, una por
 * nivel y al azar entre las mejores de cada uno, bajo los focos del estadio. Decorativa e inerte: no recibe el foco ni la lee el lector de pantalla.
 */
const NIVELES_PORTADA: Nivel[] = ['Superclase', 'Crack', 'Legendario', 'GOAT'];

/** Del catálogo oficial (colección Core), una carta al azar entre las cuatro de media más alta de cada nivel. */
export function cartasPortada(catalogo: readonly (Jugador & { colecciones?: string[] })[], azar = Math.random): CartaResumen[] {
  return NIVELES_PORTADA.flatMap((nivel) => {
    const grupo = catalogo
      .filter((j) => j.nivel === nivel && j.colecciones?.includes('core'))
      .sort((a, b) => b.media - a.media)
      .slice(0, 4);
    const j = grupo[Math.floor(azar() * grupo.length)];
    return j ? [{ ...j, nombreCarta: j.nombre_carta, imagenBg: j.imagen_bg, stats: j.stats as unknown as Record<string, number> }] : [];
  });
}

function EscenaPortada() {
  const [cartas, setCartas] = useState<CartaResumen[]>([]);
  useEffect(() => {
    let vigente = true;
    // Sin catálogo (servidor caído), la escena queda con el sobre y el estadio.
    api<Jugador[]>('/api/catalogo/jugadores')
      .then((c) => vigente && setCartas(cartasPortada(c)))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);
  return (
    <div className="portada-escena" aria-hidden="true" inert>
      <Estadio className="portada-estadio" />
      <div className="portada-abanico">
        {cartas.map((c, i) => (
          <div key={c.id} className="portada-carta" style={{ '--i': i } as CSSProperties}>
            <CartaJugador jugador={c} />
          </div>
        ))}
      </div>
      <SobreDecorativo className="portada-sobre" />
    </div>
  );
}


function FormularioCuenta({
  modo,
  onEnviar,
  enviando,
  onVolver,
  onCambiar,
  principal,
  aviso,
}: {
  modo: 'login' | 'registro';
  onEnviar: (e: FormEvent<HTMLFormElement>) => void;
  enviando: boolean;
  onVolver: () => void;
  onCambiar?: () => void;
  /** El envío es el botón principal de la pantalla. */
  principal: boolean;
  /** Aviso de error, sobre la cabecera del formulario (spec 013, FR-026). */
  aviso?: ReactNode;
}) {
  return (
    <form className="formulario panel formulario-cuenta" onSubmit={onEnviar} aria-labelledby="titulo-cuenta">
      <h2 id="titulo-cuenta">{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
      <div className="aviso-acceso-ranura">{aviso}</div>
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
      <div className="acciones">
        <button type="submit" className={principal ? 'boton-principal' : 'secundario'} {...(principal ? { 'data-principal': '' } : {})} disabled={enviando}>
          {modo === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
        {onCambiar && (
          <button type="button" className="secundario boton-sesion" onClick={onCambiar}>
            <Icono nombre="perfil" />
            {modo === 'login' ? 'Crear una cuenta' : 'Ya tengo cuenta'}
          </button>
        )}
        <button type="button" className="texto" onClick={onVolver}>
          Volver
        </button>
      </div>
    </form>
  );
}
