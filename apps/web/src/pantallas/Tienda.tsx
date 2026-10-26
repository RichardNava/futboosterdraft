/**
 * Tienda (spec 006, US4, US5 y US7; FR-025 a FR-031; contracts/ui.md «Tienda»): el sobre de 8 cartas nuevas, con
 * fragmentos o en euros; las colecciones de pago; y los paquetes de fragmentos. Los pagos en euros son simulados.
 * Tras un sobre, la apertura del draft y la revelación de las 8 cartas; tras una colección, su confirmación.
 */
import { NIVELES } from '@fbd/domain';
import type { ProductoColeccion, ProductoFragmentos, RespuestaTienda, ResumenCompra } from '@fbd/protocol';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { comprarColeccion, comprarFragmentos, comprarSobre, ErrorApi, obtenerTienda } from '../api/cliente';
import { AperturaSobre } from '../componentes/AperturaSobre';
import { CartaJugador } from '../componentes/CartaJugador';
import { ConfirmacionCompra } from '../componentes/ConfirmacionCompra';
import { DialogoPagoPrueba, formatoEuros, formatoFragmentos } from '../componentes/DialogoPagoPrueba';
import { PantallaCargando } from '../componentes/Esqueleto';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { SobreArte } from '../componentes/arte/SobreArte';
import { useEscalaRejilla } from '../componentes/useEscalaRejilla';
import { mostrarAviso } from '../estado/avisos';
import { useSaldo } from '../estado/saldo';
import { ETIQUETA_NIVEL } from '../textos/niveles';

type Pago =
  | { tipo: 'sobre' }
  | { tipo: 'coleccion'; producto: ProductoColeccion }
  | { tipo: 'paquete'; producto: ProductoFragmentos };

type Resultado = { tipo: 'sobre'; resumen: ResumenCompra; abierto: boolean } | { tipo: 'coleccion'; nombre: string; resumen: ResumenCompra };

export function Tienda() {
  const [tienda, setTienda] = useState<RespuestaTienda | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pago, setPago] = useState<Pago | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [comprandoSobre, setComprandoSobre] = useState(false);
  // Un idCompra por intento de compra con fragmentos: se conserva si la petición falla por la conexión (FR-032).
  const idSobre = useRef<string | null>(null);

  const cargar = () =>
    obtenerTienda()
      .then(setTienda)
      .catch((e: unknown) => setError(e instanceof ErrorApi ? e.message : 'No se ha podido cargar la tienda'));
  useEffect(() => {
    void cargar();
  }, []);
  useEffect(() => {
    if (tienda) useSaldo.setState({ saldo: tienda.saldo });
  }, [tienda?.saldo]);
  // El saldo de la barra enlaza a `/tienda#fragmentos`: se baja a los paquetes en cuanto la tienda está cargada.
  const { hash } = useLocation();
  const cargada = tienda !== null;
  useEffect(() => {
    if (cargada && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [cargada, hash]);

  if (error) return <EstadoVacio mensaje={error} accion={<button onClick={() => void cargar()}>Reintentar</button>} />;
  if (!tienda) return <PantallaCargando forma="filas" />;

  const trasComprar = (r: ResumenCompra) => {
    setTienda((t) => (t ? { ...t, saldo: r.saldo } : t));
    void cargar();
  };

  const sobreConFragmentos = async () => {
    if (comprandoSobre) return;
    idSobre.current ??= crypto.randomUUID();
    setComprandoSobre(true);
    try {
      const r = await comprarSobre(idSobre.current, 'fragmentos');
      idSobre.current = null;
      trasComprar(r);
      setResultado({ tipo: 'sobre', resumen: r, abierto: false });
    } catch (e) {
      if (e instanceof ErrorApi && e.estado < 500) idSobre.current = null;
      mostrarAviso('error', e instanceof ErrorApi ? e.message : 'No se ha podido comprar el sobre. Vuelve a intentarlo.');
    } finally {
      setComprandoSobre(false);
    }
  };

  const { sobre } = tienda;
  const faltan = sobre.faltan ?? 0;

  return (
    <main className="pantalla tienda">
      <header className="cabecera-pantalla tienda-cabecera">
        <h1>Tienda</h1>
        <p className="tienda-saldo">
          <strong>{formatoFragmentos.format(tienda.saldo)}</strong> fragmentos
        </p>
        <Link className="boton secundario" to="/coleccion">
          Colección
        </Link>
      </header>

      <section className="panel tienda-producto tienda-sobre" aria-labelledby="titulo-sobre">
        <SobreArte className="tienda-sobre-arte" />
        <div>
          <h2 id="titulo-sobre">Sobre de 8 cartas</h2>
          <p>8 cartas que aún no tienes de las colecciones de pago, con el reparto de un sobre del draft.</p>
          {!sobre.disponible ? (
            <p className="nota" role="status">
              No disponible: {sobre.motivoNoDisponible}
            </p>
          ) : (
            <div className="acciones">
              <button
                type="button"
                className="boton-principal"
                data-principal=""
                aria-disabled={faltan > 0 || comprandoSobre || undefined}
                aria-describedby={faltan > 0 ? 'faltan-sobre' : undefined}
                onClick={() => (faltan > 0 ? undefined : void sobreConFragmentos())}
              >
                Comprar por {formatoFragmentos.format(sobre.precioFragmentos)} fragmentos
              </button>
              <button type="button" className="secundario" onClick={() => setPago({ tipo: 'sobre' })}>
                Comprar por {formatoEuros.format(sobre.precioCentimos / 100)}
              </button>
              {faltan > 0 && (
                <span id="faltan-sobre" className="motivo">
                  Te faltan {formatoFragmentos.format(faltan)}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="titulo-colecciones">
        <h2 id="titulo-colecciones">Colecciones</h2>
        <div className="tienda-colecciones">
          {tienda.colecciones.map((c) => (
            <article key={c.id} className={c.adquirida ? 'panel tienda-producto adquirida' : 'panel tienda-producto'} data-coleccion={c.id}>
              <h3>{c.nombre}</h3>
              <p>{c.descripcion}</p>
              <p className="nota">
                {c.numCartas} cartas: {NIVELES.filter((n) => c.porNivel[n]).map((n) => `${c.porNivel[n]} ${ETIQUETA_NIVEL[n]}`).join(', ')}
              </p>
              <ul className="lista-compacta" aria-label={`Muestra de ${c.nombre}`}>
                {c.muestra.map((j) => (
                  <li key={j.id}>
                    <CartaJugador jugador={j} compacta />
                  </li>
                ))}
              </ul>
              <p>
                Tienes {c.poseidas} de {c.numCartas}
              </p>
              {c.adquirida ? (
                <p className="sello-adquirida pequeno">Adquirida</p>
              ) : (
                <>
                  {c.soloFragmentos !== null && <p className="nota">Ya tienes todas sus cartas: solo recibirías {c.soloFragmentos} fragmentos</p>}
                  <button type="button" className="boton-principal" onClick={() => setPago({ tipo: 'coleccion', producto: c })}>
                    Comprar por {formatoEuros.format(c.precioCentimos / 100)}
                  </button>
                </>
              )}
            </article>
          ))}
        </div>
      </section>

      <section id="fragmentos" aria-labelledby="titulo-paquetes">
        <h2 id="titulo-paquetes">Fragmentos</h2>
        <div className="tienda-paquetes">
          {tienda.paquetes.map((p) => (
            <article key={p.id} className="panel tienda-producto" data-paquete={p.id}>
              <h3>{formatoFragmentos.format(p.fragmentos)} fragmentos</h3>
              <button type="button" className="secundario" onClick={() => setPago({ tipo: 'paquete', producto: p })}>
                Comprar por {formatoEuros.format(p.precioCentimos / 100)}
              </button>
            </article>
          ))}
        </div>
      </section>

      {pago?.tipo === 'sobre' && (
        <DialogoPagoPrueba
          titulo="Sobre de 8 cartas"
          resumen={<p>8 cartas nuevas de las colecciones de pago.</p>}
          precioCentimos={sobre.precioCentimos}
          comprar={(id) => comprarSobre(id, 'eur')}
          onHecho={(r) => {
            setPago(null);
            trasComprar(r);
            setResultado({ tipo: 'sobre', resumen: r, abierto: false });
          }}
          onCancelar={() => setPago(null)}
        />
      )}
      {pago?.tipo === 'coleccion' && (
        <DialogoPagoPrueba
          titulo={pago.producto.nombre}
          resumen={
            <p>
              {pago.producto.numCartas} cartas; tienes {pago.producto.poseidas}. Las que ya tengas se convierten en fragmentos.
            </p>
          }
          precioCentimos={pago.producto.precioCentimos}
          comprar={(id) => comprarColeccion(pago.producto.id, id)}
          onHecho={(r) => {
            setPago(null);
            trasComprar(r);
            setResultado({ tipo: 'coleccion', nombre: pago.producto.nombre, resumen: r });
          }}
          onCancelar={() => setPago(null)}
        />
      )}
      {pago?.tipo === 'paquete' && (
        <DialogoPagoPrueba
          titulo={`${formatoFragmentos.format(pago.producto.fragmentos)} fragmentos`}
          resumen={<p>Se suman a tu saldo al momento.</p>}
          precioCentimos={pago.producto.precioCentimos}
          comprar={(id) => comprarFragmentos(pago.producto.id, id)}
          onHecho={(r) => {
            setPago(null);
            trasComprar(r);
            mostrarAviso('exito', `+${formatoFragmentos.format(r.fragmentos)} fragmentos`);
          }}
          onCancelar={() => setPago(null)}
        />
      )}

      {resultado?.tipo === 'sobre' && !resultado.abierto && (
        <AperturaSobre cartas={resultado.resumen.cartas} onTerminar={() => setResultado({ ...resultado, abierto: true })} />
      )}
      {resultado?.tipo === 'sobre' && resultado.abierto && <CartasDelSobre resumen={resultado.resumen} onSeguir={() => setResultado(null)} />}
      {resultado?.tipo === 'coleccion' && <ConfirmacionCompra nombre={resultado.nombre} resumen={resultado.resumen} onSeguir={() => setResultado(null)} />}
    </main>
  );
}

/** Las 8 cartas del sobre, reveladas todas o una a una (FR-030). */
function CartasDelSobre({ resumen, onSeguir }: { resumen: ResumenCompra; onSeguir: () => void }) {
  const [unaAUna, setUnaAUna] = useState(false);
  const [reveladas, setReveladas] = useState(resumen.cartas.length);
  const mesa = useRef<HTMLDivElement>(null);
  const rejilla = useRef<HTMLUListElement>(null);
  // Las dos filas de cuatro, escaladas para caber enteras bajo la cabecera, como en la apertura.
  useEscalaRejilla(mesa, rejilla, { minima: 0.3, maxima: 1.15, clave: reveladas });
  return (
    <section className="panel cartas-sobre" aria-labelledby="titulo-cartas-sobre">
      <div className="cartas-sobre-cabecera">
        <h2 id="titulo-cartas-sobre">Tu sobre</h2>
        <div className="acciones">
          <Link className="boton secundario" to="/coleccion">
            Ver en mi colección
          </Link>
          <button type="button" className="boton-principal" data-principal="" onClick={onSeguir}>
            Seguir comprando
          </button>
        </div>
      </div>
      <div className="segmentado" role="radiogroup" aria-label="Revelar">
        <button
          type="button"
          role="radio"
          aria-checked={unaAUna}
          onClick={() => {
            setUnaAUna(true);
            setReveladas(0);
          }}
        >
          Revelar una a una
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!unaAUna}
          onClick={() => {
            setUnaAUna(false);
            setReveladas(resumen.cartas.length);
          }}
        >
          Todas
        </button>
      </div>
      <div ref={mesa} className="cartas-sobre-mesa">
        <ul ref={rejilla} className="rejilla-cartas" aria-label="Cartas del sobre">
          {resumen.cartas.map((c, i) => (
            <li key={c.id}>
              {i < reveladas ? (
                <CartaJugador jugador={c} />
              ) : (
                <button type="button" className="carta-boca-abajo" onClick={() => setReveladas(i + 1)} aria-label={`Revelar la carta ${i + 1}`}>
                  <SobreArte />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
