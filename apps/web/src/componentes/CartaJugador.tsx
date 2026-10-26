import { CLAVES_STATS, type Demarcacion, type Nivel } from '@fbd/domain';
import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { useTextosRasgos } from '../estado/catalogo';
import { ABREVIATURA_STAT, ETIQUETA_NIVEL } from '../textos/niveles';
import { nombreSeleccion, rutaBandera, rutaEscudo } from '../textos/selecciones';
import { Icono } from './Icono';
import { NombreRecortado } from './NombreRecortado';

/** Datos de una carta (coincide con `JugadorResumen` del protocolo). */
export interface CartaResumen {
  id: number;
  nombre: string;
  apellidos: string;
  demarcacion: Demarcacion;
  posicion: string[];
  media: number;
  nivel: Nivel;
  virtudes: string[];
  /** Defectos (spec 005): en rojo y con su icono, en una fila propia bajo las virtudes. */
  defectos: string[];
  /** Los seis stats de su demarcación; la carta completa los muestra en el pie. */
  stats?: Record<string, number>;
  /**
   * Spec 006 (FR-043 a FR-047a): nombre destacado, selección e imágenes. Opcionales: las cartas guardadas en partidos
   * anteriores no los tienen y se pintan con los valores genéricos.
   */
  nombreCarta?: string;
  nacionalidad?: string;
  imagen?: string;
  imagenBg?: string;
}

/** Nombre destacado de la carta: `nombreCarta` o, en cartas antiguas, el nombre y el primer apellido. */
export function nombreCartaDe(j: Pick<CartaResumen, 'nombre' | 'apellidos' | 'nombreCarta'>): string {
  return j.nombreCarta ?? `${j.nombre} ${j.apellidos.split(' ')[0]}`;
}

const generica = (carpeta: 'siluetas' | 'fondos', j: CartaResumen) => `/cartas/${carpeta}/${j.demarcacion.toLowerCase()}.svg`;

/** Fotos de fondo por demarcación (`public/cartas/fondos/<nombre>_bg<n>.webp`). */
const FOTOS_FONDO: Record<Demarcacion, [nombre: string, cantidad: number]> = {
  POR: ['portero', 3],
  DEF: ['defensa', 3],
  MED: ['medio', 4],
  DEL: ['delantero', 4],
};

/**
 * Fondo de acción: el propio de la carta o, si solo tiene el genérico de su demarcación, una de las fotos de esa
 * demarcación elegida al azar por su id (la misma carta lleva siempre la misma).
 */
export function fondoDe(j: CartaResumen): string {
  if (j.imagenBg && j.imagenBg !== generica('fondos', j)) return j.imagenBg;
  const [nombre, cantidad] = FOTOS_FONDO[j.demarcacion];
  return `/cartas/fondos/${nombre}_bg${(Math.imul(j.id, 2654435761) >>> 0) % cantidad + 1}.webp`;
}

interface Props {
  jugador: CartaResumen;
  /** Versión para listas largas: media, nombre, posiciones y nivel por el color del marco (FR-005). */
  compacta?: boolean;
  seleccionada?: boolean;
  dorsal?: number;
  onClick?: () => void;
  /** Doble clic en la carta (en el draft, elige y confirma a la vez; spec 004, FR-056). */
  onDobleClick?: () => void;
  /** Abre la ficha con la carta completa. */
  onVerFicha?: () => void;
}

/**
 * Carta de jugador (FR-001 a FR-005; contracts/ui.md): imagen, media y nombre arriba; posiciones resaltadas
 * justo debajo del nombre; los seis stats, las virtudes y los defectos en el pie. El acabado depende del nivel.
 */
export function CartaJugador({ jugador, compacta, seleccionada, dorsal, onClick, onDobleClick, onVerFicha }: Props) {
  const clases = ['carta', compacta ? 'compacta' : 'completa', `nivel-${jugador.nivel.toLowerCase()}`, seleccionada ? 'seleccionada' : '']
    .filter(Boolean)
    .join(' ');
  const seleccion = jugador.nacionalidad ? `, ${nombreSeleccion(jugador.nacionalidad)}` : '';
  const etiqueta = `${jugador.nombre} ${jugador.apellidos}${seleccion}, media ${Math.round(jugador.media)}, ${ETIQUETA_NIVEL[jugador.nivel]}`;

  const alPulsarTecla = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };
  // El cuerpo no es un <button> por su contenido (stats, posiciones). Los botones de las virtudes van fuera de él, a su
  // lado en el DOM, para que no haya controles anidados (spec 004, FR-030); el CSS los coloca al pie de la carta.
  const interactivo = onClick
    ? { role: 'button', tabIndex: 0, 'aria-pressed': seleccionada ?? false, 'aria-label': etiqueta, onClick, onDoubleClick: onDobleClick, onKeyDown: alPulsarTecla }
    : {};

  return (
    <div
      className={clases}
      data-jugador={jugador.id}
      data-nivel={jugador.nivel}
      data-virtudes={jugador.virtudes.length}
      data-defectos={jugador.defectos.length}
      title={compacta ? ETIQUETA_NIVEL[jugador.nivel] : undefined}
    >
      {!compacta && <ImagenCarta key={fondoDe(jugador)} tipo="fondo" ruta={fondoDe(jugador)} generica={generica('fondos', jugador)} />}
      <div className="carta-cuerpo" {...interactivo}>
        {compacta ? <ContenidoCompacto jugador={jugador} /> : <ContenidoCompleto jugador={jugador} />}
      </div>
      {/* Siempre en la carta completa, aunque estén vacías: reservan el sitio de los rasgos y todas miden lo mismo (H1, 005/FR-022). */}
      {!compacta && (
        <ZonaRasgos total={jugador.virtudes.length + jugador.defectos.length}>
          <Rasgos tipo="virtud" ids={jugador.virtudes} onClick={onClick} onDobleClick={onClick ? onDobleClick : undefined} />
          <Rasgos tipo="defecto" ids={jugador.defectos} onClick={onClick} onDobleClick={onClick ? onDobleClick : undefined} />
        </ZonaRasgos>
      )}
      {dorsal !== undefined && <span className="carta-dorsal">#{dorsal}</span>}
      {onVerFicha && (
        <button type="button" className="carta-ficha" onClick={onVerFicha} aria-label={`Ver carta de ${jugador.nombre} ${jugador.apellidos}`}>
          i
        </button>
      )}
    </div>
  );
}

function Posiciones({ posiciones }: { posiciones: string[] }) {
  return (
    <ul className="carta-posiciones" aria-label="Posiciones">
      {posiciones.map((p) => (
        <li key={p} className="carta-posicion">
          {p}
        </li>
      ))}
    </ul>
  );
}

function ContenidoCompacto({ jugador }: { jugador: CartaResumen }) {
  return (
    <>
      <span className="carta-media">{Math.round(jugador.media)}</span>
      {jugador.nacionalidad && <Bandera key={jugador.nacionalidad} codigo={jugador.nacionalidad} />}
      <NombreRecortado texto={nombreCartaDe(jugador)} className="carta-nombre" />
      <Posiciones posiciones={jugador.posicion} />
    </>
  );
}

/** Bandera de la selección (FR-043); si no carga, el código en texto (FR-048). */
function Bandera({ codigo }: { codigo: string }) {
  const [fallo, setFallo] = useState(false);
  if (fallo) return <span className="carta-bandera-codigo">{codigo}</span>;
  return <img className="carta-bandera" src={rutaBandera(codigo)} alt={nombreSeleccion(codigo)} title={nombreSeleccion(codigo)} onError={() => setFallo(true)} />;
}

/** Escudo de la selección (FR-044): decorativo; si no hay o no carga, no se muestra (FR-048). */
function Escudo({ codigo }: { codigo: string }) {
  const [fallo, setFallo] = useState(false);
  const ruta = rutaEscudo(codigo);
  if (!ruta || fallo) return null;
  return <img className="carta-escudo" src={ruta} alt="" onError={() => setFallo(true)} />;
}

/**
 * Imagen superior o fondo de acción (R7; FR-045 a FR-048). Un `.svg` se pinta como máscara con el color del nivel
 * (`currentColor`); si no carga, la máscara queda vacía, sin icono roto. Otra imagen va en un `<img>` que, si falla,
 * pasa a la genérica de la demarcación.
 */
function ImagenCarta({ tipo, ruta, generica: rutaGenerica }: { tipo: 'imagen' | 'fondo'; ruta: string; generica: string }) {
  const [actual, setActual] = useState(ruta);
  const clase = tipo === 'imagen' ? 'carta-silueta' : 'carta-fondo-accion';
  if (actual.endsWith('.svg')) {
    return <span className={`${clase} mascara`} style={{ '--carta-mascara': `url("${actual}")` } as CSSProperties} aria-hidden="true" />;
  }
  return <img className={clase} src={actual} alt="" aria-hidden="true" onError={() => setActual(rutaGenerica)} />;
}

function ContenidoCompleto({ jugador }: { jugador: CartaResumen }) {
  const claves = CLAVES_STATS[jugador.demarcacion];
  return (
    <>
      <div className="carta-cabecera">
        <div className="carta-cifras">
          <span className="carta-media" aria-label={`Media ${Math.round(jugador.media)}`}>
            {Math.round(jugador.media)}
          </span>
          <span className="carta-demarcacion">{jugador.demarcacion}</span>
          {jugador.nacionalidad && (
            <span className="carta-procedencia">
              <Bandera key={jugador.nacionalidad} codigo={jugador.nacionalidad} />
              <Escudo key={`e-${jugador.nacionalidad}`} codigo={jugador.nacionalidad} />
            </span>
          )}
        </div>
        <ImagenCarta key={jugador.imagen ?? jugador.demarcacion} tipo="imagen" ruta={jugador.imagen ?? generica('siluetas', jugador)} generica={generica('siluetas', jugador)} />
      </div>
      <div className="carta-nombre">
        <span className="carta-apellidos">
          <NombreRecortado texto={nombreCartaDe(jugador)} lineas={2} />
        </span>
        <span className="carta-nombre-pila">
          <NombreRecortado texto={`${jugador.nombre} ${jugador.apellidos}`} />
        </span>
      </div>
      <Posiciones posiciones={jugador.posicion} />
      <div className="carta-pie">
        {jugador.stats && (
          <dl className="carta-stats">
            {claves.map((clave) => (
              <div key={clave} className="carta-stat">
                <dt title={clave}>{ABREVIATURA_STAT[clave]}</dt>
                <dd>{jugador.stats![clave]}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </>
  );
}

const ETIQUETA_TIPO = { virtud: 'Virtud', defecto: 'Defecto' } as const;

/** Filas de rasgos que reserva toda carta completa: las cuatro virtudes de un GOAT (H1). */
const FILAS_RASGOS = 4;
/** Escala mínima de la letra de los rasgos cuando no caben, y paso con el que se reduce. */
const ESCALA_MINIMA = 0.6;
const PASO_ESCALA = 0.05;

/** ¿Se corta algún rasgo o no caben todos en el sitio reservado? */
function desborda(zona: HTMLElement): boolean {
  const filas = Array.from(zona.querySelectorAll<HTMLElement>('.carta-virtudes, .carta-defectos'));
  if ([zona, ...filas].some((el) => el.scrollHeight > el.clientHeight + 1)) return true;
  return Array.from(zona.querySelectorAll<HTMLElement>('.carta-virtud, .carta-defecto')).some((el) => el.scrollWidth > el.clientWidth + 1);
}

/**
 * Sitio de los rasgos de la carta completa, con el alto de cuatro filas (el de la carta antes de los defectos; ronda 2
 * de la spec 005). Hasta cuatro rasgos van uno por fila; con cinco o seis, varios comparten fila si caben enteros. Si
 * aun así alguno se corta o no caben, la letra se reduce (hasta el 60 %) sin cambiar el tamaño de la carta.
 */
function ZonaRasgos({ total, children }: { total: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const zona = ref.current;
    if (!zona) return;
    const ajustar = () => {
      let escala = 1;
      zona.style.setProperty('--escala-rasgos', '1');
      while (escala > ESCALA_MINIMA && desborda(zona)) {
        escala = Math.max(ESCALA_MINIMA, escala - PASO_ESCALA);
        zona.style.setProperty('--escala-rasgos', String(escala));
      }
    };
    ajustar();
    if (typeof ResizeObserver === 'undefined') return;
    // Al cambiar el ancho de la carta o llegar los nombres de los rasgos, se vuelve a ajustar.
    const anchoObservado = new ResizeObserver(ajustar);
    anchoObservado.observe(zona);
    const textos = new MutationObserver(ajustar);
    textos.observe(zona, { characterData: true, childList: true, subtree: true });
    return () => {
      anchoObservado.disconnect();
      textos.disconnect();
    };
  }, [total]);
  return (
    <div ref={ref} className={['carta-rasgos', total > FILAS_RASGOS ? 'densa' : ''].filter(Boolean).join(' ')} data-total={total}>
      {children}
    </div>
  );
}

/**
 * Fila de virtudes o de defectos. Cada rasgo es un botón que abre su descripción en un popover (FR-004), con el
 * encabezado «Virtud · …» o «Defecto · …» (spec 005, FR-023). Fuera de esos botones, el pie es parte de la carta: la
 * pulsación y el doble clic en el hueco vacío cuentan como en el cuerpo (spec 004, FR-056); en un rasgo, no (005/FR-024).
 */
function Rasgos({ tipo, ids, onClick, onDobleClick }: { tipo: 'virtud' | 'defecto'; ids: string[]; onClick?: () => void; onDobleClick?: () => void }) {
  const textos = useTextosRasgos();
  const base = useId();
  const id = (s: string) => `${base}-${s}`.replace(/:/g, '');
  const detener = (e: MouseEvent) => e.stopPropagation();
  // Los popovers son hijos en el árbol de React: sus eventos también llegan aquí y no cuentan.
  const enHueco = (e: MouseEvent) => !(e.target as Element).closest('.carta-virtud, .carta-defecto, .carta-descripcion');
  const alPulsar = onClick ? (e: MouseEvent) => enHueco(e) && onClick() : undefined;
  const alPulsarDoble = onDobleClick ? (e: MouseEvent) => enHueco(e) && onDobleClick() : undefined;
  const conPuntero = (e: PointerEvent<HTMLButtonElement>, mostrar: boolean) => {
    if (e.pointerType !== 'mouse') return;
    const pop = document.getElementById(e.currentTarget.getAttribute('popovertarget') ?? '');
    try {
      if (mostrar) pop?.showPopover();
      else pop?.hidePopover();
    } catch {
      // Ya estaba en ese estado.
    }
  };
  return (
    // Sin rol ni foco propios: con el teclado se elige desde el cuerpo de la carta.
    <div
      className={[`carta-${tipo === 'virtud' ? 'virtudes' : 'defectos'}`, onClick ? 'pulsable' : ''].filter(Boolean).join(' ')}
      data-cantidad={ids.length}
      onClick={alPulsar}
      onDoubleClick={alPulsarDoble}
    >
      {ids.map((s) => (
        <span key={s}>
          <button
            type="button"
            className={`carta-${tipo}`}
            aria-label={`${ETIQUETA_TIPO[tipo]}: ${textos?.[s]?.nombre ?? s}`}
            popoverTarget={id(s)}
            popoverTargetAction="show"
            onClick={detener}
            onPointerEnter={(e) => conPuntero(e, true)}
            onPointerLeave={(e) => conPuntero(e, false)}
          >
            {tipo === 'defecto' && <Icono nombre="defecto" className="carta-defecto-icono" />}
            {textos?.[s]?.nombre ?? s}
          </button>
          <div id={id(s)} popover="auto" className="carta-descripcion" role="tooltip">
            <strong>
              {ETIQUETA_TIPO[tipo]} · {textos?.[s]?.nombre ?? s}
            </strong>
            {textos?.[s]?.descripcion ?? 'Cargando la descripción…'}
          </div>
        </span>
      ))}
    </div>
  );
}
