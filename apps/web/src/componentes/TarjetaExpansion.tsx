/**
 * Tarjeta de una expansión en la tienda (spec 016, FR-017; contracts/ui.md §2): nombre y descripción a la izquierda,
 * «Comprar» y «Ver detalle» abajo con el mismo tamaño, y el icono de tienda por delante de la esquina superior
 * derecha, asomando por arriba y un poco por la derecha. El icono es decorativo: el nombre ya está en texto.
 */
import { NIVELES } from '@fbd/domain';
import type { ProductoColeccion } from '@fbd/protocol';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ETIQUETA_NIVEL } from '../textos/niveles';
import { SobreArte } from './arte/SobreArte';
import { Fragmentos } from './Fragmentos';
import { Icono } from './Icono';
import { ArteGrande, Previsualizacion } from './TiendaCosmeticos';

interface Props {
  producto: ProductoColeccion;
  saldo: number;
  onComprar: () => void;
  onVerDetalle: () => void;
}

/** «24 jugadores · 6 GOAT · 6 Legendario · 6 Crack · 6 Superclase»; el sobre de regalo va aparte (RegaloExpansion). */
export function descripcionExpansion(p: ProductoColeccion): string {
  const niveles = [...NIVELES]
    .reverse()
    .filter((n) => p.porNivel[n])
    .map((n) => `${p.porNivel[n]} ${ETIQUETA_NIVEL[n]}`);
  return [`${p.numCartas} jugadores`, ...niveles].join(' · ');
}

/** «De regalo» y el sobre en pequeño; al pulsarlo se amplía, cerrado y abierto, como en la tienda de cosméticos. */
export function RegaloExpansion({ sobre }: { sobre: NonNullable<ProductoColeccion['sobreRegalo']> }) {
  const [ampliado, setAmpliado] = useState(false);
  return (
    <span className="expansion-regalo">
      De regalo
      <button
        type="button"
        className="expansion-regalo-sobre"
        onClick={() => setAmpliado(true)}
        aria-label={`Ver «${sobre.nombre}», el sobre de regalo`}
      >
        <SobreArte diseno={sobre.id} mini />
      </button>
      {/* En el body: puede abrirse dentro del detalle, que ya es un modal. */}
      {ampliado &&
        createPortal(
          <Previsualizacion
            titulo={sobre.nombre}
            subtitulo="Sobre de regalo de la expansión"
            onCerrar={() => setAmpliado(false)}
          >
            <ArteGrande id={sobre.id} tipo="sobre" />
          </Previsualizacion>,
          document.body,
        )}
    </span>
  );
}

/** Botón de compra con sus estados: adquirida (sello), sin saldo (lo que falta) o comprar. Lo comparten tarjeta y detalle. */
export function BotonComprarExpansion({
  producto,
  saldo,
  onComprar,
  idFaltan,
}: {
  producto: ProductoColeccion;
  saldo: number;
  onComprar: () => void;
  idFaltan: string;
}) {
  if (producto.adquirida) return <p className="sello-adquirida expansion-boton">Adquirida</p>;
  const faltan = producto.precioFragmentos - saldo;
  if (faltan > 0) {
    return (
      <>
        <button
          type="button"
          className="boton-principal expansion-boton"
          aria-disabled="true"
          aria-describedby={idFaltan}
        >
          Te faltan <Fragmentos cantidad={faltan} />
        </button>
        <span id={idFaltan} className="solo-lectores">
          Consigue fragmentos ganando torneos o desfragmentando cartas repetidas.
        </span>
      </>
    );
  }
  return (
    <button type="button" className="boton-principal expansion-boton" onClick={onComprar}>
      Comprar · <Fragmentos cantidad={producto.precioFragmentos} />
    </button>
  );
}

/** Tarjeta apaisada de una expansión. */
export function TarjetaExpansion({ producto, saldo, onComprar, onVerDetalle }: Props) {
  const p = producto;
  return (
    <article
      className={p.adquirida ? 'expansion adquirida' : 'expansion'}
      data-coleccion={p.id}
      aria-labelledby={`titulo-${p.id}`}
    >
      <div className="expansion-tarjeta panel">
        <div className="expansion-texto">
          <h3 id={`titulo-${p.id}`} className="expansion-nombre">
            {p.nombre}
          </h3>
          <p className="expansion-descripcion">
            {descripcionExpansion(p)}
            {p.sobreRegalo && (
              <>
                {' · '}
                <RegaloExpansion sobre={p.sobreRegalo} />
              </>
            )}
          </p>
          {p.soloFragmentos !== null && !p.adquirida ? (
            <p className="nota">
              Ya tienes todas: recibirás <Fragmentos cantidad={p.soloFragmentos} /> y el sobre
            </p>
          ) : (
            p.poseidas > 0 &&
            !p.adquirida && (
              <p className="nota">
                Tienes {p.poseidas} de {p.numCartas} · te devolvemos <Fragmentos cantidad={p.compensacion} />
              </p>
            )
          )}
        </div>
        <div className="expansion-botones">
          <BotonComprarExpansion
            producto={p}
            saldo={saldo}
            onComprar={onComprar}
            idFaltan={`faltan-${p.id}`}
          />
          <button
            type="button"
            className="secundario expansion-boton"
            onClick={onVerDetalle}
            aria-label={`Ver detalle de ${p.nombre}`}
          >
            Ver detalle <Icono nombre="lupa" tamano={18} />
          </button>
        </div>
      </div>
      <img
        className="expansion-icono"
        src={p.icono}
        srcSet={`${p.icono} 1x, ${p.iconoGrande} 2x`}
        alt=""
        width={256}
        height={256}
        loading="lazy"
      />
    </article>
  );
}
