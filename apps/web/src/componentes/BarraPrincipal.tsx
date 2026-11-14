import { reproducir } from '../sonido/sonido';
import { Icono } from './Icono';
import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';

export interface AccionBarra {
  etiqueta: string;
  /** Acción del botón; si devuelve una promesa, el botón queda ocupado hasta que termina (una petición a la vez). */
  onClick?: () => unknown;
  /** Enlace en lugar de acción. */
  a?: string;
  /** Motivo por el que no se puede pulsar: el botón queda visible con `aria-disabled` y el motivo a su lado. */
  motivoDesactivado?: string | null;
  /** Ayuda resumida al pasar el cursor o enfocar el botón; sin ella, la de `AYUDA_ACCION` para su etiqueta. */
  ayuda?: string;
}

/**
 * Ayuda resumida de las acciones habituales de la barra (spec 012, ronda 3). Se muestra en la propia barra al pasar el
 * cursor o enfocar el botón; el icono de información de cada pantalla da el detalle cuando hace falta.
 */
const AYUDA_ACCION: Record<string, string> = {
  'Confirmar alineación': 'Guarda la alineación y vuelve al torneo para preparar el partido.',
  'Confirmar once': 'Fija tu once para todo el torneo: después no se puede cambiar.',
  'Confirmar mi once': 'Ve a Formación a elegir y fijar tu once para los duelos.',
  'Confirmar elección': 'Te quedas con la carta seleccionada y pasa el turno.',
  'Confirmar cambios': 'Aplica los cambios en la próxima interrupción del partido.',
  'Volver sin cambios': 'Vuelve al partido sin aplicar nada de lo que has tocado.',
  'Gestionar equipo': 'Detiene el partido para hacer cambios, mover a tus jugadores o tocar la táctica.',
  'Finalizar partido': 'Simula lo que queda y salta directamente al resultado.',
  Seguir: 'Reanuda el partido.',
  'Comenzar partido': 'Empieza el partido de esta jornada.',
  'Ver partido': 'Entra a ver el partido contra tu rival.',
  'Preparar equipo': 'Pasa a Formación para preparar tu equipo para el torneo.',
  Siguiente: 'Pasa a lo siguiente del torneo.',
  'Siguiente jornada': 'Pasa a la siguiente jornada del torneo.',
  'Simular resto del torneo': 'Simula todos los partidos que quedan, sin verlos.',
  'Ver torneo': 'Vuelve a la clasificación y al cuadro del torneo.',
  'Volver al torneo': 'Vuelve a la clasificación y al cuadro del torneo.',
  'Ver campeón': 'Muestra quién ha ganado el torneo.',
  'Ver duelos': 'Mira los duelos de tu cruce, casilla a casilla.',
  'Ver las plantillas': 'Compara las plantillas de todos los equipos.',
  'Volver al menú': 'Sal de la partida y vuelve al inicio.',
  'Saltar al resultado': 'Deja de ver el partido y pasa al resultado.',
};

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
  // Ayuda del control bajo el cursor o con el foco, en cualquier parte de la pantalla (`data-ayuda`; spec 012, ronda 3).
  // Con `data-ayuda-titulo`, el título va en negrita delante (spec 013, ronda 2: deslizadores de Nueva partida).
  const [ayudaCompleta, setAyuda] = useState<{ titulo: string | null; texto: string } | null>(null);
  const ayuda = ayudaCompleta && (ayudaCompleta.titulo ? `${ayudaCompleta.titulo}: ${ayudaCompleta.texto}` : ayudaCompleta.texto);
  useEffect(() => {
    // Solo con sitio (desde 720 px): en estrecho la ayuda haría crecer la barra, que tapa lo que hay debajo.
    const ancha = window.matchMedia?.('(min-width: 720px)');
    const leer = (e: Event) => {
      const el = ancha?.matches !== false && e.target instanceof Element ? e.target.closest('[data-ayuda]') : null;
      const texto = el?.getAttribute('data-ayuda');
      setAyuda(texto ? { titulo: el!.getAttribute('data-ayuda-titulo'), texto } : null);
    };
    // Al mover un deslizador (o pulsar una de sus marcas), los atributos cambian después del evento: se leen en el siguiente fotograma.
    const leerTrasCambio = (e: Event) => requestAnimationFrame(() => leer(e));
    const quitar = () => setAyuda(null);
    document.addEventListener('pointerover', leer);
    document.addEventListener('focusin', leer);
    document.addEventListener('input', leerTrasCambio);
    document.addEventListener('click', leerTrasCambio);
    document.documentElement.addEventListener('pointerleave', quitar);
    return () => {
      document.removeEventListener('pointerover', leer);
      document.removeEventListener('focusin', leer);
      document.removeEventListener('input', leerTrasCambio);
      document.removeEventListener('click', leerTrasCambio);
      document.documentElement.removeEventListener('pointerleave', quitar);
    };
  }, []);

  const ejecutar = async (a: AccionBarra, esPrincipal: boolean) => {
    if (a.motivoDesactivado || ocupado || !a.onClick) return;
    // Clic suave del botón principal (spec 012, FR-006); los secundarios no suenan.
    if (esPrincipal) reproducir('clicPrincipal');
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
      // Desactivado, la ayuda es el motivo, que ya está en la barra.
      'data-ayuda': a.motivoDesactivado ? undefined : (a.ayuda ?? AYUDA_ACCION[a.etiqueta]),
    };
    if (a.a && !a.motivoDesactivado) {
      return (
        <Link key={a.etiqueta} to={a.a} {...comunes} className={`boton ${comunes.className}`} onClick={() => esPrincipal && reproducir('clicPrincipal')}>
          {a.etiqueta}
        </Link>
      );
    }
    return (
      <button key={a.etiqueta} type="button" {...comunes} onClick={() => void ejecutar(a, esPrincipal)}>
        {a.etiqueta}
      </button>
    );
  };

  const motivo = principal?.motivoDesactivado;
  return (
    <div className="barra-principal" role="region" aria-label="Acciones">
      <div className="barra-principal-estado">
        {/* La ayuda tapa el estado (y el motivo, que sigue en el DOM para `aria-describedby`) mientras dura. */}
        {ayuda && (
          <span className="ayuda-barra" aria-hidden="true" style={{ '--caracteres': ayuda.length } as CSSProperties}>
            <Icono nombre="informacion" />
            <span>
              {ayudaCompleta!.titulo && <strong>{ayudaCompleta!.titulo}:</strong>} {ayudaCompleta!.texto}
            </span>
          </span>
        )}
        {motivo ? (
          <span id={idMotivo} className="motivo" hidden={ayuda !== null} style={{ '--caracteres': motivo.length } as CSSProperties}>
            {motivo}
          </span>
        ) : (
          !ayuda && estado
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
