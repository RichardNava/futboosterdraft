import { useState } from 'react';
import type { CartaResumen } from './CartaJugador';

interface Props {
  plantilla: readonly CartaResumen[];
  /** Dorsales actuales; un jugador sin entrada está «sin dorsal». `null` hasta confirmar el primer once. */
  dorsales: Record<number, number> | null;
  asignar: (jugadorId: number, dorsal: number) => Promise<void>;
}

const apellido = (j: CartaResumen) => j.apellidos.split(' ')[0] ?? j.nombre;

/**
 * Dorsales de la plantilla (FR-035 a FR-037): cada jugador puede llevar cualquier número del 1 al 99. Si el
 * número lo lleva otro, se avisa («El 2 lo lleva Pérez: se quedará sin dorsal») y se confirma con un clic.
 */
export function EditorDorsales({ plantilla, dorsales, asignar }: Props) {
  const [valores, setValores] = useState<Record<number, string>>({});
  const [pendiente, setPendiente] = useState<{ jugadorId: number; dorsal: number; otro: CartaResumen } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const aplicar = async (jugadorId: number, dorsal: number) => {
    setEnviando(true);
    setError(null);
    try {
      await asignar(jugadorId, dorsal);
      setPendiente(null);
      setValores((v) => {
        const { [jugadorId]: _, ...resto } = v;
        return resto;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el dorsal');
    } finally {
      setEnviando(false);
    }
  };

  const cambiar = (j: CartaResumen) => {
    const dorsal = Number(valores[j.id]);
    if (!Number.isInteger(dorsal) || dorsal < 1 || dorsal > 99) {
      setError('Los dorsales van del 1 al 99');
      return;
    }
    const otro = plantilla.find((x) => x.id !== j.id && dorsales?.[x.id] === dorsal);
    if (otro) setPendiente({ jugadorId: j.id, dorsal, otro });
    else void aplicar(j.id, dorsal);
  };

  if (!dorsales) return <p className="nota">Los dorsales se asignan al confirmar tu primer once; después puedes cambiarlos.</p>;
  return (
    <>
      {pendiente && (
        <p className="aviso" role="alert">
          El {pendiente.dorsal} lo lleva {apellido(pendiente.otro)}: se quedará sin dorsal.{' '}
          <button type="button" onClick={() => void aplicar(pendiente.jugadorId, pendiente.dorsal)} disabled={enviando}>
            Confirmar
          </button>{' '}
          <button type="button" className="secundario" onClick={() => setPendiente(null)}>
            Cancelar
          </button>
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <ul className="rejilla-dorsales">
        {plantilla.map((j) => {
          const actual = dorsales[j.id];
          return (
            <li key={j.id}>
              <span className="dorsal-actual">{actual ?? <span className="distintivo-sin-dorsal">Sin dorsal</span>}</span>
              <span>
                {j.nombre} {apellido(j)}
              </span>
              <input
                type="number"
                min={1}
                max={99}
                aria-label={`Nuevo dorsal de ${j.nombre} ${j.apellidos}`}
                value={valores[j.id] ?? ''}
                onChange={(e) => setValores({ ...valores, [j.id]: e.target.value })}
              />
              <button type="button" className="secundario mini" disabled={!valores[j.id] || enviando} onClick={() => cambiar(j)}>
                Cambiar
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
