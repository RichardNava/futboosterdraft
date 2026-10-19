import { CLAVES_STATS, type Demarcacion, type Nivel } from '@fbd/domain';
import { useId, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { useTextosSpecials } from '../estado/catalogo';
import '../estilos/cartas.css';
import { ABREVIATURA_STAT, ETIQUETA_NIVEL } from '../textos/niveles';
import { SiluetaJugador } from './SiluetaJugador';

/** Datos de una carta (coincide con `JugadorResumen` del protocolo). */
export interface CartaResumen {
  id: number;
  nombre: string;
  apellidos: string;
  demarcacion: Demarcacion;
  posicion: string[];
  media: number;
  nivel: Nivel;
  specials: string[];
  /** Los seis stats de su demarcación; la carta completa los muestra en el pie. */
  stats?: Record<string, number>;
}

interface Props {
  jugador: CartaResumen;
  /** Versión para listas largas: media, nombre, posiciones y nivel por el color del marco (FR-005). */
  compacta?: boolean;
  seleccionada?: boolean;
  dorsal?: number;
  onClick?: () => void;
  /** Abre la ficha con la carta completa. */
  onVerFicha?: () => void;
}

/**
 * Carta de jugador (FR-001 a FR-005; contracts/ui.md): imagen, media y nombre arriba; posiciones resaltadas
 * justo debajo del nombre; los seis stats y los specials en el pie. El acabado depende del nivel.
 */
export function CartaJugador({ jugador, compacta, seleccionada, dorsal, onClick, onVerFicha }: Props) {
  const clases = ['carta', compacta ? 'compacta' : 'completa', `nivel-${jugador.nivel.toLowerCase()}`, seleccionada ? 'seleccionada' : '']
    .filter(Boolean)
    .join(' ');
  const etiqueta = `${jugador.nombre} ${jugador.apellidos}, media ${Math.round(jugador.media)}, ${ETIQUETA_NIVEL[jugador.nivel]}`;

  const alPulsarTecla = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };
  // El cuerpo no es un <button> porque contiene los botones de los specials.
  const interactivo = onClick
    ? { role: 'button', tabIndex: 0, 'aria-pressed': seleccionada ?? false, 'aria-label': etiqueta, onClick, onKeyDown: alPulsarTecla }
    : {};

  return (
    <div
      className={clases}
      data-jugador={jugador.id}
      data-nivel={jugador.nivel}
      data-specials={jugador.specials.length}
      title={compacta ? ETIQUETA_NIVEL[jugador.nivel] : undefined}
    >
      <div className="carta-cuerpo" {...interactivo}>
        {compacta ? <ContenidoCompacto jugador={jugador} /> : <ContenidoCompleto jugador={jugador} />}
      </div>
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
      <span className="carta-nombre">
        {jugador.nombre} {jugador.apellidos.split(' ')[0]}
      </span>
      <Posiciones posiciones={jugador.posicion} />
    </>
  );
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
        </div>
        <SiluetaJugador demarcacion={jugador.demarcacion} className="carta-silueta" />
      </div>
      <div className="carta-nombre">
        <span className="carta-nombre-pila">{jugador.nombre}</span>
        <span className="carta-apellidos">{jugador.apellidos}</span>
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
        {/* Siempre, aunque esté vacío: reserva el sitio de los specials y todas las cartas miden lo mismo (H1). */}
        <Specials specials={jugador.specials} />
      </div>
    </>
  );
}

/** Cada special es un botón que abre su descripción en un popover (FR-004). */
function Specials({ specials }: { specials: string[] }) {
  const textos = useTextosSpecials();
  const base = useId();
  const id = (s: string) => `${base}-${s}`.replace(/:/g, '');
  const detener = (e: MouseEvent) => e.stopPropagation();
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
    <div className="carta-specials" data-cantidad={specials.length}>
      {specials.map((s) => (
        <span key={s}>
          <button
            type="button"
            className="carta-special"
            popoverTarget={id(s)}
            popoverTargetAction="show"
            onClick={detener}
            onPointerEnter={(e) => conPuntero(e, true)}
            onPointerLeave={(e) => conPuntero(e, false)}
          >
            {textos?.[s]?.nombre ?? s}
          </button>
          <div id={id(s)} popover="auto" className="carta-descripcion" role="tooltip">
            <strong>{textos?.[s]?.nombre ?? s}</strong>
            {textos?.[s]?.descripcion ?? 'Cargando la descripción…'}
          </div>
        </span>
      ))}
    </div>
  );
}
