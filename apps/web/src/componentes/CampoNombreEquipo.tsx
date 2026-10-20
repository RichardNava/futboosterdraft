import { useEffect, useId, useState } from 'react';
import { NOMBRE_MAX, NOMBRE_MIN, normalizarNombre, validarNombre } from '@fbd/domain';
import { api, ErrorApi } from '../api/cliente';

interface Props {
  partidaId: string;
  actual: string;
  /** Nombres de los demás equipos de la partida (para avisar antes de enviar). */
  otros: readonly string[];
  /** El nombre del perfil lo usaba otro equipo y se le ha dado otro (FR-043). */
  ajustado?: boolean;
  /** Nombre del perfil, para el aviso de `ajustado`. */
  deseado?: string;
}

/**
 * Paso «Nombre del equipo» (spec 003, FR-042, FR-043; contracts/ui.md): contador de 3–24 caracteres y errores en
 * línea («Ese nombre ya lo usa otro equipo», «Mínimo 3 caracteres»…). Se guarda con «Guardar nombre».
 */
export function CampoNombreEquipo({ partidaId, actual, otros, ajustado, deseado }: Props) {
  const id = useId();
  const [valor, setValor] = useState(actual);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  useEffect(() => setValor(actual), [actual]);

  const normalizado = normalizarNombre(valor);
  const enLinea = valor === actual ? null : (validarNombre(valor, otros)[0]?.mensaje ?? null);

  const guardar = async () => {
    setError(null);
    setGuardado(false);
    try {
      await api(`/api/partidas/${partidaId}/nombre-equipo`, { metodo: 'PUT', cuerpo: { nombre: valor } });
      setGuardado(true);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo guardar el nombre');
    }
  };

  return (
    <section className="campo-nombre" aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`}>Nombre del equipo</h2>
      {ajustado && (
        <p className="aviso" role="status">
          Tu nombre «{deseado ?? actual}» ya lo usa otro equipo; puedes elegir otro.
        </p>
      )}
      <label htmlFor={`${id}-nombre`}>Nombre del equipo</label>
      <div className="fila-nombre">
        <input
          id={`${id}-nombre`}
          value={valor}
          maxLength={40}
          aria-invalid={enLinea ? true : undefined}
          aria-describedby={`${id}-ayuda`}
          onChange={(e) => {
            setValor(e.target.value);
            setGuardado(false);
          }}
        />
        <button type="button" className="secundario" aria-disabled={enLinea !== null || valor === actual || undefined} onClick={() => !enLinea && valor !== actual && void guardar()}>
          Guardar nombre
        </button>
      </div>
      <p id={`${id}-ayuda`} className={enLinea || error ? 'error' : 'nota'} role={enLinea || error ? 'alert' : undefined}>
        {error ?? enLinea ?? `${normalizado.length}/${NOMBRE_MAX} caracteres (mínimo ${NOMBRE_MIN})`}
        {guardado && !error && ' · Guardado'}
      </p>
    </section>
  );
}
