/**
 * Tienda (spec 006, US4 y US5; FR-025 a FR-031; contracts/ui.md «Tienda»): el sobre de 8 cartas nuevas y las
 * colecciones de pago. Spec 011 (FR-002): las cartas solo se pagan con fragmentos y ya no se venden fragmentos.
 * Spec 011 (US3): escudos y sobres cosméticos; un invitado ve el catálogo y, al comprar, se le pide cuenta (US3-3).
 * Retoques de la spec 011: secciones (Todo, Cosméticos, Colecciones, Funcionalidades y Modos de juego) con sus
 * subsecciones, en la URL para poder enlazarlas; lo que aún no se vende se ve como «Próximamente».
 * Tras un sobre, la apertura del draft y la revelación de las 8 cartas; tras una colección, su confirmación.
 */
import { NIVELES } from '@fbd/domain';
import type { ProductoColeccion, RespuestaCompraPase, RespuestaTienda, ResumenCompra } from '@fbd/protocol';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { Icono, type NombreIcono } from '../componentes/Icono';
import { comprarColeccion, comprarPase, comprarSobre, ErrorApi, obtenerTienda } from '../api/cliente';
import { reproducir } from '../sonido/sonido';
import { AperturaSobre } from '../componentes/AperturaSobre';
import { CartaJugador } from '../componentes/CartaJugador';
import { ConfirmacionCompra } from '../componentes/ConfirmacionCompra';
import { DialogoPagoPrueba, formatoEuros, formatoFragmentos } from '../componentes/DialogoPagoPrueba';
import { PantallaCargando } from '../componentes/Esqueleto';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { SobreArte } from '../componentes/arte/SobreArte';
import { SobreDecorativo } from '../componentes/SobreDecorativo';
import { TiendaCosmeticos } from '../componentes/TiendaCosmeticos';
import { prepararSobre } from '../estado/aspecto';
import { useSesion } from '../estado/sesion';
import { useEscalaRejilla } from '../componentes/useEscalaRejilla';
import { mostrarAviso } from '../estado/avisos';
import { useSaldo } from '../estado/saldo';
import { ETIQUETA_NIVEL } from '../textos/niveles';

type Pago = { tipo: 'coleccion'; producto: ProductoColeccion } | { tipo: 'pase'; moneda: 'fragmentos' | 'eur' };

type Resultado =
  | { tipo: 'sobre'; resumen: ResumenCompra; abierto: boolean; diseno: string }
  | { tipo: 'coleccion'; nombre: string; resumen: ResumenCompra };

/** Secciones de la tienda y sus subsecciones (retoques de la spec 011). «Todo» las muestra todas, sin subsecciones. */
export type SeccionTienda = 'todo' | 'cosmeticos' | 'colecciones' | 'funcionalidades' | 'modos';

interface DefinicionSeccion {
  id: SeccionTienda;
  texto: string;
  icono: NombreIcono;
  subsecciones: { id: string; texto: string }[];
}

const SECCIONES: DefinicionSeccion[] = [
  { id: 'todo', texto: 'Todo', icono: 'tienda', subsecciones: [] },
  {
    id: 'cosmeticos',
    texto: 'Cosméticos',
    icono: 'escudo',
    subsecciones: [
      { id: 'escudos', texto: 'Escudos' },
      { id: 'sobres', texto: 'Sobres' },
      { id: 'celebraciones', texto: 'Celebraciones' },
    ],
  },
  {
    id: 'colecciones',
    texto: 'Colecciones',
    icono: 'cartas',
    subsecciones: [
      { id: 'sobre', texto: 'Sobre de cartas' },
      { id: 'colecciones', texto: 'Colecciones de jugadores' },
    ],
  },
  {
    id: 'funcionalidades',
    texto: 'Funcionalidades',
    icono: 'rayo',
    subsecciones: [{ id: 'premium', texto: 'Premium' }],
  },
  { id: 'modos', texto: 'Modos de juego', icono: 'duelo', subsecciones: [] },
];

/** Los enlaces antiguos (`/tienda#escudos`, `#sobres`) llevan a su subsección. */
const POR_ANCLA: Record<string, [SeccionTienda, string]> = {
  escudos: ['cosmeticos', 'escudos'],
  sobres: ['cosmeticos', 'sobres'],
  celebraciones: ['cosmeticos', 'celebraciones'],
};

interface Navegacion {
  seccion: SeccionTienda;
  sub: string | null;
  ruta: (s: SeccionTienda, sub?: string) => string;
}

/** Sección y subsección de la URL (`?seccion=cosmeticos&sub=escudos`), con las anclas antiguas como respaldo. */
function useSeccion(): Navegacion {
  const [params] = useSearchParams();
  const { hash } = useLocation();
  const ancla = POR_ANCLA[hash.slice(1)];
  const pedida = params.get('seccion');
  const def =
    SECCIONES.find((s) => s.id === pedida) ?? SECCIONES.find((s) => s.id === ancla?.[0]) ?? SECCIONES[0]!;
  const pedidaSub = params.get('sub') ?? (ancla && !pedida ? ancla[1] : null);
  const sub = def.subsecciones.some((s) => s.id === pedidaSub) ? pedidaSub : null;
  const ruta = (s: SeccionTienda, subseccion?: string) =>
    s === 'todo' ? '/tienda' : `/tienda?seccion=${s}${subseccion ? `&sub=${subseccion}` : ''}`;
  return { seccion: def.id, sub, ruta };
}

/** Navegación de la tienda: secciones como pestañas y, debajo, las subsecciones de la elegida como fichas. */
function NavegacionTienda({ seccion, sub, ruta }: Navegacion) {
  const actual = SECCIONES.find((s) => s.id === seccion)!;
  return (
    <nav className="tienda-navegacion" aria-label="Secciones de la tienda">
      <ul className="tienda-secciones">
        {SECCIONES.map((s) => (
          <li key={s.id}>
            <Link
              to={ruta(s.id)}
              aria-current={s.id === seccion ? 'page' : undefined}
              className="tienda-seccion"
            >
              <Icono nombre={s.icono} tamano={18} />
              {s.texto}
            </Link>
          </li>
        ))}
      </ul>
      {actual.subsecciones.length > 0 && (
        <ul className="tienda-subsecciones" aria-label={`Subsecciones de ${actual.texto}`}>
          <li>
            <Link
              to={ruta(seccion)}
              aria-current={sub === null ? 'true' : undefined}
              className="ficha-filtro"
            >
              Todo
            </Link>
          </li>
          {actual.subsecciones.map((s) => (
            <li key={s.id}>
              <Link
                to={ruta(seccion, s.id)}
                aria-current={sub === s.id ? 'true' : undefined}
                className="ficha-filtro"
              >
                {s.texto}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

/** Lo que aún no se vende: un adelanto, sin botones que no lleven a nada. */
function Proximamente({ titulo, texto, icono }: { titulo: string; texto: string; icono: NombreIcono }) {
  return (
    <article className="panel tienda-proximamente">
      <span className="tienda-proximamente-icono">
        <Icono nombre={icono} tamano={28} />
      </span>
      <div>
        <h3>{titulo}</h3>
        <p className="nota">{texto}</p>
      </div>
      <span className="insignia-proximamente">Próximamente</span>
    </article>
  );
}

interface PropsCabecera {
  id: SeccionTienda;
  titulo: string;
  descripcion: string;
  enTodo: boolean;
  ruta: Navegacion['ruta'];
}

/** Cabecera de una sección con su descripción; en «Todo», con el enlace para verla sola. */
function CabeceraSeccion({ id, titulo, descripcion, enTodo, ruta }: PropsCabecera) {
  return (
    <header className="tienda-seccion-cabecera">
      <div>
        <h2 id={`titulo-${id}`}>{titulo}</h2>
        <p className="nota">{descripcion}</p>
      </div>
      {enTodo && (
        <Link className="enlace-seccion" to={ruta(id)}>
          Ver la sección
          <Icono nombre="flecha" tamano={16} />
        </Link>
      )}
    </header>
  );
}

/** Funcionalidades y modos de juego: aún sin productos (se ven como «Próximamente»). */
function SeccionesFuturas({ seccion, ruta, premium }: Navegacion & { premium?: ReactNode }) {
  const enTodo = seccion === 'todo';
  return (
    <>
      {(enTodo || seccion === 'funcionalidades') && (
        <section className="tienda-seccion-bloque" aria-labelledby="titulo-funcionalidades">
          <CabeceraSeccion
            id="funcionalidades"
            titulo="Funcionalidades"
            descripcion="Ventajas para tu cuenta."
            enTodo={enTodo}
            ruta={ruta}
          />
          {premium ?? (
            <Proximamente
              titulo="Premium"
              icono="rayo"
              texto="Funciones extra para gestionar tus partidas y tu colección. Muy pronto, aquí."
            />
          )}
        </section>
      )}
      {(enTodo || seccion === 'modos') && (
        <section className="tienda-seccion-bloque" aria-labelledby="titulo-modos">
          <CabeceraSeccion
            id="modos"
            titulo="Modos de juego"
            descripcion="Nuevas formas de jugar con tus cartas."
            enTodo={enTodo}
            ruta={ruta}
          />
          <Proximamente
            titulo="Nuevos modos"
            icono="duelo"
            texto="Modos de juego que podrás desbloquear para tus partidas. Muy pronto, aquí."
          />
        </section>
      )}
    </>
  );
}

/** Cosméticos de la sección elegida: en «Todo» o sin subsección, escudos, sobres y celebraciones; si no, solo la subsección. */
function SeccionCosmeticos({ seccion, sub, ruta, invitado }: Navegacion & { invitado: boolean }) {
  if (seccion !== 'todo' && seccion !== 'cosmeticos') return null;
  const tipos: ('escudo' | 'sobre' | 'celebracion')[] =
    sub === 'escudos' ? ['escudo'] : sub === 'sobres' ? ['sobre'] : sub === 'celebraciones' ? ['celebracion'] : ['escudo', 'sobre', 'celebracion'];
  return (
    <section className="tienda-seccion-bloque" aria-labelledby="titulo-cosmeticos">
      <CabeceraSeccion
        id="cosmeticos"
        titulo="Cosméticos"
        descripcion="Escudos para tu equipo, diseños para tus sobres y celebraciones de gol. Se eligen en «Mi perfil»."
        enTodo={seccion === 'todo'}
        ruta={ruta}
      />
      <TiendaCosmeticos invitado={invitado} tipos={tipos} compacta={seccion === 'todo'} />
    </section>
  );
}

export function Tienda() {
  const invitado = useSesion((s) => s.usuario?.tipo !== 'registrado');
  const navegacion = useSeccion();
  if (invitado) {
    const { seccion, ruta } = navegacion;
    return (
      <main className="pantalla tienda">
        <header className="cabecera-pantalla tienda-cabecera">
          <h1>Tienda</h1>
        </header>
        <NavegacionTienda {...navegacion} />
        {(seccion === 'todo' || seccion === 'colecciones') && (
          <section className="tienda-seccion-bloque" aria-labelledby="titulo-colecciones">
            <CabeceraSeccion
              id="colecciones"
              titulo="Colecciones"
              descripcion="Sobres de cartas y colecciones de jugadores."
              enTodo={seccion === 'todo'}
              ruta={ruta}
            />
            <EstadoVacio
              mensaje="Las cartas son para cuentas registradas: crea la tuya para comprar sobres, colecciones y cosméticos."
              accion={
                <Link className="boton secundario" to="/?acceso=registro">
                  Crear cuenta
                </Link>
              }
            />
          </section>
        )}
        <SeccionCosmeticos {...navegacion} invitado />
        <SeccionesFuturas {...navegacion} />
      </main>
    );
  }
  return <TiendaRegistrado navegacion={navegacion} />;
}

function TiendaRegistrado({ navegacion }: { navegacion: Navegacion }) {
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
      .catch((e: unknown) =>
        setError(e instanceof ErrorApi ? e.message : 'No se ha podido cargar la tienda'),
      );
  useEffect(() => {
    void cargar();
  }, []);
  useEffect(() => {
    if (tienda) useSaldo.setState({ saldo: tienda.saldo });
  }, [tienda?.saldo]);

  if (error)
    return <EstadoVacio mensaje={error} accion={<button onClick={() => void cargar()}>Reintentar</button>} />;
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
      const r = await comprarSobre(idSobre.current);
      idSobre.current = null;
      reproducir('cajaRegistradora');
      trasComprar(r);
      // Cada compra de sobre es una apertura: avanza el carrusel (spec 011, US2); si falla, el original.
      setResultado({ tipo: 'sobre', resumen: r, abierto: false, diseno: await prepararSobre() });
    } catch (e) {
      if (e instanceof ErrorApi && e.estado < 500) idSobre.current = null;
      mostrarAviso(
        'error',
        e instanceof ErrorApi ? e.message : 'No se ha podido comprar el sobre. Vuelve a intentarlo.',
      );
    } finally {
      setComprandoSobre(false);
    }
  };

  const { seccion, sub, ruta } = navegacion;
  const { sobre } = tienda;
  const faltan = sobre.faltan ?? 0;
  const verColecciones = seccion === 'todo' || seccion === 'colecciones';
  const verSub = (s: string) => seccion === 'todo' || sub === null || sub === s;

  return (
    <main className="pantalla tienda">
      <header className="cabecera-pantalla tienda-cabecera">
        <h1>Tienda</h1>
        <p className="tienda-saldo">
          <Icono nombre="cristal" tamano={20} />
          <strong>{formatoFragmentos.format(tienda.saldo)}</strong> fragmentos
        </p>
        <Link className="boton secundario" to="/coleccion">
          Colección
        </Link>
      </header>
      <NavegacionTienda {...navegacion} />

      {verColecciones && (
        <section className="tienda-seccion-bloque" aria-labelledby="titulo-colecciones">
          <CabeceraSeccion
            id="colecciones"
            titulo="Colecciones"
            descripcion="Cartas nuevas para tu colección, siempre con fragmentos."
            enTodo={seccion === 'todo'}
            ruta={ruta}
          />
          <div className="tienda-colecciones-contenido">
            {verSub('sobre') && (
              <section className="panel tienda-producto tienda-sobre" aria-labelledby="titulo-sobre">
                <SobreDecorativo className="tienda-sobre-arte" />
                <div>
                  <h3 id="titulo-sobre">Sobre de 8 cartas</h3>
                  <p>
                    8 cartas que aún no tienes de las colecciones de pago, con el reparto de un sobre del
                    draft.
                  </p>
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
                      {faltan > 0 && (
                        <span id="faltan-sobre" className="motivo">
                          Te faltan {formatoFragmentos.format(faltan)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {verSub('colecciones') &&
              tienda.colecciones.map((c) => (
                <article
                  key={c.id}
                  className={c.adquirida ? 'panel tienda-producto adquirida' : 'panel tienda-producto'}
                  data-coleccion={c.id}
                >
                  <h3>{c.nombre}</h3>
                  <p>{c.descripcion}</p>
                  <p className="nota">
                    {c.numCartas} cartas:{' '}
                    {NIVELES.filter((n) => c.porNivel[n])
                      .map((n) => `${c.porNivel[n]} ${ETIQUETA_NIVEL[n]}`)
                      .join(', ')}
                  </p>
                  <ul className="lista-compacta" aria-label={`Muestra de ${c.nombre}`}>
                    {c.muestra.map((j) => (
                      <li key={j.id}>
                        <CartaJugador jugador={j} compacta />
                      </li>
                    ))}
                  </ul>
                  <div className="progreso-coleccion">
                    <span>
                      Tienes {c.poseidas} de {c.numCartas}
                    </span>
                    <progress
                      max={c.numCartas}
                      value={c.poseidas}
                      aria-label={`Cartas de ${c.nombre} que tienes`}
                    />
                  </div>
                  {c.adquirida ? (
                    <p className="sello-adquirida pequeno">Adquirida</p>
                  ) : (
                    <>
                      {c.soloFragmentos !== null && (
                        <p className="nota">
                          Ya tienes todas sus cartas: solo recibirías {c.soloFragmentos} fragmentos
                        </p>
                      )}
                      <button
                        type="button"
                        className="boton-principal"
                        aria-disabled={tienda.saldo < c.precioFragmentos || undefined}
                        aria-describedby={tienda.saldo < c.precioFragmentos ? `faltan-${c.id}` : undefined}
                        onClick={() =>
                          tienda.saldo < c.precioFragmentos
                            ? undefined
                            : setPago({ tipo: 'coleccion', producto: c })
                        }
                      >
                        Comprar por {formatoFragmentos.format(c.precioFragmentos)} fragmentos
                      </button>
                      {tienda.saldo < c.precioFragmentos && (
                        <span id={`faltan-${c.id}`} className="motivo">
                          Te faltan {formatoFragmentos.format(c.precioFragmentos - tienda.saldo)}
                        </span>
                      )}
                    </>
                  )}
                </article>
              ))}
            {seccion === 'colecciones' && sub === null && (
              <Proximamente
                titulo="Más tipos de colección"
                icono="cartas"
                texto="Colecciones temáticas y de temporada para completar con tus cartas."
              />
            )}
          </div>
        </section>
      )}

      <SeccionCosmeticos {...navegacion} invitado={false} />
      <SeccionesFuturas
        {...navegacion}
        premium={<TarjetaPase pase={tienda.pasePremium} saldo={tienda.saldo} onComprar={(moneda) => setPago({ tipo: 'pase', moneda })} />}
      />

      {pago?.tipo === 'coleccion' && (
        <DialogoPagoPrueba
          titulo={pago.producto.nombre}
          resumen={
            <p>
              {pago.producto.numCartas} cartas; tienes {pago.producto.poseidas}. Las que ya tengas se
              convierten en fragmentos.
            </p>
          }
          precioFragmentos={pago.producto.precioFragmentos}
          comprar={(id) => comprarColeccion(pago.producto.id, id)}
          onHecho={(r) => {
            setPago(null);
            trasComprar(r);
            setResultado({ tipo: 'coleccion', nombre: pago.producto.nombre, resumen: r });
          }}
          onCancelar={() => setPago(null)}
        />
      )}
      {pago?.tipo === 'pase' && (
        <DialogoPagoPrueba
          titulo={`Pase premium · ${tienda.pasePremium.dias} días`}
          resumen={<p>Todos los niveles de rareza del draft, gratis, durante {tienda.pasePremium.dias} días. Si ya lo tienes, se suman a la fecha de fin.</p>}
          {...(pago.moneda === 'eur'
            ? { precioCentimos: tienda.pasePremium.precioCentimos }
            : { precioFragmentos: tienda.pasePremium.precioFragmentos })}
          comprar={(id) => comprarPase(pago.moneda, id)}
          onHecho={(r: RespuestaCompraPase) => {
            setPago(null);
            reproducir('cajaRegistradora');
            setTienda((t) => (t ? { ...t, saldo: r.saldo, pasePremium: { ...t.pasePremium, estado: r.premium } } : t));
            mostrarAviso('exito', `Pase premium activo hasta el ${fechaCorta(r.premium.fin)}.`);
          }}
          onCancelar={() => setPago(null)}
        />
      )}
      {resultado?.tipo === 'sobre' && !resultado.abierto && (
        <AperturaSobre
          cartas={resultado.resumen.cartas}
          diseno={resultado.diseno}
          onTerminar={() => setResultado({ ...resultado, abierto: true })}
        />
      )}
      {resultado?.tipo === 'sobre' && resultado.abierto && (
        <CartasDelSobre resumen={resultado.resumen} onSeguir={() => setResultado(null)} />
      )}
      {resultado?.tipo === 'coleccion' && (
        <ConfirmacionCompra
          nombre={resultado.nombre}
          resumen={resultado.resumen}
          onSeguir={() => setResultado(null)}
        />
      )}
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
                <button
                  type="button"
                  className="carta-boca-abajo"
                  onClick={() => setReveladas(i + 1)}
                  aria-label={`Revelar la carta ${i + 1}`}
                >
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

const fechaCorta = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

/** Pase premium (spec 013, FR-034): precio en fragmentos y en euros, y su estado si está activo. */
function TarjetaPase({
  pase,
  saldo,
  onComprar,
}: {
  pase: RespuestaTienda['pasePremium'];
  saldo: number;
  onComprar: (moneda: 'fragmentos' | 'eur') => void;
}) {
  const faltan = pase.precioFragmentos - saldo;
  const activo = pase.estado?.activo === true;
  return (
    <article className="panel tienda-producto tienda-pase" aria-labelledby="titulo-pase">
      <h3 id="titulo-pase">Pase premium · {pase.dias} días</h3>
      <p>Todos los niveles de rareza del draft, gratis, en las partidas que crees.</p>
      {activo && (
        <p className="sello-adquirida pequeno" data-testid="pase-activo">
          {pase.estado!.cortesia ? 'Activo' : `Activo hasta el ${fechaCorta(pase.estado!.fin)}`}
        </p>
      )}
      {!pase.estado?.cortesia && (
        <div className="acciones">
          <button
            type="button"
            className="boton-principal"
            aria-disabled={faltan > 0 || undefined}
            aria-describedby={faltan > 0 ? 'faltan-pase' : undefined}
            onClick={() => (faltan > 0 ? undefined : onComprar('fragmentos'))}
          >
            {activo ? 'Ampliar' : 'Comprar'} por {formatoFragmentos.format(pase.precioFragmentos)} fragmentos
          </button>
          <button type="button" className="secundario" onClick={() => onComprar('eur')}>
            {formatoEuros.format(pase.precioCentimos / 100)}
          </button>
          {faltan > 0 && (
            <span id="faltan-pase" className="motivo">
              Te faltan {formatoFragmentos.format(faltan)}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
