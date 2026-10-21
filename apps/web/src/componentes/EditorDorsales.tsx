import { useState } from 'react';
import type { CartaResumen } from './CartaJugador';
import { Aviso } from './Aviso';
import { Icono } from './Icono';

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
 *
 * Cada jugador es una celda con columnas fijas (dorsal, nombre y campo) para que todas queden alineadas sea cual
 * sea la longitud del nombre; bajo el campo, aceptar y descartar el cambio con iconos (Intro y Escape con el teclado).
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

  const descartar = (jugadorId: number) => {
    setValores((v) => {
      const { [jugadorId]: _, ...resto } = v;
      return resto;
    });
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

  if (!dorsales) return <p className="nota">Los dorsales se asignan al confirmar tu primer once; después puedes cambiarlos.</p>;
  return (
    <>
      {pendiente && (
        <Aviso
          tipo="advertencia"
          rol="alert"
          acciones={
            <>
              <button type="button" className="secundario" onClick={() => void aplicar(pendiente.jugadorId, pendiente.dorsal)} disabled={enviando}>
                Confirmar
              </button>
              <button type="button" className="texto" onClick={() => setPendiente(null)}>
                Cancelar
              </button>
            </>
          }
        >
          <p>El {pendiente.dorsal} lo lleva {apellido(pendiente.otro)}: se quedará sin dorsal.</p>
        </Aviso>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <ul className="rejilla-dorsales">
        {plantilla.map((j) => {
          const actual = dorsales[j.id];
          const nombre = `${j.nombre} ${apellido(j)}`;
          const editado = Boolean(valores[j.id]);
          return (
            <li key={j.id}>
              <span className="dorsal-actual">{actual ?? <span className="distintivo-sin-dorsal">Sin dorsal</span>}</span>
              <span className="dorsal-nombre" title={nombre}>
                {nombre}
              </span>
              <input
                type="number"
                min={1}
                max={99}
                aria-label={`Nuevo dorsal de ${j.nombre} ${j.apellidos}`}
                value={valores[j.id] ?? ''}
                onChange={(e) => setValores({ ...valores, [j.id]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editado && !enviando) cambiar(j);
                  else if (e.key === 'Escape' && editado) descartar(j.id);
                }}
              />
              {/* Siempre ocupan su sitio (ocultos sin cambio): las celdas no cambian de alto al escribir. */}
              <span className="dorsal-acciones" data-visible={editado || undefined}>
                <button
                  type="button"
                  className="icono-boton aceptar"
                  aria-label={`Aceptar el dorsal de ${nombre}`}
                  title="Aceptar"
                  disabled={!editado || enviando}
                  onClick={() => cambiar(j)}
                >
                  <Icono nombre="exito" tamano={16} />
                </button>
                <button
                  type="button"
                  className="icono-boton descartar"
                  aria-label={`Descartar el dorsal de ${nombre}`}
                  title="Descartar"
                  disabled={!editado}
                  onClick={() => descartar(j.id)}
                >
                  <Icono nombre="cerrar" tamano={16} />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
