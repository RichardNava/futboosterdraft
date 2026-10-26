/**
 * Ficha de una carta de la colección (spec 006, FR-039, FR-021, FR-022; contracts/ui.md «Ficha»): la carta ampliada,
 * su historia, las colecciones en las que está, el interruptor «Activa» y «Desfragmentar (+N)» con confirmación.
 * Se cierra con el botón, con Escape o al pulsar fuera.
 */
import type { CartaPoseida } from '@fbd/protocol';
import { useState } from 'react';
import { CartaJugador } from './CartaJugador';
import { Dialogo } from './Dialogo';
import { InterruptorActiva } from './InterruptorActiva';

interface Props {
  carta: CartaPoseida;
  /** Nombre de cada colección por id. */
  nombresColecciones: ReadonlyMap<string, string>;
  /** Motivo por el que no se puede desactivar (mínimo), o null. */
  motivoMinimo: string | null;
  onCambiarActiva: (activa: boolean) => Promise<void>;
  onDesfragmentar: () => Promise<void>;
  onCerrar: () => void;
}

export function FichaCartaColeccion({ carta, nombresColecciones, motivoMinimo, onCambiarActiva, onDesfragmentar, onCerrar }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const desfragmentar = async () => {
    setEnviando(true);
    try {
      await onDesfragmentar();
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  };

  if (confirmando) {
    return (
      <Dialogo rol="alertdialog" etiquetadoPor="titulo-desfragmentar" alEscape={() => setConfirmando(false)}>
        <h2 id="titulo-desfragmentar">¿Desfragmentar {carta.nombreCarta}?</h2>
        <p>Recibirás {carta.valorFragmentos} fragmentos. Esta acción no se puede deshacer</p>
        <div className="acciones">
          <button type="button" className="secundario" onClick={() => setConfirmando(false)} autoFocus>
            Cancelar
          </button>
          <button type="button" className="peligro" onClick={() => void desfragmentar()} disabled={enviando}>
            Desfragmentar
          </button>
        </div>
      </Dialogo>
    );
  }

  return (
    <Dialogo etiquetadoPor="titulo-ficha-coleccion" alEscape={onCerrar} alPulsarFondo={onCerrar}>
      <div className="ficha-coleccion">
        <div className="ficha-coleccion-carta">
          <CartaJugador jugador={carta} />
        </div>
        <div className="ficha-coleccion-datos">
          <h2 id="titulo-ficha-coleccion">{carta.nombreCarta}</h2>
          <p className="nota">
            {carta.nombre} {carta.apellidos}
          </p>
          {carta.historia && <p>{carta.historia}</p>}
          <ul className="chips" aria-label="Colecciones">
            {carta.colecciones.map((id) => (
              <li key={id} className="insignia suave">
                {nombresColecciones.get(id) ?? id}
              </li>
            ))}
          </ul>
          <InterruptorActiva carta={carta} motivoMinimo={motivoMinimo} onCambiar={onCambiarActiva} />
          {carta.esCore ? (
            <p className="nota">Las cartas de Core no se pueden desfragmentar</p>
          ) : (
            <button type="button" className="secundario" onClick={() => setConfirmando(true)}>
              Desfragmentar (+{carta.valorFragmentos})
            </button>
          )}
          <div className="acciones">
            <button type="button" className="secundario" onClick={onCerrar}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Dialogo>
  );
}
