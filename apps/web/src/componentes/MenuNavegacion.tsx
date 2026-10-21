/**
 * Menú de navegación en móvil (spec 004, FR-012a; research R8; contracts/ui.md §2): por debajo de 720 px, el botón
 * «Menú» abre un `<dialog>` modal con los enlaces y el interruptor de sonido. Escape (nativo), «Cerrar» o elegir
 * un enlace lo cierran, y el foco vuelve al botón «Menú».
 */
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Icono } from './Icono';
import { Escudo } from './arte/Escudo';

interface Props {
  /** Los `<li>` con los enlaces de la barra. */
  enlaces: ReactNode;
  /** Interruptor de sonido. */
  sonido: ReactNode;
}

export function MenuNavegacion({ enlaces, sonido }: Props) {
  const id = useId();
  const dialogo = useRef<HTMLDialogElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();

  const cerrar = () => {
    if (dialogo.current?.open) dialogo.current.close();
  };

  // Al cambiar de pantalla (también con «atrás»), el menú no se queda abierto.
  useEffect(cerrar, [pathname]);

  const abrir = () => {
    dialogo.current?.showModal();
    setAbierto(true);
  };

  const alCerrar = () => {
    setAbierto(false);
    boton.current?.focus();
  };

  const alPulsarEnlace = (e: MouseEvent<HTMLUListElement>) => {
    if ((e.target as HTMLElement).closest('a')) cerrar();
  };

  return (
    <div className="menu-navegacion">
      <button ref={boton} type="button" className="texto" aria-expanded={abierto} aria-controls={id} onClick={abrir}>
        <Icono nombre="menu" />
        Menú
      </button>
      <dialog ref={dialogo} id={id} className="panel-menu" aria-label="Menú" onClose={alCerrar}>
        <div className="panel-menu-cabecera">
          <span className="marca">
            <Escudo className="escudo" tamano={30} />
            Fútboosterdraft
          </span>
          <button type="button" className="texto" onClick={cerrar}>
            <Icono nombre="cerrar" />
            Cerrar
          </button>
        </div>
        <ul className="enlaces-navegacion" onClick={alPulsarEnlace}>
          {enlaces}
        </ul>
        {sonido}
      </dialog>
    </div>
  );
}
