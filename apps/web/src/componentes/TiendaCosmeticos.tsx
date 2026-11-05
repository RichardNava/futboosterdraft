/**
 * Escudos y sobres en la tienda (spec 011, US3; contracts/ui.md §5): packs arriba y, debajo, cada cosmético de pago
 * con sus dos precios (fragmentos o euros simulados) o «Comprado». Los sobres se ven cerrados y, al pasar el ratón,
 * rasgados. Un invitado ve el catálogo y, al comprar, la invitación a crear cuenta.
 */
import type { Cosmetico, PackCosmeticos, RespuestaCompraCosmetico } from '@fbd/protocol';
import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/cliente';
import { useAspecto } from '../estado/aspecto';
import { mostrarAviso } from '../estado/avisos';
import { useCatalogoCosmeticos, useCosmeticos } from '../estado/cosmeticos';
import { useSaldo } from '../estado/saldo';
import { SobreArte } from './arte/SobreArte';
import { urlEscudo } from './chapa';
import { Dialogo } from './Dialogo';
import { DialogoPagoPrueba, formatoEuros, formatoFragmentos } from './DialogoPagoPrueba';

type Compra =
  | { tipo: 'cosmetico'; cosmetico: Cosmetico; moneda: 'eur' | 'fragmentos' }
  | { tipo: 'pack'; pack: PackCosmeticos };

const BLOQUES = [
  { tipo: 'escudo', id: 'escudos', titulo: 'Escudos' },
  { tipo: 'sobre', id: 'sobres', titulo: 'Sobres' },
] as const;

function Miniatura({ id, tipo }: { id: string; tipo: 'escudo' | 'sobre' }) {
  if (tipo === 'escudo') return <img src={urlEscudo(id, 256)} alt="" width={64} height={64} loading="lazy" className="miniatura-escudo" />;
  return (
    <span className="miniatura-sobre">
      <SobreArte diseno={id} mini className="sobre-cerrado-mini" />
      <SobreArte diseno={id} mini rasgado className="sobre-rasgado-mini" />
    </span>
  );
}

export function TiendaCosmeticos({ invitado = false }: { invitado?: boolean }) {
  const { catalogo, error } = useCatalogoCosmeticos();
  const [compra, setCompra] = useState<Compra | null>(null);
  const [pedirCuenta, setPedirCuenta] = useState(false);
  if (error && !catalogo) return <p className="nota">No se han podido cargar los cosméticos.</p>;
  if (!catalogo) return <p className="nota">Cargando cosméticos…</p>;
  const saldo = catalogo.saldo ?? 0;
  const porId = new Map(catalogo.cosmeticos.map((c) => [c.id, c]));
  const abrir = (c: Compra) => (invitado ? setPedirCuenta(true) : setCompra(c));

  const trasComprar = (r: RespuestaCompraCosmetico) => {
    setCompra(null);
    useSaldo.setState({ saldo: r.saldo });
    mostrarAviso('exito', r.cosmeticos.length > 1 ? `${r.cosmeticos.length} cosméticos desbloqueados` : 'Desbloqueado: ya puedes elegirlo en tu perfil');
    void useCosmeticos.getState().recargar();
    void useAspecto.getState().recargar();
  };

  return (
    <div className="tienda-cosmeticos">
      {BLOQUES.map((b) => {
        const lista = catalogo.cosmeticos.filter((c) => c.tipo === b.tipo && !c.gratuito);
        const packs = catalogo.packs.filter((p) => p.tipo === b.tipo);
        return (
          <section key={b.id} id={b.id} className="tienda-bloque" aria-labelledby={`titulo-${b.id}`}>
            <h2 id={`titulo-${b.id}`}>{b.titulo}</h2>
            <div className="tienda-bloque-desplazable">
              <ul className="tienda-packs" aria-label={`Packs de ${b.titulo.toLowerCase()}`}>
                {packs.map((p) => {
                  const suelto = p.cosmeticos.reduce((t, id) => t + (porId.get(id)?.precioCentimos ?? 0), 0);
                  return (
                    <li key={p.id} className="panel tienda-pack" data-pack={p.id}>
                      <h3>{p.nombre}</h3>
                      <span className="pack-miniaturas">
                        {p.cosmeticos.map((id) => (
                          <Miniatura key={id} id={id} tipo={b.tipo} />
                        ))}
                      </span>
                      {p.disponible === false ? (
                        <p className="nota">Ya tienes alguno: cómpralos sueltos</p>
                      ) : (
                        <button type="button" className="secundario" onClick={() => abrir({ tipo: 'pack', pack: p })}>
                          5 por {formatoEuros.format(p.precioCentimos / 100)}
                          {suelto > p.precioCentimos && <span className="ahorro"> (ahorras {formatoEuros.format((suelto - p.precioCentimos) / 100)})</span>}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <ul className="rejilla-tienda-cosmeticos">
                {lista.map((c) => (
                  <li key={c.id} className="panel tienda-cosmetico" data-cosmetico={c.id}>
                    <Miniatura id={c.id} tipo={b.tipo} />
                    <span className="nombre-cosmetico">{c.nombre}</span>
                    {c.poseido ? (
                      <span className="sello-adquirida pequeno">Comprado</span>
                    ) : (
                      <span className="acciones">
                        <button type="button" className="secundario" onClick={() => abrir({ tipo: 'cosmetico', cosmetico: c, moneda: 'fragmentos' })}>
                          {formatoFragmentos.format(c.precioFragmentos!)} fragmentos
                        </button>
                        <button type="button" className="secundario" onClick={() => abrir({ tipo: 'cosmetico', cosmetico: c, moneda: 'eur' })}>
                          {formatoEuros.format(c.precioCentimos! / 100)}
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}

      {compra?.tipo === 'cosmetico' && (
        <DialogoPagoPrueba<RespuestaCompraCosmetico>
          titulo={compra.cosmetico.nombre}
          resumen={
            <p>
              {compra.cosmetico.tipo === 'escudo' ? 'Escudo' : 'Diseño de sobre'} para tu cuenta.
              {compra.moneda === 'fragmentos' && ` Tienes ${formatoFragmentos.format(saldo)} fragmentos.`}
            </p>
          }
          {...(compra.moneda === 'eur' ? { precioCentimos: compra.cosmetico.precioCentimos! } : { precioFragmentos: compra.cosmetico.precioFragmentos! })}
          comprar={(idCompra) =>
            api(`/api/tienda/cosmeticos/${compra.cosmetico.id}/comprar`, { cuerpo: { idCompra, moneda: compra.moneda } })
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
        <Dialogo etiquetadoPor="titulo-pedir-cuenta" alEscape={() => setPedirCuenta(false)} alPulsarFondo={() => setPedirCuenta(false)}>
          <h2 id="titulo-pedir-cuenta">Crea tu cuenta para comprar</h2>
          <p>La colección y la tienda son para usuarios registrados. Crea tu cuenta para conservar tus cartas y ganar fragmentos con tus victorias.</p>
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
