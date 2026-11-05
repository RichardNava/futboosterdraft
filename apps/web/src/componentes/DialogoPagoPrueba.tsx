/**
 * Pago simulado (spec 006, FR-031, FR-032; contracts/ui.md «Pago simulado»): resumen y precio con la cinta «PAGO DE
 * PRUEBA», sin campos de tarjeta. El `idCompra` se genera al abrirse y se conserva en los reintentos, así que una
 * doble pulsación o un corte de red nunca cobran dos veces. Con `precioFragmentos` (spec 011) confirma un pago con
 * fragmentos, sin la cinta.
 */
import { useState, type ReactNode } from 'react';
import { ErrorApi } from '../api/cliente';
import { Dialogo } from './Dialogo';

export const formatoEuros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
/** «1.000 fragmentos»: en español, sin `always` no se agrupan los números de cuatro cifras. */
export const formatoFragmentos = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });

type Precio = { precioCentimos: number; precioFragmentos?: undefined } | { precioFragmentos: number; precioCentimos?: undefined };

type Props<T> = Precio & {
  titulo: string;
  resumen: ReactNode;
  comprar: (idCompra: string) => Promise<T>;
  onHecho: (r: T) => void;
  onCancelar: () => void;
};

export function DialogoPagoPrueba<T>({ titulo, resumen, precioCentimos, precioFragmentos, comprar, onHecho, onCancelar }: Props<T>) {
  const [idCompra] = useState(() => crypto.randomUUID());
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ texto: string; reintentar: boolean } | null>(null);

  const confirmar = async () => {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      onHecho(await comprar(idCompra));
    } catch (e) {
      // Un rechazo del servidor no se reintenta; un fallo de conexión sí, con el mismo idCompra.
      if (e instanceof ErrorApi && e.estado < 500) setError({ texto: e.message, reintentar: false });
      else setError({ texto: 'No se ha podido completar la compra. Revisa la conexión y vuelve a intentarlo.', reintentar: true });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialogo etiquetadoPor="titulo-pago" alEscape={enviando ? undefined : onCancelar} alPulsarFondo={enviando ? undefined : onCancelar}>
      {precioCentimos !== undefined && (
        <p className="cinta-pago-prueba" role="note">
          PAGO DE PRUEBA — no se cobra nada
        </p>
      )}
      <h2 id="titulo-pago">{titulo}</h2>
      <div className="pago-resumen">{resumen}</div>
      <p className="pago-precio">
        {precioCentimos !== undefined ? formatoEuros.format(precioCentimos / 100) : `${formatoFragmentos.format(precioFragmentos)} fragmentos`}
      </p>
      {error && (
        <p className="error" role="alert">
          {error.texto}
        </p>
      )}
      <div className="acciones">
        <button type="button" className="secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button type="button" className="boton-principal" data-principal="" onClick={() => void confirmar()} aria-disabled={enviando || undefined} aria-busy={enviando || undefined}>
          {error?.reintentar ? 'Reintentar' : 'Confirmar compra'}
        </button>
      </div>
    </Dialogo>
  );
}
