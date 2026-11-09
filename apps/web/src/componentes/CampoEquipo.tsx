import {
  ANCHO_CAMPO,
  LARGO_CAMPO,
  statsEfectivos,
  type Jugador,
  type ParametrosEquilibrado,
  type ResultadoColocacion,
} from '@fbd/domain';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as EventoPuntero,
  type ReactNode,
} from 'react';
import type { CartaResumen } from './CartaJugador';
import { CartaJugador, nombreCartaDe } from './CartaJugador';
import type { DestinoSoltar, EstadoCampo } from './campoEquipoEstado';
import { VistaCarta } from './VistaCarta';
import { contornoSobreLienzo } from './colores';
import { MediaEquipo, mediaEquipo } from './MediaEquipo';

/** A partir de este desplazamiento (px) un gesto es un arrastre y no un clic. */
const UMBRAL_ARRASTRE = 5;
const PASO = 10;
const PASO_LARGO = 50;

interface Props {
  estado: EstadoCampo;
  /** `colocacionDe(estado)`: posición efectiva y punto de cada titular. */
  colocacion: ResultadoColocacion;
  jugadores: Map<number, CartaResumen>;
  parametros: ParametrosEquilibrado;
  dorsales: Record<number, number> | null;
  colores: { principal: string; secundario: string };
  /** `partido`: fichas bloqueadas y distintivos de tarjetas, lesión y cansancio (gestión del equipo, US5). */
  modo: 'preparacion' | 'partido';
  /** Fuera del banquillo: el resto de la plantilla (solo en la preparación). */
  reserva?: number[];
  /** Jugadores que no se pueden llevar al campo (de baja, sustituidos o expulsados). */
  bloqueados?: ReadonlySet<number>;
  /** Distintivos por jugador (baja, tarjetas, lesión, cansancio). */
  distintivos?: ReadonlyMap<number, ReactNode>;
  maxBanquillo?: number;
  /** Sin banquillo (modo Duelo de jugadores, spec 005): solo el campo y el resto de la plantilla. */
  sinBanquillo?: boolean;
  /** Bajo la media del once (Formación): el resumen de la colocación. */
  bajoMedia?: ReactNode;
  /**
   * Pestañas sobre el lateral (Formación): su lista, la activa y, si no es la de la plantilla, el panel que sustituye
   * al banquillo y al resto. Sin ellas, el lateral es solo la plantilla.
   */
  pestanas?: { lista: ReactNode; activa: string; panel?: ReactNode };
  /**
   * `horizontal` (Formación en pantallas anchas, retoques de la spec 011): el campo tumbado, con la portería propia a
   * la izquierda, y la media y el resumen encima del lateral para que el campo aproveche el alto.
   */
  orientacion?: 'vertical' | 'horizontal';
  onSoltar: (jugadorId: number, destino: DestinoSoltar) => void;
  onMover: (jugadorId: number, dx: number, dy: number) => void;
  onArrastrando?: (arrastrando: boolean) => void;
}

interface Arrastre {
  jugadorId: number;
  inicio: { x: number; y: number };
  actual: { x: number; y: number };
  movido: boolean;
}

/**
 * Campo único del equipo (spec 003, FR-001 a FR-003; research R14; contracts/ui.md). Titulares, banquillo y resto
 * de la plantilla se arrastran con Pointer Events (ratón, táctil o lápiz) y la lógica de cada gesto está en el
 * reductor `campoEquipoEstado`. Con teclado: Intro selecciona, las flechas mueven (Mayús, pasos largos) e Intro
 * sobre otra ficha intercambia; Escape cancela.
 *
 * Se dibuja en vertical, con la propia portería abajo: x (0–1000) hacia arriba e y (0–640) de izquierda a derecha.
 * En horizontal, la portería propia queda a la izquierda: x hacia la derecha e y de arriba abajo.
 */
export function CampoEquipo(props: Props) {
  const {
    estado,
    colocacion,
    jugadores,
    parametros,
    dorsales,
    colores,
    modo,
    reserva = [],
    bloqueados,
    distintivos,
    maxBanquillo = 7,
    sinBanquillo,
    bajoMedia,
    pestanas,
    orientacion = 'vertical',
    onSoltar,
    onMover,
    onArrastrando,
  } = props;
  const horizontal = orientacion === 'horizontal';
  const campo = useRef<HTMLDivElement>(null);
  const banquillo = useRef<HTMLDivElement>(null);
  const restoPlantilla = useRef<HTMLDivElement>(null);
  const [arrastre, setArrastreEstado] = useState<Arrastre | null>(null);
  const arrastreRef = useRef<Arrastre | null>(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);

  const setArrastre = (a: Arrastre | null) => {
    arrastreRef.current = a;
    setArrastreEstado(a);
  };
  const arrastrando = arrastre?.movido === true;
  useEffect(() => onArrastrando?.(arrastrando), [arrastrando, onArrastrando]);

  /** Punto del campo (unidades) bajo unas coordenadas de pantalla, o null si está fuera. */
  const puntoCampo = (x: number, y: number): { x: number; y: number } | null => {
    const r = campo.current?.getBoundingClientRect();
    if (!r || r.width === 0 || x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
    if (horizontal)
      return { x: ((x - r.left) / r.width) * LARGO_CAMPO, y: ((y - r.top) / r.height) * ANCHO_CAMPO };
    return { x: ((r.bottom - y) / r.height) * LARGO_CAMPO, y: ((x - r.left) / r.width) * ANCHO_CAMPO };
  };
  /** Sitio de un punto del campo en la pantalla (porcentajes desde la izquierda y desde abajo). */
  const sitio = (x: number, y: number) =>
    horizontal
      ? { left: `${(x / LARGO_CAMPO) * 100}%`, bottom: `${(1 - y / ANCHO_CAMPO) * 100}%` }
      : { left: `${(y / ANCHO_CAMPO) * 100}%`, bottom: `${(x / LARGO_CAMPO) * 100}%` };
  const dentro = (el: HTMLElement | null, x: number, y: number) => {
    const r = el?.getBoundingClientRect();
    return r !== undefined && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };
  /** Ficha de una lista (banquillo o resto) bajo el puntero, para intercambiarla (hallazgo H4). */
  const fichaListaEn = (seccion: HTMLElement | null, x: number, y: number): number | undefined => {
    if (!seccion) return undefined;
    for (const el of seccion.querySelectorAll<HTMLElement>('.ficha-lista[data-jugador]')) {
      if (dentro(el, x, y)) return Number(el.dataset.jugador);
    }
    return undefined;
  };
  const destinoEn = (x: number, y: number): DestinoSoltar => {
    const p = puntoCampo(x, y);
    if (p) return { tipo: 'campo', punto: p };
    if (!sinBanquillo && dentro(banquillo.current, x, y)) {
      const sobre = fichaListaEn(banquillo.current, x, y);
      return sobre === undefined ? { tipo: 'banquillo' } : { tipo: 'banquillo', sobre };
    }
    if (dentro(restoPlantilla.current, x, y)) {
      const sobre = fichaListaEn(restoPlantilla.current, x, y);
      return sobre === undefined ? { tipo: 'reserva' } : { tipo: 'reserva', sobre };
    }
    return { tipo: 'fuera' };
  };

  // Mientras dura un gesto, el puntero se sigue en la ventana (sale de la ficha y del campo).
  useEffect(() => {
    if (!arrastre) return;
    const mover = (e: PointerEvent) => {
      const a = arrastreRef.current;
      if (!a) return;
      const movido = a.movido || Math.hypot(e.clientX - a.inicio.x, e.clientY - a.inicio.y) > UMBRAL_ARRASTRE;
      setArrastre({ ...a, actual: { x: e.clientX, y: e.clientY }, movido });
    };
    const soltarPuntero = (e: PointerEvent) => {
      const a = arrastreRef.current;
      setArrastre(null);
      if (!a) return;
      if (a.movido) {
        onSoltar(a.jugadorId, destinoEn(e.clientX, e.clientY));
        setSeleccionado(null);
      } else pulsar(a.jugadorId);
    };
    const cancelar = () => setArrastre(null);
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltarPuntero);
    window.addEventListener('pointercancel', cancelar);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltarPuntero);
      window.removeEventListener('pointercancel', cancelar);
    };
    // Solo se suscribe al empezar o terminar un gesto.
  }, [arrastre !== null]);

  const empezar = (jugadorId: number) => (e: EventoPuntero<HTMLElement>) => {
    if (e.button !== 0 || !movible(jugadorId)) return;
    e.preventDefault();
    setArrastre({
      jugadorId,
      inicio: { x: e.clientX, y: e.clientY },
      actual: { x: e.clientX, y: e.clientY },
      movido: false,
    });
  };

  const estaEnCampo = (id: number) => colocacion.titulares.some((t) => t.jugadorId === id);
  // Uno de baja solo se puede sacar: del campo o, en la preparación, del banquillo al resto (spec 012, FR-029).
  const movible = (id: number) => !bloqueados?.has(id) || estaEnCampo(id) || (modo === 'preparacion' && estado.banquillo.includes(id));
  const puntoDe = (id: number) => colocacion.titulares.find((t) => t.jugadorId === id);

  /** Clic o Intro: selecciona; con otro seleccionado, lo suelta sobre este (intercambio). */
  function pulsar(jugadorId: number) {
    if (seleccionado === null || seleccionado === jugadorId) {
      setSeleccionado(seleccionado === jugadorId ? null : jugadorId);
      return;
    }
    const destino = puntoDe(jugadorId);
    if (destino) onSoltar(seleccionado, { tipo: 'campo', punto: { x: destino.x, y: destino.y } });
    else if (estaEnCampo(seleccionado) && estado.banquillo.includes(jugadorId)) {
      // Titular seleccionado y suplente pulsado: el suplente entra por él.
      const p = puntoDe(seleccionado)!;
      onSoltar(jugadorId, { tipo: 'campo', punto: { x: p.x, y: p.y } });
    } else if (estado.banquillo.includes(seleccionado) && reserva.includes(jugadorId)) {
      // Suplente y jugador del resto: se intercambian (hallazgo H4).
      onSoltar(seleccionado, { tipo: 'reserva', sobre: jugadorId });
    } else if (reserva.includes(seleccionado) && estado.banquillo.includes(jugadorId)) {
      onSoltar(seleccionado, { tipo: 'banquillo', sobre: jugadorId });
    }
    setSeleccionado(null);
  }

  const alTeclado = (jugadorId: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pulsar(jugadorId);
      return;
    }
    if (e.key === 'Escape') {
      setSeleccionado(null);
      return;
    }
    const paso = e.shiftKey ? PASO_LARGO : PASO;
    // Las flechas mueven en la pantalla: en horizontal, derecha es avanzar y arriba, hacia la banda izquierda.
    const flechas: Record<string, [number, number]> = horizontal
      ? { ArrowRight: [paso, 0], ArrowLeft: [-paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }
      : { ArrowUp: [paso, 0], ArrowDown: [-paso, 0], ArrowLeft: [0, -paso], ArrowRight: [0, paso] };
    if (seleccionado === jugadorId && flechas[e.key] && estaEnCampo(jugadorId)) {
      e.preventDefault();
      onMover(jugadorId, ...flechas[e.key]!);
    }
  };

  /** Vista previa del punto mientras se arrastra una ficha del campo. */
  const enVuelo = arrastre?.movido ? puntoCampo(arrastre.actual.x, arrastre.actual.y) : null;

  const fichaCampo = (jugadorId: number, x: number, y: number, posicion: string, casillaId: string) => {
    const j = jugadores.get(jugadorId);
    if (!j) return null;
    const ef = statsEfectivos(
      j as unknown as Jugador,
      { posicionesAdmitidas: [posicion as Jugador['posicion'][number]] },
      parametros,
    );
    const penal = Math.round(ef.penalizacion * 100);
    const sel = seleccionado === jugadorId;
    const moviendo = arrastre?.jugadorId === jugadorId && arrastre.movido;
    const nombre = `${j.nombre} ${j.apellidos}`;
    return (
      <VistaCarta key={jugadorId} jugador={j} arrastrando={arrastrando} dorsal={dorsales?.[jugadorId]}>
        <button
          type="button"
          className={`ficha-equipo ${sel ? 'seleccionada' : ''} ${moviendo ? 'arrastrando' : ''} ${penal > 0 ? 'fuera' : ''} ${bloqueados?.has(jugadorId) ? 'de-baja' : ''}`}
          style={sitio(x, y)}
          data-jugador={jugadorId}
          data-casilla={casillaId}
          data-posicion={posicion}
          aria-pressed={sel}
          aria-label={`${nombre}: ${posicion}, media ${Math.round(ef.media)}${penal > 0 ? `, fuera de posición (−${penal} %)` : ''}${sel ? ', seleccionado: flechas para mover, Intro sobre otra ficha para intercambiar' : ''}`}
          onPointerDown={empezar(jugadorId)}
          onKeyDown={alTeclado(jugadorId)}
        >
          <span
            className={contornoSobreLienzo(colores.principal) ? 'chapa con-contorno' : 'chapa'}
            style={{ background: colores.principal, color: colores.secundario }}
          >
            {/* Spec 008: el retrato identifica mejor al jugador; sin él (cartas antiguas), el dorsal. */}
            {j.imagen?.startsWith('/cartas/retratos-propios/') ? (
              <img src={j.imagen} alt="" draggable={false} />
            ) : (
              (dorsales?.[jugadorId] ?? '')
            )}
          </span>
          {/* Media y posición en círculos a los lados del retrato; debajo, dorsal y nombre (rediseño 2026-11-04). */}
          <span className="ficha-equipo-media">
            {Math.round(ef.media)}
            <span className="badge-fuera" hidden={penal === 0}>
              −{penal}%
            </span>
          </span>
          <span className="ficha-equipo-posicion">{posicion}</span>
          <span className="ficha-equipo-nombre">
            {dorsales?.[jugadorId] !== undefined && (
              <span className="ficha-equipo-dorsal">{dorsales[jugadorId]}</span>
            )}
            {nombreCartaDe(j)}
          </span>
          {distintivos?.get(jugadorId)}
        </button>
      </VistaCarta>
    );
  };

  const fichaLista = (id: number) => {
    const j = jugadores.get(id);
    if (!j) return null;
    const bloqueado = !movible(id);
    return (
      <VistaCarta key={id} jugador={j} arrastrando={arrastrando} dorsal={dorsales?.[id]}>
        <div
          className={`ficha-lista ${bloqueado ? 'bloqueada' : ''} ${seleccionado === id ? 'seleccionada' : ''}`}
          data-jugador={id}
          onPointerDown={bloqueado ? undefined : empezar(id)}
          tabIndex={bloqueado ? -1 : 0}
          role="button"
          aria-disabled={bloqueado}
          aria-pressed={seleccionado === id}
          aria-label={`${j.nombre} ${j.apellidos}${bloqueados?.has(id) ? ' (no disponible)' : ''}`}
          onKeyDown={bloqueado ? undefined : alTeclado(id)}
        >
          <CartaJugador jugador={j} compacta dorsal={dorsales?.[id]} seleccionada={seleccionado === id} />
          {distintivos?.get(id)}
        </div>
      </VistaCarta>
    );
  };

  // En Formación, la media del once en estrellas y en cifra (spec 004, FR-060) y el resumen de la colocación.
  const cabecera = (
    <>
      {modo === 'preparacion' ? <MediaEquipo media={mediaEquipo(colocacion, jugadores, parametros)}>{bajoMedia}</MediaEquipo> : bajoMedia}
    </>
  );
  const lateral = (
    <div className="campo-equipo-lateral">
      {pestanas?.lista}
      <div
        className="campo-equipo-secciones"
        {...(pestanas
          ? {
              role: 'tabpanel',
              id: `panel-${pestanas.activa}`,
              'aria-labelledby': `pestana-${pestanas.activa}`,
            }
          : {})}
      >
        {pestanas?.panel ?? (
          <>
            {!sinBanquillo && (
              <section
                ref={banquillo}
                aria-label="Banquillo"
                className="banquillo"
                data-testid="banquillo"
                data-ayuda="Los suplentes: suéltalos sobre un titular para hacer el cambio."
              >
                <h2>
                  Banquillo ({estado.banquillo.length}/{maxBanquillo})
                </h2>
                <div className="lista-compacta">{estado.banquillo.map(fichaLista)}</div>
              </section>
            )}
            {reserva.length > 0 && (
              <section
                ref={restoPlantilla}
                aria-label="Resto de la plantilla"
                data-testid="reserva"
                data-ayuda="No juegan este partido: arrástralos al banquillo o al campo para convocarlos."
              >
                <h2>Resto de la plantilla</h2>
                <div className="lista-compacta">{reserva.map(fichaLista)}</div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className={`campo-equipo modo-${modo}${horizontal ? ' horizontal' : ''}`}>
      <div className="campo-equipo-principal">
        {!horizontal && cabecera}
        <div
          ref={campo}
          className={`campo campo-unico${horizontal ? ' horizontal' : ''}`}
          aria-label="Campo del equipo"
          data-testid="campo-equipo"
          data-ayuda="Arrastra a un titular para recolocarlo o suéltalo sobre otro para intercambiarlos."
        >
          <LineasCampo horizontal={horizontal} />
          {colocacion.titulares.map((t) =>
            fichaCampo(t.jugadorId, t.x, t.y, t.posicionEfectiva, t.casillaId),
          )}
          {enVuelo && arrastre && (
            <span className="marca-destino" style={sitio(enVuelo.x, enVuelo.y)} aria-hidden="true" />
          )}
        </div>
      </div>
      {horizontal ? (
        <div className="campo-equipo-lado">
          {cabecera}
          {lateral}
        </div>
      ) : (
        lateral
      )}
      {arrastre?.movido && (
        <span
          className="ficha-fantasma"
          style={{ left: arrastre.actual.x, top: arrastre.actual.y }}
          aria-hidden="true"
        >
          {dorsales?.[arrastre.jugadorId] ??
            (jugadores.has(arrastre.jugadorId) && nombreCartaDe(jugadores.get(arrastre.jugadorId)!))}
        </span>
      )}
    </div>
  );
}

/**
 * Líneas de cal del campo en vertical, con la portería propia abajo (spec 004, FR-043): banda, medio campo, círculo
 * central, áreas, puntos de penalti y medias lunas, a escala reglamentaria sobre 64 × 100. Decorativas.
 */
function LineasCampo({ horizontal = false }: { horizontal?: boolean }) {
  return (
    <svg
      className="campo-lineas"
      viewBox={horizontal ? '0 0 100 64' : '0 0 64 100'}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* En horizontal, el mismo dibujo girado: (u, v) del vertical pasa a (100 − v, u), con la portería propia a la izquierda. */}
      <g transform={horizontal ? 'matrix(0 1 -1 0 100 0)' : undefined}>
        <rect x="1" y="1" width="62" height="98" />
        <path d="M1 50h62" />
        <circle cx="32" cy="50" r="8.5" />
        <circle cx="32" cy="50" r="0.6" className="punto" />
        <rect x="12.5" y="1" width="39" height="15.5" />
        <rect x="22" y="1" width="20" height="5.2" />
        <circle cx="32" cy="11.2" r="0.6" className="punto" />
        <path d="M25.6 16.5a8.5 8.5 0 0 0 12.8 0" />
        <rect x="12.5" y="83.5" width="39" height="15.5" />
        <rect x="22" y="93.8" width="20" height="5.2" />
        <circle cx="32" cy="88.8" r="0.6" className="punto" />
        <path d="M25.6 83.5a8.5 8.5 0 0 1 12.8 0" />
      </g>
    </svg>
  );
}
