import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useBlocker, useLocation } from 'react-router';
import { api } from '../api/cliente';
import { humanosActivos, usePartidaActiva } from '../estado/partidaActiva';
import { useSesion } from '../estado/sesion';
import { prepararDesbloqueo, useSonido } from '../sonido/sonido';

/** Id de la partida de una ruta `/partidas/:id/…` (no la de crear una nueva). */
function partidaDeRuta(ruta: string): string | null {
  const m = /^\/partidas\/([^/]+)\//.exec(ruta);
  return m && m[1] !== 'nueva' ? m[1]! : null;
}

type Salida = 'modal' | 'pausa' | null;

/** Qué hacer al salir de la partida que se está viendo (research R10 y R11). */
function salidaDe(desde: string, hacia: string): Salida {
  const actual = partidaDeRuta(desde);
  if (!actual || partidaDeRuta(hacia) === actual) return null;
  const a = usePartidaActiva.getState();
  if (a.partidaId !== actual) return null;
  const humanos = humanosActivos(a.participantes);
  const otros = humanos.some((h) => h.id !== a.miParticipanteId);
  // Modal solo en el draft con otros humanos activos; en solitario, se pausa sin preguntar.
  if (a.fase === 'draft' && otros) return 'modal';
  if (!otros && humanos.length === 1) return 'pausa';
  return null;
}

const ENLACES = [
  { a: '/', texto: 'Inicio', icono: '🏠' },
  { a: '/mis-partidas', texto: 'Mis partidas', icono: '📋' },
  { a: '/partidas/nueva', texto: 'Nueva partida', icono: '➕' },
] as const;

/**
 * Marco de todas las pantallas (FR-017 a FR-021; contracts/ui.md): la barra con Inicio, «Mis partidas»,
 * «Nueva partida» y «Cuenta» (o «Iniciar sesión»), que en el partido 2D se reduce a iconos en una franja de
 * 40 px. Al salir de una partida desde la barra (o con «atrás»): en un draft con otros humanos pregunta
 * «¿Abandonar la partida?»; en una partida en solitario la pausa (`partida.pausar`) antes de salir.
 */
export function Marco() {
  const { usuario } = useSesion();
  const ubicacion = useLocation();
  const modalidadPartido = usePartidaActiva((s) => s.modalidadPartido);
  const compacta = /^\/partidas\/[^/]+\/partido\//.test(ubicacion.pathname) && modalidadPartido === '2d';
  const [modal, setModal] = useState(false);
  const [sonido, setSonido] = useSonido();
  useEffect(prepararDesbloqueo, []);
  const [abandonando, setAbandonando] = useState(false);
  const salida = useRef<Salida>(null);
  const bloqueo = useBlocker(({ currentLocation, nextLocation }) => {
    salida.current = salidaDe(currentLocation.pathname, nextLocation.pathname);
    return salida.current !== null;
  });

  useEffect(() => {
    if (bloqueo.state !== 'blocked') return;
    if (salida.current === 'modal') {
      setModal(true);
      return;
    }
    // Pausa en solitario: se envía antes de cerrar la conexión y se sale aunque no llegue respuesta.
    const conexion = usePartidaActiva.getState().conexion;
    const pausa = conexion ? conexion.enviar({ t: 'partida.pausar' }).catch(() => undefined) : Promise.resolve();
    void Promise.race([pausa, new Promise((r) => setTimeout(r, 1000))]).then(() => bloqueo.proceed());
  }, [bloqueo]);

  const seguir = () => {
    setModal(false);
    if (bloqueo.state === 'blocked') bloqueo.reset();
  };
  const abandonar = async () => {
    const partidaId = usePartidaActiva.getState().partidaId;
    setAbandonando(true);
    try {
      if (partidaId) await api(`/api/partidas/${partidaId}/abandonar`, { metodo: 'POST' });
    } finally {
      setAbandonando(false);
      setModal(false);
      if (bloqueo.state === 'blocked') bloqueo.proceed();
    }
  };

  const cuenta = usuario ? { a: '/cuenta', texto: 'Cuenta', icono: '👤' } : { a: '/', texto: 'Iniciar sesión', icono: '🔑' };
  return (
    <>
      <nav className={compacta ? 'barra-navegacion compacta' : 'barra-navegacion'} aria-label="Navegación principal">
        {[...ENLACES, cuenta].map((e) => (
          <NavLink key={e.texto} to={e.a} end={e.a === '/'} aria-label={compacta ? e.texto : undefined} title={compacta ? e.texto : undefined}>
            {compacta ? (
              <span aria-hidden="true">{e.icono}</span>
            ) : (
              <>
                <span aria-hidden="true">{e.icono}</span> {e.texto}
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          className="secundario interruptor-sonido"
          aria-label={sonido ? 'Silenciar los sonidos' : 'Activar los sonidos'}
          aria-pressed={!sonido}
          title={sonido ? 'Silenciar los sonidos' : 'Activar los sonidos'}
          onClick={() => setSonido(!sonido)}
        >
          <span aria-hidden="true">{sonido ? '🔊' : '🔇'}</span>
        </button>
      </nav>
      {/* Contenedor único bajo la barra de navegación: la barra del botón principal es `sticky` dentro de él (FR-007). */}
      <div className={compacta ? 'contenido compacto' : 'contenido'}>
        <Outlet />
      </div>
      {modal && (
        <div className="modal-fondo">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-abandono">
            <h2 id="titulo-abandono">¿Abandonar la partida?</h2>
            <p>Si sales ahora, abandonarás la partida y un NPC ocupará tu plaza</p>
            <div className="acciones">
              <button type="button" onClick={seguir} autoFocus>
                Seguir en el draft
              </button>
              <button type="button" className="peligro" onClick={() => void abandonar()} disabled={abandonando}>
                Abandonar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
