import type { Demarcacion, Nivel } from '@fbd/domain';
import { ETIQUETA_NIVEL } from '../textos/niveles';

/** Datos mínimos de una carta (coincide con `JugadorResumen` del protocolo). */
export interface CartaResumen {
  id: number;
  nombre: string;
  apellidos: string;
  demarcacion: Demarcacion;
  posicion: string[];
  media: number;
  nivel: Nivel;
  specials: string[];
}

interface Props {
  jugador: CartaResumen;
  compacta?: boolean;
  seleccionada?: boolean;
  dorsal?: number;
  onClick?: () => void;
  onVerFicha?: () => void;
}

export function CartaJugador({ jugador, compacta, seleccionada, dorsal, onClick, onVerFicha }: Props) {
  const clases = ['carta', `nivel-${jugador.nivel.toLowerCase()}`, compacta ? 'compacta' : '', seleccionada ? 'seleccionada' : '']
    .filter(Boolean)
    .join(' ');
  const contenido = (
    <>
      <div className="carta-cabecera">
        <span className="carta-media" title="Media">
          {Math.round(jugador.media)}
        </span>
        <span className="carta-demarcacion">{jugador.demarcacion}</span>
        {dorsal !== undefined && <span className="carta-dorsal">#{dorsal}</span>}
      </div>
      <div className="carta-nombre">
        {jugador.nombre} {compacta ? jugador.apellidos.split(' ')[0] : jugador.apellidos}
      </div>
      <div className="carta-posiciones">{jugador.posicion.join(' · ')}</div>
      {!compacta && (
        <>
          <div className="carta-nivel">{ETIQUETA_NIVEL[jugador.nivel]}</div>
          {jugador.specials.length > 0 && <div className="carta-specials">{jugador.specials.join(', ')}</div>}
        </>
      )}
    </>
  );
  return (
    <div className={clases}>
      {onClick ? (
        <button type="button" className="carta-cuerpo" onClick={onClick} aria-pressed={seleccionada}>
          {contenido}
        </button>
      ) : (
        <div className="carta-cuerpo">{contenido}</div>
      )}
      {onVerFicha && (
        <button type="button" className="carta-ficha" onClick={onVerFicha} aria-label={`Ver ficha de ${jugador.nombre}`}>
          i
        </button>
      )}
    </div>
  );
}
