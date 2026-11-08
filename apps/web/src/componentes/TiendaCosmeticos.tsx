/**
 * Escudos y sobres en la tienda (spec 011, US3; contracts/ui.md §5): packs arriba y, debajo, cada cosmético de pago
 * con sus dos precios (fragmentos o euros simulados) o «Comprado». Los sobres se ven cerrados y, al pasar el ratón,
 * rasgados. Un invitado ve el catálogo y, al comprar, la invitación a crear cuenta. Al pulsar una miniatura se abre
 * la previsualización a tamaño grande (con ← y → para pasar al siguiente) y desde ella se puede comprar.
 */
import type { Cosmetico, PackCosmeticos, RespuestaCompraCosmetico } from '@fbd/protocol';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { api } from '../api/cliente';
import { useAspecto } from '../estado/aspecto';
import { mostrarAviso } from '../estado/avisos';
import { useCatalogoCosmeticos, useCosmeticos } from '../estado/cosmeticos';
import { useSaldo } from '../estado/saldo';
import { SobreArte } from './arte/SobreArte';
import { urlEscudo } from './chapa';
import { Dialogo } from './Dialogo';
import { Icono } from './Icono';
import { DialogoPagoPrueba, formatoEuros, formatoFragmentos } from './DialogoPagoPrueba';

type Compra =
  | { tipo: 'cosmetico'; cosmetico: Cosmetico; moneda: 'eur' | 'fragmentos' }
  | { tipo: 'pack'; pack: PackCosmeticos };

const BLOQUES = [
  { tipo: 'escudo', id: 'escudos', titulo: 'Escudos' },
  { tipo: 'sobre', id: 'sobres', titulo: 'Sobres' },
] as const;

function Miniatura({ id, tipo }: { id: string; tipo: 'escudo' | 'sobre' }) {
  if (tipo === 'escudo')
    return (
      <img
        src={urlEscudo(id, 256)}
        alt=""
        width={64}
        height={64}
        loading="lazy"
        className="miniatura-escudo"
      />
    );
  return (
    <span className="miniatura-sobre">
      <SobreArte diseno={id} mini className="sobre-cerrado-mini" />
      <SobreArte diseno={id} mini rasgado className="sobre-rasgado-mini" />
    </span>
  );
}

type Vista =
  /** Con `pack`, el cosmético se abrió desde la previsualización del pack: se navega por sus 5 y se puede volver. */
  | { tipo: 'cosmetico'; lista: Cosmetico[]; indice: number; pack?: PackCosmeticos }
  | { tipo: 'pack'; pack: PackCosmeticos };

/** El cosmético a tamaño grande: el escudo como se ve en el juego y el sobre cerrado y abierto. */
function ArteGrande({ id, tipo }: { id: string; tipo: 'escudo' | 'sobre' }) {
  if (tipo === 'escudo')
    return (
      <figure className="previsualizacion-escudo">
        <img src={urlEscudo(id, 512)} alt="" width={512} height={512} />
        <figcaption>
          <span className="nota">En el juego:</span>
          {[96, 40, 24].map((t) => (
            <img key={t} src={urlEscudo(id, t > 64 ? 256 : 64)} alt="" width={t} height={t} />
          ))}
        </figcaption>
      </figure>
    );
  return (
    <div className="previsualizacion-sobre">
      <figure>
        <SobreArte diseno={id} />
        <figcaption className="nota">Cerrado</figcaption>
      </figure>
      <figure>
        <SobreArte diseno={id} rasgado />
        <figcaption className="nota">Abierto</figcaption>
      </figure>
    </div>
  );
}

function Previsualizacion({
  titulo,
  subtitulo,
  onCerrar,
  onVolver,
  navegar,
  children,
}: {
  titulo: string;
  subtitulo: string;
  onCerrar: () => void;
  /** Vuelve a la previsualización del pack (también con Escape). */
  onVolver?: () => void;
  navegar?: { anterior: () => void; siguiente: () => void; posicion: string };
  children: ReactNode;
}) {
  // ← y → pasan de cosmético estén donde estén el foco (tras comprar, el botón pulsado desaparece).
  const ir = useRef(navegar);
  ir.current = navegar;
  useEffect(() => {
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') ir.current?.anterior();
      else if (e.key === 'ArrowRight') ir.current?.siguiente();
    };
    window.addEventListener('keydown', alTecla);
    return () => window.removeEventListener('keydown', alTecla);
  }, []);
  return (
    <Dialogo etiquetadoPor="titulo-previsualizacion" alEscape={onVolver ?? onCerrar} alPulsarFondo={onCerrar}>
      <div className="previsualizacion-cosmetico">
        {onVolver && (
          <button type="button" className="texto modal-volver" onClick={onVolver}>
            <Icono nombre="flecha" tamano={20} />
            Volver al pack
          </button>
        )}
        <button type="button" className="texto modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
          <Icono nombre="cerrar" tamano={20} />
        </button>
        <header>
          <h2 id="titulo-previsualizacion">{titulo}</h2>
          <p className="nota">{subtitulo}</p>
        </header>
        {children}
        {navegar && (
          <nav className="previsualizacion-navegacion" aria-label="Otros cosméticos">
            <button type="button" className="texto" onClick={navegar.anterior} aria-label="Anterior">
              <Icono nombre="flecha" tamano={20} />
            </button>
            <span className="nota" aria-live="polite">
              {navegar.posicion}
            </span>
            <button
              type="button"
              className="texto siguiente"
              onClick={navegar.siguiente}
              aria-label="Siguiente"
            >
              <Icono nombre="flecha" tamano={20} />
            </button>
          </nav>
        )}
      </div>
    </Dialogo>
  );
}

interface Props {
  invitado?: boolean;
  /** Tipos que se muestran (la subsección elegida de la tienda); por defecto, escudos y sobres. */
  tipos?: readonly ('escudo' | 'sobre')[];
  /** En «Todo»: los sueltos se desplazan dentro de su rejilla para no alargar la página. */
  compacta?: boolean;
}

export function TiendaCosmeticos({ invitado = false, tipos = ['escudo', 'sobre'], compacta = false }: Props) {
  const { catalogo, error } = useCatalogoCosmeticos();
  const [compra, setCompra] = useState<Compra | null>(null);
  const [pedirCuenta, setPedirCuenta] = useState(false);
  const [vista, setVista] = useState<Vista | null>(null);
  if (error && !catalogo) return <p className="nota">No se han podido cargar los cosméticos.</p>;
  if (!catalogo) return <p className="nota">Cargando cosméticos…</p>;
  const saldo = catalogo.saldo ?? 0;
  const porId = new Map(catalogo.cosmeticos.map((c) => [c.id, c]));
  const abrir = (c: Compra) => {
    setVista(null);
    if (invitado) setPedirCuenta(true);
    else setCompra(c);
  };

  // Precio en fragmentos o en euros, o «Comprado»; en la ficha de la rejilla y en la previsualización.
  const comprarCosmetico = (c: Cosmetico) => {
    if (c.poseido) return <span className="sello-adquirida pequeno">Comprado</span>;
    const falta = invitado ? 0 : c.precioFragmentos! - saldo;
    return (
      <span className="acciones">
        <button
          type="button"
          className="secundario precio-fragmentos"
          // Sin saldo suficiente no se abre el pago: se dice cuánto falta (los invitados ven la invitación).
          aria-disabled={falta > 0 || undefined}
          title={falta > 0 ? `Te faltan ${formatoFragmentos.format(falta)} fragmentos` : undefined}
          onClick={() =>
            falta > 0
              ? mostrarAviso(
                  'advertencia',
                  `Te faltan ${formatoFragmentos.format(falta)} fragmentos para ${c.nombre}`,
                )
              : abrir({ tipo: 'cosmetico', cosmetico: c, moneda: 'fragmentos' })
          }
        >
          <Icono nombre="cristal" tamano={14} />
          {formatoFragmentos.format(c.precioFragmentos!)} fragmentos
        </button>
        <button
          type="button"
          className="secundario"
          onClick={() => abrir({ tipo: 'cosmetico', cosmetico: c, moneda: 'eur' })}
        >
          {formatoEuros.format(c.precioCentimos! / 100)}
        </button>
      </span>
    );
  };

  const comprarPack = (p: PackCosmeticos) => {
    if (p.disponible === false) return <p className="nota">Ya tienes alguno: cómpralos sueltos</p>;
    const suelto = p.cosmeticos.reduce((t, id) => t + (porId.get(id)?.precioCentimos ?? 0), 0);
    return (
      <button type="button" className="secundario" onClick={() => abrir({ tipo: 'pack', pack: p })}>
        5 por {formatoEuros.format(p.precioCentimos / 100)}
        {suelto > p.precioCentimos && (
          <span className="ahorro"> (ahorras {formatoEuros.format((suelto - p.precioCentimos) / 100)})</span>
        )}
      </button>
    );
  };

  const trasComprar = (r: RespuestaCompraCosmetico) => {
    setCompra(null);
    useSaldo.setState({ saldo: r.saldo });
    mostrarAviso(
      'exito',
      r.cosmeticos.length > 1
        ? `${r.cosmeticos.length} cosméticos desbloqueados`
        : 'Desbloqueado: ya puedes elegirlo en tu perfil',
    );
    void useCosmeticos.getState().recargar();
    void useAspecto.getState().recargar();
  };

  return (
    <div className="tienda-cosmeticos">
      {BLOQUES.filter((b) => tipos.includes(b.tipo)).map((b) => {
        const lista = catalogo.cosmeticos.filter((c) => c.tipo === b.tipo && !c.gratuito);
        const packs = catalogo.packs.filter((p) => p.tipo === b.tipo);
        const tuyos = lista.filter((c) => c.poseido).length;
        return (
          <section key={b.id} id={b.id} className="tienda-bloque" aria-labelledby={`titulo-${b.id}`}>
            <header className="tienda-bloque-cabecera">
              <h3 id={`titulo-${b.id}`}>{b.titulo}</h3>
              {!invitado && (
                <span className="nota">
                  Tienes {tuyos} de {lista.length}
                </span>
              )}
            </header>
            <h4 className="tienda-bloque-subtitulo">Packs: 5 a mejor precio</h4>
            <ul className="tienda-packs" aria-label={`Packs de ${b.titulo.toLowerCase()}`}>
              {packs.map((p) => (
                <li key={p.id} className="panel tienda-pack" data-pack={p.id}>
                  <h5>{p.nombre}</h5>
                  <button
                    type="button"
                    className="pack-miniaturas boton-previsualizar"
                    aria-label={`Ver el ${p.nombre} en grande`}
                    onClick={() => setVista({ tipo: 'pack', pack: p })}
                  >
                    {p.cosmeticos.map((id) => (
                      <Miniatura key={id} id={id} tipo={b.tipo} />
                    ))}
                  </button>
                  {comprarPack(p)}
                </li>
              ))}
            </ul>
            <h4 className="tienda-bloque-subtitulo">Sueltos</h4>
            <ul
              className={`rejilla-tienda-cosmeticos${compacta ? ' tienda-bloque-desplazable' : ''}`}
              aria-label={`${b.titulo} sueltos`}
            >
              {lista.map((c, i) => (
                <li key={c.id} className="panel tienda-cosmetico" data-cosmetico={c.id}>
                  <button
                    type="button"
                    className="boton-previsualizar"
                    aria-label={`Ver ${c.nombre} en grande`}
                    onClick={() => setVista({ tipo: 'cosmetico', lista, indice: i })}
                  >
                    <Miniatura id={c.id} tipo={b.tipo} />
                  </button>
                  <span className="nombre-cosmetico">{c.nombre}</span>
                  {comprarCosmetico(c)}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {vista?.tipo === 'cosmetico' &&
        (() => {
          const c = vista.lista[vista.indice]!;
          const n = vista.lista.length;
          const ir = (paso: number) => setVista({ ...vista, indice: (vista.indice + paso + n) % n });
          return (
            <Previsualizacion
              titulo={c.nombre}
              subtitulo={
                (c.tipo === 'escudo' ? 'Escudo' : 'Diseño de sobre') +
                (vista.pack ? ` · ${vista.pack.nombre}` : '')
              }
              onCerrar={() => setVista(null)}
              {...(vista.pack && { onVolver: () => setVista({ tipo: 'pack', pack: vista.pack! }) })}
              navegar={{
                anterior: () => ir(-1),
                siguiente: () => ir(1),
                posicion: `${vista.indice + 1} de ${n}`,
              }}
            >
              <ArteGrande id={c.id} tipo={c.tipo} />
              {comprarCosmetico(c)}
            </Previsualizacion>
          );
        })()}
      {vista?.tipo === 'pack' && (
        <Previsualizacion
          titulo={vista.pack.nombre}
          subtitulo={`Pack de ${vista.pack.tipo === 'escudo' ? 'escudos' : 'sobres'}`}
          onCerrar={() => setVista(null)}
        >
          <ul className={`previsualizacion-pack ${vista.pack.tipo}`}>
            {vista.pack.cosmeticos.map((id, i, ids) => (
              <li key={id}>
                <button
                  type="button"
                  className="boton-previsualizar"
                  aria-label={`Ver ${porId.get(id)?.nombre ?? id} en grande`}
                  onClick={() =>
                    setVista({
                      tipo: 'cosmetico',
                      lista: ids.flatMap((x) => porId.get(x) ?? []),
                      indice: i,
                      pack: vista.pack,
                    })
                  }
                >
                  {vista.pack.tipo === 'escudo' ? (
                    <img src={urlEscudo(id, 256)} alt="" width={160} height={160} />
                  ) : (
                    <SobreArte diseno={id} />
                  )}
                  <span>{porId.get(id)?.nombre ?? id}</span>
                </button>
              </li>
            ))}
          </ul>
          {comprarPack(vista.pack)}
        </Previsualizacion>
      )}
      {compra?.tipo === 'cosmetico' && (
        <DialogoPagoPrueba<RespuestaCompraCosmetico>
          titulo={compra.cosmetico.nombre}
          resumen={
            <p>
              {compra.cosmetico.tipo === 'escudo' ? 'Escudo' : 'Diseño de sobre'} para tu cuenta.
              {compra.moneda === 'fragmentos' && ` Tienes ${formatoFragmentos.format(saldo)} fragmentos.`}
            </p>
          }
          {...(compra.moneda === 'eur'
            ? { precioCentimos: compra.cosmetico.precioCentimos! }
            : { precioFragmentos: compra.cosmetico.precioFragmentos! })}
          comprar={(idCompra) =>
            api(`/api/tienda/cosmeticos/${compra.cosmetico.id}/comprar`, {
              cuerpo: { idCompra, moneda: compra.moneda },
            })
          }
          onHecho={trasComprar}
          onCancelar={() => setCompra(null)}
        />
      )}
      {compra?.tipo === 'pack' && (
        <DialogoPagoPrueba<RespuestaCompraCosmetico>
          titulo={compra.pack.nombre}
          resumen={<p>{compra.pack.cosmeticos.map((id) => porId.get(id)?.nombre ?? id).join(', ')}.</p>}
          precioCentimos={compra.pack.precioCentimos}
          comprar={(idCompra) => api(`/api/tienda/packs/${compra.pack.id}/comprar`, { cuerpo: { idCompra } })}
          onHecho={trasComprar}
          onCancelar={() => setCompra(null)}
        />
      )}
      {pedirCuenta && (
        <Dialogo
          etiquetadoPor="titulo-pedir-cuenta"
          alEscape={() => setPedirCuenta(false)}
          alPulsarFondo={() => setPedirCuenta(false)}
        >
          <h2 id="titulo-pedir-cuenta">Crea tu cuenta para comprar</h2>
          <p>
            La colección y la tienda son para usuarios registrados. Crea tu cuenta para conservar tus cartas y
            ganar fragmentos con tus victorias.
          </p>
          <div className="acciones">
            <button type="button" className="secundario" onClick={() => setPedirCuenta(false)}>
              Ahora no
            </button>
            <Link className="boton boton-principal" to="/?acceso=registro">
              Crear cuenta
            </Link>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
