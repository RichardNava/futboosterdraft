import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

export interface AccionBarra {
  etiqueta: string;
  /** Acción del botón; si devuelve una promesa, el botón queda ocupado hasta que termina (una petición a la vez). */
  onClick?: () => unknown;
  /** Enlace en lugar de acción. */
  a?: string;
  /** Motivo por el que no se puede pulsar: el botón queda visible con `aria-disabled` y el motivo a su lado. */
  motivoDesactivado?: string | null;
}

interface Props {
  principal: AccionBarra | null;
  /**
   * Segundo botón con la misma importancia que el principal, a su izquierda. Solo en el descanso y antes de la
   * prórroga contra un NPC: «Gestionar equipo» junto a «Seguir» (spec 003, FR-006a).
   */
  principalIzquierda?: AccionBarra | null;
  secundarios?: AccionBarra[];
  /** Texto de estado (a la izquierda), si no hay motivo de desactivado. */
  estado?: ReactNode;
}

/**
 * Barra del botón principal (spec 003, FR-006, FR-007; research R16; contracts/ui.md): fija al pie del contenedor
 * desplazable del `Marco` (`position: sticky`), con un único botón principal (`data-principal`), como mucho
 * algunos secundarios y un texto de estado o el motivo de desactivado (`aria-describedby`). Desactivado, el botón
 * sigue siendo enfocable pero no ejecuta la acción.
 */
export function BarraPrincipal({ principal, principalIzquierda = null, secundarios = [], estado }: Props) {
  const idMotivo = useId();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = async (a: AccionBarra) => {
    if (a.motivoDesactivado || ocupado || !a.onClick) return;
    setOcupado(a.etiqueta);
    setError(null);
    try {
      await a.onClick();
    } catch (e) {
      setError((e as Error).message || 'No se pudo completar la acción');
    } finally {
      setOcupado(null);
    }
  };

  const boton = (a: AccionBarra, esPrincipal: boolean) => {
    const desactivado = Boolean(a.motivoDesactivado) || (ocupado !== null && ocupado === a.etiqueta);
    const comunes = {
      className: esPrincipal ? 'boton-principal' : 'secundario',
      ...(esPrincipal ? { 'data-principal': '' } : {}),
      'aria-disabled': desactivado ? ('true' as const) : undefined,
      'aria-describedby': esPrincipal && a.motivoDesactivado ? idMotivo : undefined,
      'aria-busy': ocupado === a.etiqueta || undefined,
    };
    if (a.a && !a.motivoDesactivado) {
      return (
        <Link key={a.etiqueta} to={a.a} {...comunes} className={`boton ${comunes.className}`}>
          {a.etiqueta}
        </Link>
      );
    }
    return (
      <button key={a.etiqueta} type="button" {...comunes} onClick={() => void ejecutar(a)}>
        {a.etiqueta}
      </button>
    );
  };

  const motivo = principal?.motivoDesactivado;
  return (
    <div className="barra-principal" role="region" aria-label="Acciones">
      <div className="barra-principal-estado">
        {motivo ? (
          <span id={idMotivo} className="motivo">
            {motivo}
          </span>
        ) : (
          estado
        )}
        {error && (
          <span className="error" role="alert">
            {error}
          </span>
        )}
      </div>
      <div className="barra-principal-botones">
        {secundarios.map((s) => boton(s, false))}
        {principalIzquierda && principal ? (
          // Dos principales de la misma importancia en una fila que no se parte (FR-006a).
          <div className="barra-principales">
            {boton(principalIzquierda, true)}
            {boton(principal, true)}
          </div>
        ) : (
          principal && boton(principal, true)
        )}
      </div>
    </div>
  );
}
