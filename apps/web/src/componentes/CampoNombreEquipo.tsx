import { useEffect, useId, useState } from 'react';
import { NOMBRE_MAX, NOMBRE_MIN, normalizarNombre, validarNombre, type CodigoErrorNombre } from '@fbd/domain';
import { api, ErrorApi } from '../api/cliente';
import { mostrarAviso } from '../estado/avisos';
import { Aviso } from './Aviso';

/** Error del nombre con lo que hay que hacer (spec 004, FR-026; contracts/ui.md §8). */
const MENSAJE_NOMBRE: Record<CodigoErrorNombre, string> = {
  NOMBRE_VACIO: 'Escribe un nombre para tu equipo.',
  NOMBRE_CORTO: `El nombre del equipo debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`,
  NOMBRE_LARGO: `El nombre del equipo debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`,
  NOMBRE_REPETIDO: 'Ese nombre ya lo usa otro equipo. Elige otro.',
};

/** Primer error del nombre, en el texto de la interfaz, o `null` si es válido. */
export function errorNombre(valor: string, otros: Iterable<string>): string | null {
  const e = validarNombre(valor, otros)[0];
  return e ? MENSAJE_NOMBRE[e.codigo] : null;
}

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
  useEffect(() => setValor(actual), [actual]);

  const normalizado = normalizarNombre(valor);
  const enLinea = valor === actual ? null : errorNombre(valor, otros);

  const guardar = async () => {
    setError(null);
    try {
      await api(`/api/partidas/${partidaId}/nombre-equipo`, { metodo: 'PUT', cuerpo: { nombre: valor } });
      mostrarAviso('exito', 'Nombre guardado');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se ha podido guardar el nombre. Vuelve a intentarlo.');
    }
  };

  return (
    <section className="campo-nombre" aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`}>Nombre del equipo</h2>
      {ajustado && (
        <Aviso tipo="informacion">
          <p>Tu nombre «{deseado ?? actual}» ya lo usa otro equipo; puedes elegir otro.</p>
        </Aviso>
      )}
      <label htmlFor={`${id}-nombre`}>Nombre del equipo</label>
      <div className="fila-nombre">
        <input
          id={`${id}-nombre`}
          value={valor}
          maxLength={40}
          aria-invalid={enLinea || error ? true : undefined}
          aria-describedby={`${id}-ayuda`}
          onChange={(e) => setValor(e.target.value)}
        />
        <button type="button" className="secundario" aria-disabled={enLinea !== null || valor === actual || undefined} onClick={() => !enLinea && valor !== actual && void guardar()}>
          Guardar nombre
        </button>
      </div>
      <p id={`${id}-ayuda`} className={enLinea || error ? 'error ayuda-campo' : 'nota ayuda-campo'} role={enLinea || error ? 'alert' : undefined}>
        {error ?? enLinea ?? `${normalizado.length}/${NOMBRE_MAX} caracteres (mínimo ${NOMBRE_MIN})`}
      </p>
    </section>
  );
}
