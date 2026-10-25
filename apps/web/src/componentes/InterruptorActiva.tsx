/**
 * Interruptor «Activa» de una carta de la colección (spec 006, FR-013, FR-040): fuera del cuerpo de la carta. Si
 * desactivarla incumpliría el mínimo, queda `aria-disabled` con el motivo en `title` y, si aun así se pulsa, avisa
 * con el mismo texto. La respuesta del servidor manda.
 */
import type { CartaPoseida } from '@fbd/protocol';
import { useState } from 'react';
import { mostrarAviso } from '../estado/avisos';

interface Props {
  carta: Pick<CartaPoseida, 'id' | 'activa' | 'nombreCarta'>;
  motivoMinimo: string | null;
  onCambiar: (activa: boolean) => Promise<void>;
}

export function InterruptorActiva({ carta, motivoMinimo, onCambiar }: Props) {
  const [enviando, setEnviando] = useState(false);
  const bloqueado = carta.activa && motivoMinimo !== null;

  const pulsar = async () => {
    if (enviando) return;
    if (bloqueado) {
      mostrarAviso('advertencia', motivoMinimo, { id: 'minimo-activo' });
      return;
    }
    setEnviando(true);
    try {
      await onCambiar(!carta.activa);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <label className="interruptor interruptor-activa" title={bloqueado ? motivoMinimo : undefined}>
      <input
        type="checkbox"
        role="switch"
        checked={carta.activa}
        aria-disabled={bloqueado || enviando ? 'true' : undefined}
        aria-label={`Activa: ${carta.nombreCarta}`}
        // Controlado: el estado visible lo fija la respuesta del servidor.
        onChange={() => void pulsar()}
      />
      Activa
    </label>
  );
}
