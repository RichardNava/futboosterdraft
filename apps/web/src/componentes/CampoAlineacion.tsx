import type { Casilla } from '@fbd/domain';
import type { CartaResumen } from './CartaJugador';

export interface CasillaVista {
  casillaId: string;
  media: number;
  fueraDePosicion: boolean;
  penalizacion: number;
}

interface Props {
  casillas: readonly Casilla[];
  titulares: Record<string, number | undefined>;
  jugadores: Map<number, CartaResumen>;
  previsualizacion: Map<string, CasillaVista>;
  dorsales: Record<number, number> | null;
  colores: { principal: string; secundario: string };
  seleccionado: number | null;
  onSoltar: (casillaId: string, jugadorId: number) => void;
  onPulsarCasilla: (casillaId: string) => void;
}

/**
 * Campo con las 11 casillas de la formación (FR-025, FR-028). Se puede arrastrar un jugador a una
 * casilla o, como alternativa accesible, seleccionarlo y pulsar la casilla.
 */
export function CampoAlineacion({ casillas, titulares, jugadores, previsualizacion, dorsales, colores, seleccionado, onSoltar, onPulsarCasilla }: Props) {
  return (
    <div className="campo" aria-label="Campo de alineación">
      {casillas.map((c) => {
        const jugadorId = titulares[c.id];
        const j = jugadorId !== undefined ? jugadores.get(jugadorId) : undefined;
        const vista = previsualizacion.get(c.id);
        // x: 0 (portería propia) → 1000; se dibuja de abajo arriba. y: 0 banda izquierda → 640 derecha.
        const estilo = { left: `${(c.zona.y / 640) * 100}%`, bottom: `${(c.zona.x / 1000) * 88 + 4}%` };
        const fuera = vista?.fueraDePosicion ?? false;
        return (
          <button
            key={c.id}
            type="button"
            className={`casilla ${j ? 'ocupada' : 'vacia'} ${fuera ? 'fuera' : ''} ${seleccionado !== null ? 'destino' : ''}`}
            style={estilo}
            onClick={() => onPulsarCasilla(c.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = Number(e.dataTransfer.getData('text/plain'));
              if (Number.isInteger(id)) onSoltar(c.id, id);
            }}
            draggable={j !== undefined}
            onDragStart={(e) => j && e.dataTransfer.setData('text/plain', String(j.id))}
            aria-label={`${c.etiqueta}: ${j ? `${j.nombre} ${j.apellidos}` : 'vacía'}${fuera ? ', fuera de posición' : ''}`}
          >
            <span className="casilla-codigo">{c.etiqueta}</span>
            {j ? (
              <>
                <span className="chapa" style={{ background: colores.principal, color: colores.secundario }}>
                  {dorsales?.[j.id] ?? ''}
                </span>
                <span className="casilla-nombre">{j.apellidos.split(' ')[0]}</span>
                <span className="casilla-media">
                  {vista ? Math.round(vista.media) : Math.round(j.media)}
                  {fuera && <span className="badge-fuera"> −{Math.round((vista?.penalizacion ?? 0) * 100)} %</span>}
                </span>
              </>
            ) : (
              <span className="casilla-nombre">—</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
