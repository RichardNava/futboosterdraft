/**
 * Confirmación de la compra de una colección (spec 006, FR-028a; R16): el sello «Adquirida» entra con el trofeo en
 * unos 1,2 s (transform y opacity con la Web Animations API) y, después, el resumen: las cartas recibidas y los
 * duplicados con sus fragmentos. «Saltar» o el movimiento reducido van directos al resumen.
 */
import type { ResumenCompra } from '@fbd/protocol';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { CartaJugador } from './CartaJugador';
import { Dialogo } from './Dialogo';
import { Trofeo } from './arte/Trofeo';

const DURACION_MS = 1200;

interface Props {
  nombre: string;
  resumen: ResumenCompra;
  onSeguir: () => void;
}

export function ConfirmacionCompra({ nombre, resumen, onSeguir }: Props) {
  const reducido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const [fase, setFase] = useState<'animacion' | 'resumen'>(reducido ? 'resumen' : 'animacion');
  const sello = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fase !== 'animacion') return;
    const animacion = sello.current?.animate(
      [
        { opacity: 0, transform: 'scale(1.6) rotate(-12deg)' },
        { opacity: 1, transform: 'scale(0.95) rotate(-6deg)', offset: 0.6 },
        { opacity: 1, transform: 'scale(1) rotate(-6deg)' },
      ],
      { duration: DURACION_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' },
    );
    const t = setTimeout(() => setFase('resumen'), DURACION_MS + 300);
    return () => {
      clearTimeout(t);
      animacion?.cancel();
    };
  }, [fase]);

  if (fase === 'animacion') {
    return (
      <div className="confirmacion-compra" role="dialog" aria-modal="true" aria-label={`${nombre} adquirida`} onClick={() => setFase('resumen')}>
        <Trofeo className="confirmacion-trofeo" />
        <div ref={sello} className="sello-adquirida">
          Adquirida
        </div>
        <button type="button" className="secundario saltar" onClick={() => setFase('resumen')} autoFocus>
          Saltar
        </button>
      </div>
    );
  }

  return (
    <Dialogo etiquetadoPor="titulo-confirmacion" alEscape={onSeguir}>
      <h2 id="titulo-confirmacion">{nombre}: adquirida</h2>
      <p>
        {resumen.cartas.length} cartas nuevas
        {resumen.duplicados.length > 0 && ` y ${resumen.fragmentos} fragmentos por ${resumen.duplicados.length} cartas que ya tenías`}.
      </p>
      {resumen.cartas.length > 0 && (
        <ul className="lista-compacta resumen-cartas" aria-label="Cartas recibidas">
          {resumen.cartas.map((c) => (
            <li key={c.id}>
              <CartaJugador jugador={c} compacta />
            </li>
          ))}
        </ul>
      )}
      {resumen.duplicados.length > 0 && (
        <table className="historial-fragmentos" aria-label="Cartas repetidas">
          <tbody>
            {resumen.duplicados.map((d) => (
              <tr key={d.id}>
                <td>{d.nombreCarta}</td>
                <td className="positivo">+{d.fragmentos}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td className="positivo">+{resumen.fragmentos}</td>
            </tr>
          </tbody>
        </table>
      )}
      <div className="acciones">
        <Link className="boton secundario" to="/coleccion">
          Ver en mi colección
        </Link>
        <button type="button" className="boton-principal" data-principal="" onClick={onSeguir} autoFocus>
          Seguir comprando
        </button>
      </div>
    </Dialogo>
  );
}
