import { DEMARCACIONES } from '@fbd/domain';
import { useState } from 'react';
import { nombreCartaDe, type CartaResumen } from './CartaJugador';
import { Aviso } from './Aviso';
import { Icono } from './Icono';

interface Props {
  plantilla: readonly CartaResumen[];
  /** Dorsales actuales; un jugador sin entrada está «sin dorsal». `null` hasta confirmar el primer once. */
  dorsales: Record<number, number> | null;
  asignar: (jugadorId: number, dorsal: number) => Promise<void>;
}

const apellido = (j: CartaResumen) => nombreCartaDe(j);

/**
 * Dorsales de la plantilla (FR-035 a FR-037): cada jugador puede llevar cualquier número del 1 al 99. Si el
 * número lo lleva otro, se avisa («El 2 lo lleva Pérez: se quedará sin dorsal») y se confirma con un clic.
 *
 * Lista compacta (retoques de la spec 011): una fila por jugador con el dorsal, que se edita en el sitio, y el nombre
 * de la carta. Mientras se edita, aceptar y descartar aparecen junto al número (Intro y Escape con el teclado).
 */
export function EditorDorsales({ plantilla, dorsales, asignar }: Props) {
  const [valores, setValores] = useState<Record<number, string>>({});
  const [pendiente, setPendiente] = useState<{
    jugadorId: number;
    dorsal: number;
    otro: CartaResumen;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const olvidar = (jugadorId: number) =>
    setValores((v) => {
      const { [jugadorId]: _, ...resto } = v;
      return resto;
    });

  const aplicar = async (jugadorId: number, dorsal: number) => {
    setEnviando(true);
    setError(null);
    try {
      await asignar(jugadorId, dorsal);
      setPendiente(null);
      olvidar(jugadorId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el dorsal');
    } finally {
      setEnviando(false);
    }
  };

  const descartar = (jugadorId: number) => {
    olvidar(jugadorId);
    if (pendiente?.jugadorId === jugadorId) setPendiente(null);
    setError(null);
  };

  const cambiar = (j: CartaResumen) => {
    const dorsal = Number(valores[j.id]);
    if (!Number.isInteger(dorsal) || dorsal < 1 || dorsal > 99) {
      setError('Los dorsales van del 1 al 99: escribe un número en ese rango.');
      return;
    }
    const otro = plantilla.find((x) => x.id !== j.id && dorsales?.[x.id] === dorsal);
    if (otro) setPendiente({ jugadorId: j.id, dorsal, otro });
    else void aplicar(j.id, dorsal);
  };

  if (!dorsales)
    return (
      <p className="nota">Los dorsales se asignan al confirmar tu primer once; después puedes cambiarlos.</p>
    );
  // Por demarcación, como en una hoja de alineación; un orden fijo: la fila no salta al cambiarle el número.
  const ordenada = [...plantilla].sort(
    (a, b) => DEMARCACIONES.indexOf(a.demarcacion) - DEMARCACIONES.indexOf(b.demarcacion),
  );
  return (
    <>
      {pendiente && (
        <Aviso
          tipo="advertencia"
          rol="alert"
          acciones={
            <>
              <button
                type="button"
                className="secundario"
                onClick={() => void aplicar(pendiente.jugadorId, pendiente.dorsal)}
                disabled={enviando}
              >
                Confirmar
              </button>
              <button type="button" className="texto" onClick={() => setPendiente(null)}>
                Cancelar
              </button>
            </>
          }
        >
          <p>
            El {pendiente.dorsal} lo lleva {apellido(pendiente.otro)}: se quedará sin dorsal.
          </p>
        </Aviso>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <ul className="lista-dorsales">
        {ordenada.map((j) => {
          const actual = dorsales[j.id];
          const nombre = `${j.nombre} ${j.apellidos}`;
          const editado = valores[j.id] !== undefined && valores[j.id] !== String(actual ?? '');
          return (
            <li key={j.id} data-jugador={j.id} data-editando={editado || undefined}>
              <input
                className="dorsal-campo"
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="–"
                aria-label={`Dorsal de ${nombre}${actual === undefined ? ' (sin dorsal)' : ''}`}
                value={valores[j.id] ?? String(actual ?? '')}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setValores({ ...valores, [j.id]: e.target.value.replace(/\D/g, '') })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editado && !enviando) cambiar(j);
                  else if (e.key === 'Escape' && editado) descartar(j.id);
                }}
              />
              <span className="dorsal-nombre" title={nombre}>
                {apellido(j)}
              </span>
              {editado ? (
                <span className="dorsal-acciones">
                  <button
                    type="button"
                    className="icono-boton aceptar"
                    aria-label={`Aceptar el dorsal de ${nombre}`}
                    title="Aceptar (Intro)"
                    disabled={enviando}
                    onClick={() => cambiar(j)}
                  >
                    <Icono nombre="exito" tamano={16} />
                  </button>
                  <button
                    type="button"
                    className="icono-boton descartar"
                    aria-label={`Descartar el dorsal de ${nombre}`}
                    title="Descartar (Escape)"
                    onClick={() => descartar(j.id)}
                  >
                    <Icono nombre="cerrar" tamano={16} />
                  </button>
                </span>
              ) : (
                <span className="dorsal-demarcacion" aria-hidden="true">
                  {j.demarcacion}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
