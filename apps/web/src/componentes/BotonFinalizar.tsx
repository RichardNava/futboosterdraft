import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Envía `partido.finalizar`; devuelve el `ack`. */
  finalizar: () => Promise<{ ok: boolean; error?: { mensaje?: string } }>;
  /** El partido ya ha terminado (o ya se ha pedido): el botón deja de estar disponible. */
  desactivado?: boolean;
}

/**
 * «Finalizar partido» (FR-026 a FR-028): siempre visible mientras se juega. Si la respuesta tarda más de
 * 300 ms (servidor cargado) muestra un indicador de progreso (FR-027).
 */
export function BotonFinalizar({ finalizar, desactivado = false }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [lento, setLento] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  const pulsar = async () => {
    setEnviando(true);
    setError(null);
    temporizador.current = setTimeout(() => setLento(true), 300);
    try {
      const ack = await finalizar();
      if (!ack.ok) setError(ack.error?.mensaje ?? 'No se pudo finalizar el partido');
    } catch {
      setError('No se pudo finalizar el partido');
    } finally {
      if (temporizador.current) clearTimeout(temporizador.current);
      setLento(false);
      setEnviando(false);
    }
  };

  return (
    <div className="finalizar">
      <button type="button" className="secundario" onClick={() => void pulsar()} disabled={desactivado || enviando}>
        Finalizar partido
      </button>
      {lento && (
        <span className="nota" role="status">
          <progress aria-label="Simulando el resto del partido" /> Simulando el resto del partido…
        </span>
      )}
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
