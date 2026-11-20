/**
 * Detalle de una expansión (spec 016, FR-019; contracts/ui.md §2, modal): el cartel, las cartas agrupadas por nivel
 * en orden de número con las que ya se tienen y su compensación, y un pie siempre visible con la compra. Escritorio:
 * cartel a la izquierda y lista con desplazamiento propio; móvil: cartel arriba (Principio XI). Al abrirse, el foco va
 * al título; `Esc` cierra y el foco vuelve a «Ver detalle» (useAtraparFoco).
 */
import { NIVELES, type Nivel } from '@fbd/domain';
import type { CartaExpansion, ProductoColeccion } from '@fbd/protocol';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ETIQUETA_NIVEL } from '../textos/niveles';
import { CartaJugador, nombreCartaDe } from './CartaJugador';
import { Dialogo } from './Dialogo';
import { Fragmentos } from './Fragmentos';
import { Icono } from './Icono';
import { BotonComprarExpansion, RegaloExpansion } from './TarjetaExpansion';
import { Previsualizacion } from './TiendaCosmeticos';

interface Props {
  producto: ProductoColeccion;
  saldo: number;
  onComprar: () => void;
  onCerrar: () => void;
}

/** Cartas por nivel, del más alto al más bajo, cada grupo en orden de número. */
export function gruposPorNivel(
  cartas: readonly CartaExpansion[],
): { nivel: Nivel; cartas: CartaExpansion[] }[] {
  const ordenadas = [...cartas].sort((a, b) => a.numero - b.numero);
  return [...NIVELES]
    .reverse()
    .map((nivel) => ({ nivel, cartas: ordenadas.filter((c) => c.carta.nivel === nivel) }))
    .filter((g) => g.cartas.length > 0);
}

/** Modal «Ver detalle» de una expansión. */
export function DetalleExpansion({ producto: p, saldo, onComprar, onCerrar }: Props) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => titulo.current?.focus(), []);
  const poseidas = p.cartas.filter((c) => c.poseida).length;
  const [ampliada, setAmpliada] = useState<CartaExpansion | null>(null);
  return (
    <Dialogo
      etiquetadoPor="titulo-detalle-expansion"
      alEscape={onCerrar}
      alPulsarFondo={onCerrar}
      clase="modal-expansion"
    >
      <header className="detalle-expansion-cabecera">
        <h2 id="titulo-detalle-expansion" ref={titulo} tabIndex={-1}>
          {p.nombre}
        </h2>
        <button type="button" className="texto" onClick={onCerrar} aria-label="Cerrar">
          <Icono nombre="cerrar" tamano={20} />
        </button>
      </header>
      <div className="detalle-expansion-cuerpo">
        <img
          className="detalle-expansion-cartel"
          src={p.cartel}
          alt={`Cartel de ${p.nombre}`}
          width={768}
          height={1152}
        />
        <div className="detalle-expansion-lista">
          {gruposPorNivel(p.cartas).map((g) => (
            <section key={g.nivel} aria-labelledby={`nivel-${p.id}-${g.nivel}`}>
              <h3
                id={`nivel-${p.id}-${g.nivel}`}
                className={`detalle-expansion-nivel nivel-${g.nivel.toLowerCase()}`}
              >
                {ETIQUETA_NIVEL[g.nivel]}
              </h3>
              <ol className="detalle-expansion-cartas">
                {g.cartas.map((c) => (
                  <li key={c.carta.id} value={c.numero} className={c.poseida ? 'poseida' : undefined}>
                    <button
                      type="button"
                      className="detalle-expansion-fila"
                      onClick={() => setAmpliada(c)}
                      aria-label={`Ver la carta de ${nombreCartaDe(c.carta)}`}
                    >
                      <span className="detalle-expansion-numero">{c.numero}</span>
                      <img
                        className="detalle-expansion-retrato"
                        src={c.carta.imagen}
                        alt=""
                        width={36}
                        height={47}
                        loading="lazy"
                      />
                      <span className="detalle-expansion-nombre">{nombreCartaDe(c.carta)}</span>
                      <span className="detalle-expansion-demarcacion">{c.carta.demarcacion}</span>
                      {c.poseida && (
                        <span className="detalle-expansion-tienes">
                          Tienes <Fragmentos cantidad={c.compensacion} signo />
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
      <footer className="detalle-expansion-pie">
        <p>
          {poseidas > 0 && (
            <>
              Te devolvemos <Fragmentos cantidad={p.compensacion} /> por {poseidas}{' '}
              {poseidas === 1 ? 'carta' : 'cartas'}
              {p.sobreRegalo && ' · '}
            </>
          )}
          {p.sobreRegalo && <RegaloExpansion sobre={p.sobreRegalo} />}
        </p>
        <div className="expansion-botones">
          <BotonComprarExpansion
            producto={p}
            saldo={saldo}
            onComprar={onComprar}
            idFaltan={`faltan-detalle-${p.id}`}
          />
        </div>
      </footer>
      {/* En el body y no dentro de este modal: un modal anidado heredaría su desplazamiento. */}
      {ampliada &&
        createPortal(
          <Previsualizacion
            titulo={nombreCartaDe(ampliada.carta)}
            subtitulo={`Nº ${ampliada.numero} de ${p.nombre}${ampliada.poseida ? ' · ya la tienes' : ''}`}
            onCerrar={() => setAmpliada(null)}
          >
            <CartaJugador jugador={ampliada.carta} />
          </Previsualizacion>,
          document.body,
        )}
    </Dialogo>
  );
}
