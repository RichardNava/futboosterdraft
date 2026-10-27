import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useBlocker, useLocation, useNavigate } from 'react-router';
import { api } from '../api/cliente';
import { RegionAvisos } from '../componentes/Aviso';
import { Icono, type NombreIcono } from '../componentes/Icono';
import { MenuNavegacion } from '../componentes/MenuNavegacion';
import { humanosActivos, usePartidaActiva } from '../estado/partidaActiva';
import { useSesion } from '../estado/sesion';
import { prepararDesbloqueo, useSonido } from '../sonido/sonido';
import { Dialogo } from '../componentes/Dialogo';
import { Insignia } from '../componentes/Insignia';
import { useAvisos } from '../estado/avisos';
import { Escudo } from '../componentes/arte/Escudo';
import { formatoFragmentos } from '../componentes/DialogoPagoPrueba';
import { useSaldo } from '../estado/saldo';

const FONDOS_PANTALLA = 11;
/** Fondo de cada vista, sorteado la primera vez que se visita y fijo durante la sesión. */
const fondoDeVista = new Map<string, string>();

/** Foto de fondo de la ruta: la de duelos es fija; el resto, una de las `background_<n>` al azar por vista. */
function fondoPantalla(ruta: string): string {
  const vista = /^\/partidas\/[^/]+\/([^/]+)/.exec(ruta)?.[1] ?? ruta.split('/')[1] ?? '';
  if (vista === 'duelos') return '/fondos/duelo_bg.webp';
  if (!fondoDeVista.has(vista)) fondoDeVista.set(vista, `/fondos/background_${Math.floor(Math.random() * FONDOS_PANTALLA) + 1}.webp`);
  return fondoDeVista.get(vista)!;
}

/** Capa de atmósfera del estadio (spec 004, FR-041): foto de fondo, focos, grano y las líneas de cal en perspectiva. */
function Ambiente({ ruta }: { ruta: string }) {
  return (
    <div className="ambiente" aria-hidden="true">
      <div className="ambiente-foto" style={{ backgroundImage: `url("${fondoPantalla(ruta)}")` }} />
      <svg className="ambiente-cal" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid meet">
        <rect x="20" y="20" width="960" height="600" />
        <path d="M500 20v600" />
        <circle cx="500" cy="320" r="92" />
        <rect x="20" y="170" width="150" height="300" />
        <rect x="830" y="170" width="150" height="300" />
        <rect x="20" y="250" width="52" height="140" />
        <rect x="928" y="250" width="52" height="140" />
      </svg>
    </div>
  );
}

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

interface Enlace {
  a: string;
  texto: string;
  icono: NombreIcono;
}

const ENLACES: Enlace[] = [
  { a: '/', texto: 'Inicio', icono: 'inicio' },
  { a: '/mis-partidas', texto: 'Mis partidas', icono: 'partidas' },
  { a: '/partidas/nueva', texto: 'Nueva partida', icono: 'nueva' },
];

/**
 * Marco de todas las pantallas (FR-017 a FR-021; spec 004, FR-012a; contracts/ui.md §2): la barra con el nombre
 * del juego, Inicio, «Mis partidas», «Nueva partida» y «Mi perfil» (o «Iniciar sesión»); el destino activo lleva
 * `aria-current="page"` y subrayado lima. Por debajo de 720 px, los enlaces pasan al `MenuNavegacion`; en el
 * partido 2D, la barra se reduce a iconos en una franja de 40 px. Debajo, la región de avisos emergentes.
 * Al salir de una partida desde la barra (o con «atrás»): en un draft con otros humanos pregunta
 * «¿Abandonar la partida?»; en una partida en solitario la pausa (`partida.pausar`) antes de salir. Mientras se juega
 * una partida (draft o torneo) en la que sigues activo, «Abandonar» abre ese mismo diálogo en cualquier momento.
 */
export function Marco() {
  const { usuario } = useSesion();
  const ubicacion = useLocation();
  const modalidadPartido = usePartidaActiva((s) => s.modalidadPartido);
  const compacta = /^\/partidas\/[^/]+\/partido\//.test(ubicacion.pathname) && modalidadPartido === '2d';
  const [modal, setModal] = useState(false);
  const [sonido, setSonido] = useSonido();
  // Conexión perdida con la partida: insignia de advertencia en la barra (spec 004, FR-023).
  const sinConexion = useAvisos((s) => s.avisos.some((a) => a.id === 'conexion'));
  useEffect(prepararDesbloqueo, []);
  // Saldo de fragmentos en la barra, solo para registrados; se vuelve a pedir en cada cambio de pantalla.
  const saldo = useSaldo((s) => s.saldo);
  const esRegistrado = usuario?.tipo === 'registrado';
  useEffect(() => {
    if (!esRegistrado) {
      useSaldo.setState({ saldo: null });
      return;
    }
    api<{ saldo: number }>('/api/fragmentos/saldo')
      .then((r) => useSaldo.setState({ saldo: r.saldo }))
      .catch(() => undefined);
  }, [esRegistrado, usuario?.id, ubicacion.pathname]);
  const [abandonando, setAbandonando] = useState(false);
  const navegar = useNavigate();
  const activa = usePartidaActiva();
  const partidaVista = partidaDeRuta(ubicacion.pathname);
  // Solo quien sigue jugando la partida que está viendo: si ya la juega un NPC por él, no hay nada que abandonar.
  const puedeAbandonar =
    partidaVista !== null &&
    activa.partidaId === partidaVista &&
    (activa.fase === 'draft' || activa.fase === 'torneo') &&
    humanosActivos(activa.participantes).some((p) => p.id === activa.miParticipanteId);
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
      else {
        // Desde el botón: se olvida la partida para que salir al inicio no vuelva a preguntar ni a pausar.
        usePartidaActiva.getState().actualizar({ partidaId: null });
        void navegar('/');
      }
    }
  };

  const cuenta: Enlace = usuario
    ? { a: usuario.tipo === 'registrado' ? '/perfil' : '/cuenta', texto: 'Mi perfil', icono: 'perfil' }
    : { a: '/?acceso=entrar', texto: 'Iniciar sesión', icono: 'perfil' };
  // Colección y tienda, solo para registrados (spec 006, FR-025, FR-034).
  const registrado: Enlace[] =
    usuario?.tipo === 'registrado'
      ? [
          { a: '/coleccion', texto: 'Colección', icono: 'cartas' },
          { a: '/tienda', texto: 'Tienda', icono: 'tienda' },
        ]
      : [];
  const enlaces = [...ENLACES, ...registrado, cuenta];
  const textoSonido = sonido ? 'Silenciar los sonidos' : 'Activar los sonidos';
  const interruptorSonido = (conTexto: boolean) => (
    <button
      type="button"
      className="texto interruptor-sonido"
      aria-label={conTexto ? undefined : textoSonido}
      aria-pressed={!sonido}
      title={conTexto ? undefined : textoSonido}
      onClick={() => setSonido(!sonido)}
    >
      <Icono nombre={sonido ? 'sonido' : 'sinSonido'} tamano={20} />
      {conTexto && textoSonido}
    </button>
  );
  const listaEnlaces = (soloIconos: boolean) =>
    enlaces.map((e) => (
      <li key={e.texto}>
        <NavLink to={e.a} end={e.a === '/'} aria-current={e.a.includes('?') ? false : undefined} aria-label={soloIconos ? e.texto : undefined} title={soloIconos ? e.texto : undefined}>
          <Icono nombre={e.icono} tamano={soloIconos ? 20 : 18} />
          {!soloIconos && e.texto}
        </NavLink>
      </li>
    ));

  return (
    <>
      <Ambiente ruta={ubicacion.pathname} />
      <nav className={compacta ? 'barra-navegacion compacta' : 'barra-navegacion'} aria-label="Navegación principal">
        <Link to="/" className="marca">
          <Escudo className="escudo" tamano={compacta ? 24 : 32} />
          <span>
            Fútbooster<wbr />
            draft
          </span>
        </Link>
        {sinConexion && <Insignia texto="Sin conexión" tipo="advertencia" />}
        {puedeAbandonar && (
          <button type="button" className="texto boton-abandonar" aria-label="Abandonar la partida" title="Abandonar la partida" onClick={() => setModal(true)}>
            <Icono nombre="cerrar" tamano={18} />
            {!compacta && <span>Abandonar</span>}
          </button>
        )}
        {compacta ? (
          <>
            <ul className="enlaces-navegacion">{listaEnlaces(true)}</ul>
            {interruptorSonido(false)}
          </>
        ) : (
          <>
            <div className="navegacion-escritorio">
              <ul className="enlaces-navegacion">{listaEnlaces(false)}</ul>
              {interruptorSonido(false)}
            </div>
            {esRegistrado && saldo !== null && (
              <Link to="/tienda#fragmentos" className="saldo-navegacion" aria-label={`Fragmentos: ${formatoFragmentos.format(saldo)}. Comprar fragmentos`} title="Comprar fragmentos">
                <Icono nombre="cristal" tamano={18} />
                {formatoFragmentos.format(saldo)}
              </Link>
            )}
            <MenuNavegacion enlaces={listaEnlaces(false)} sonido={interruptorSonido(true)} />
          </>
        )}
      </nav>
      {/* Contenedor único bajo la barra de navegación: la barra del botón principal es `sticky` dentro de él (FR-007). */}
      <div className={compacta ? 'contenido compacto' : 'contenido'}>
        <Outlet />
      </div>
      <RegionAvisos />
      {modal && (
        <Dialogo etiquetadoPor="titulo-abandono" alEscape={seguir}>
          <h2 id="titulo-abandono">¿Abandonar la partida?</h2>
          <p>Si sales ahora, abandonarás la partida y un NPC ocupará tu plaza</p>
          <div className="acciones">
            <button type="button" className="secundario" onClick={seguir} autoFocus>
              {activa.fase === 'draft' ? 'Seguir en el draft' : 'Seguir jugando'}
            </button>
            <button type="button" className="peligro" onClick={() => void abandonar()} disabled={abandonando}>
              Abandonar
            </button>
          </div>
        </Dialogo>
      )}
    </>
  );
}
