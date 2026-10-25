/**
 * Colección (spec 006, US1, US2 y US3; FR-034 a FR-041; contracts/ui.md «Colección»): las cartas propias con
 * buscador, orden, filtros, tres tamaños y paginador; el interruptor «Activa» de cada carta con el mínimo; la ficha
 * ampliada, desfragmentar y el historial de fragmentos. Toda la colección llega en una petición y se filtra en el
 * cliente (R15). Las preferencias se recuerdan por usuario en este navegador.
 */
import { comprobarMinimoActivo, DEMARCACIONES, NIVELES, recuentoPorDemarcacionYNivel, type Demarcacion, type Nivel } from '@fbd/domain';
import type { CartaPoseida, EstadoMinimo, MovimientoFragmentos, RespuestaColeccion } from '@fbd/protocol';
import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { cambiarActiva, desfragmentar, ErrorApi, obtenerColeccion, obtenerMovimientos } from '../api/cliente';
import { CartaJugador } from '../componentes/CartaJugador';
import { Dialogo } from '../componentes/Dialogo';
import { formatoFragmentos } from '../componentes/DialogoPagoPrueba';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { PantallaCargando } from '../componentes/Esqueleto';
import { FichaCartaColeccion } from '../componentes/FichaCartaColeccion';
import { InterruptorActiva } from '../componentes/InterruptorActiva';
import { mostrarAviso } from '../estado/avisos';
import { useSaldo } from '../estado/saldo';
import { useSesion } from '../estado/sesion';
import { ETIQUETA_NIVEL } from '../textos/niveles';
import {
  FILTROS_INICIALES,
  filtrarCartas,
  ordenarCartas,
  paginaQueContiene,
  paginar,
  type CriterioOrden,
  type Filtros,
  type Sentido,
} from './coleccion/filtrado';

type Tamano = 'pequeno' | 'mediano' | 'grande';

/** Ancho mínimo de cada columna y filas por página de cada tamaño; el pequeño usa la carta compacta. */
const TAMANOS: Record<Tamano, { etiqueta: string; minimo: number; filas: number }> = {
  pequeno: { etiqueta: 'Pequeño', minimo: 260, filas: 8 },
  mediano: { etiqueta: 'Mediano', minimo: 170, filas: 3 },
  grande: { etiqueta: 'Grande', minimo: 240, filas: 2 },
};
const HUECO_PX = 12;

const ORDENES: Record<CriterioOrden, string> = {
  nombre: 'Nombre',
  nacionalidad: 'Nacionalidad',
  coleccion: 'Colección',
  nivel: 'Nivel',
  demarcacion: 'Demarcación',
  media: 'Media',
};

interface Preferencias {
  tamano: Tamano;
  orden: CriterioOrden;
  sentido: Sentido;
  filtros: Filtros;
}

const PREFERENCIAS_INICIALES: Preferencias = { tamano: 'mediano', orden: 'nombre', sentido: 'asc', filtros: FILTROS_INICIALES };

const clavePreferencias = (usuarioId: string) => `fbd.coleccion.${usuarioId}`;

function leerPreferencias(usuarioId: string): Preferencias {
  try {
    const guardadas = JSON.parse(localStorage.getItem(clavePreferencias(usuarioId)) ?? 'null') as Partial<Preferencias> | null;
    return { ...PREFERENCIAS_INICIALES, ...guardadas, filtros: { ...FILTROS_INICIALES, ...guardadas?.filtros } };
  } catch {
    return PREFERENCIAS_INICIALES;
  }
}

function guardarPreferencias(usuarioId: string, p: Preferencias): void {
  try {
    localStorage.setItem(clavePreferencias(usuarioId), JSON.stringify(p));
  } catch {
    // Sin almacenamiento (navegación privada): las preferencias duran lo que la pantalla.
  }
}

export const textoMinimo = (i: { demarcacion: string; nivel: Nivel; minimo: number; activas: number }) =>
  `Mínimo de ${i.demarcacion} ${ETIQUETA_NIVEL[i.nivel]}: ${i.minimo}; tienes ${i.activas} activas`;

function indicadorMinimo(m: EstadoMinimo): string {
  const i = m.incumplidas[0];
  return i ? `Faltan ${i.minimo - i.activas} cartas activas en ${i.demarcacion} ${ETIQUETA_NIVEL[i.nivel]}` : 'Cumple el mínimo';
}


/** Columnas que caben en el ancho del contenedor para el tamaño elegido. */
function useColumnas(tamano: Tamano) {
  // Ref de función: el contenedor aparece cuando llega la colección.
  const [el, ref] = useState<HTMLDivElement | null>(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    if (!el) return;
    setAncho(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(() => setAncho(el.clientWidth));
    observador.observe(el);
    return () => observador.disconnect();
  }, [el]);
  const columnas = Math.max(1, Math.floor((ancho + HUECO_PX) / (TAMANOS[tamano].minimo + HUECO_PX)));
  return { ref, columnas };
}

export function Coleccion() {
  const usuarioId = useSesion((s) => s.usuario?.id ?? '');
  const [datos, setDatos] = useState<RespuestaColeccion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Preferencias>(() => leerPreferencias(usuarioId));
  const [busqueda, setBusqueda] = useState('');
  // Posición de la primera carta visible: la página se recalcula a partir de ella al cambiar el tamaño (US1, esc. 3).
  const [inicio, setInicio] = useState(0);
  const [fichaId, setFichaId] = useState<number | null>(null);
  const [historial, setHistorial] = useState(false);
  const { ref: rejilla, columnas } = useColumnas(prefs.tamano);

  const cargar = () =>
    obtenerColeccion()
      .then(setDatos)
      .catch((e: unknown) => setError(e instanceof ErrorApi ? e.message : 'No se ha podido cargar la colección'));
  useEffect(() => {
    void cargar();
  }, []);

  const cambiarPrefs = (cambio: Partial<Preferencias>, reiniciar = true) => {
    const nuevas = { ...prefs, ...cambio };
    setPrefs(nuevas);
    guardarPreferencias(usuarioId, nuevas);
    if (reiniciar) setInicio(0);
  };

  const lista = useMemo(
    () => (datos ? ordenarCartas(filtrarCartas(datos.cartas, busqueda, prefs.filtros), prefs.orden, prefs.sentido) : []),
    [datos, busqueda, prefs.filtros, prefs.orden, prefs.sentido],
  );
  const porPagina = columnas * TAMANOS[prefs.tamano].filas;
  const { elementos, pagina, paginas } = paginar(lista, paginaQueContiene(inicio, porPagina), porPagina);
  const irA = (p: number) => setInicio(Math.min(Math.max(0, p), paginas - 1) * porPagina);

  // Mínimo calculado en el cliente solo para explicar el interruptor; el servidor decide.
  const recuento = useMemo(() => recuentoPorDemarcacionYNivel((datos?.cartas ?? []).filter((c) => c.activa)), [datos]);
  const motivoMinimo = (c: CartaPoseida): string | null => {
    const r = comprobarMinimoActivo(recuento, c);
    return r.ok ? null : textoMinimo(r);
  };
  const nombresColecciones = useMemo(() => new Map((datos?.colecciones ?? []).map((c) => [c.id, c.nombre])), [datos]);
  useEffect(() => {
    if (datos) useSaldo.setState({ saldo: datos.saldo });
  }, [datos?.saldo]);

  if (error) return <EstadoVacio mensaje={error} accion={<button onClick={() => void cargar()}>Reintentar</button>} />;
  if (!datos) return <PantallaCargando forma="cartas" />;

  const actualizarCarta = (carta: CartaPoseida, minimo: EstadoMinimo) =>
    setDatos((d) => (d ? { ...d, minimo, cartas: d.cartas.map((c) => (c.id === carta.id ? carta : c)) } : d));

  const alternar = async (c: CartaPoseida, activa: boolean) => {
    try {
      const r = await cambiarActiva(c.id, activa);
      actualizarCarta(r.carta, r.minimo);
    } catch (e) {
      mostrarAviso('error', e instanceof ErrorApi ? e.message : 'No se ha podido cambiar la carta');
    }
  };

  const alDesfragmentar = async (c: CartaPoseida) => {
    try {
      const r = await desfragmentar(c.id);
      setDatos((d) => (d ? { ...d, saldo: r.saldo, minimo: r.minimo, cartas: d.cartas.filter((x) => x.id !== c.id) } : d));
      setFichaId(null);
      mostrarAviso('exito', `+${r.fragmentos} fragmentos por ${c.nombreCarta}`);
    } catch (e) {
      mostrarAviso('error', e instanceof ErrorApi ? e.message : 'No se ha podido desfragmentar la carta');
    }
  };

  const activas = datos.cartas.filter((c) => c.activa).length;
  const ficha = fichaId === null ? undefined : datos.cartas.find((c) => c.id === fichaId);
  const compacta = prefs.tamano === 'pequeno';
  const hayFiltro = busqueda !== '' || JSON.stringify(prefs.filtros) !== JSON.stringify(FILTROS_INICIALES);

  return (
    <main className="pantalla coleccion">
      <header className="cabecera-pantalla coleccion-cabecera">
        <h1>Colección</h1>
        <dl className="coleccion-resumen">
          <div>
            <dt>Cartas</dt>
            <dd>{datos.cartas.length}</dd>
          </div>
          <div>
            <dt>Activas</dt>
            <dd>{activas}</dd>
          </div>
          <div>
            <dt>Mínimo</dt>
            <dd data-cumple={datos.minimo.cumple}>{indicadorMinimo(datos.minimo)}</dd>
          </div>
          <div>
            <dt>Fragmentos</dt>
            <dd>
              <button type="button" className="texto saldo" onClick={() => setHistorial(true)} aria-label={`Fragmentos: ${datos.saldo}. Ver historial`}>
                {formatoFragmentos.format(datos.saldo)}
              </button>
            </dd>
          </div>
        </dl>
        <Link className="boton secundario" to="/tienda">
          Tienda
        </Link>
      </header>

      <section className="coleccion-herramientas" aria-label="Buscar, ordenar y filtrar">
        <div className="coleccion-busqueda">
          <input
            type="search"
            aria-label="Buscar por nombre"
            placeholder="Buscar por nombre"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setInicio(0);
            }}
          />
          {busqueda && (
            <button type="button" className="texto" onClick={() => setBusqueda('')}>
              Borrar
            </button>
          )}
        </div>
        <label>
          Ordenar por
          <select value={prefs.orden} onChange={(e) => cambiarPrefs({ orden: e.target.value as CriterioOrden })}>
            {Object.entries(ORDENES).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="secundario"
          aria-label={prefs.sentido === 'asc' ? 'Orden ascendente; cambiar a descendente' : 'Orden descendente; cambiar a ascendente'}
          onClick={() => cambiarPrefs({ sentido: prefs.sentido === 'asc' ? 'desc' : 'asc' })}
        >
          {prefs.sentido === 'asc' ? '↑ Ascendente' : '↓ Descendente'}
        </button>
        <label>
          Estado
          <select value={prefs.filtros.estado} onChange={(e) => cambiarPrefs({ filtros: { ...prefs.filtros, estado: e.target.value as Filtros['estado'] } })}>
            <option value="todas">Todas</option>
            <option value="activas">Activas</option>
            <option value="inactivas">Inactivas</option>
          </select>
        </label>
        <label>
          Nivel
          <select value={prefs.filtros.nivel} onChange={(e) => cambiarPrefs({ filtros: { ...prefs.filtros, nivel: e.target.value as Filtros['nivel'] } })}>
            <option value="todos">Todos</option>
            {NIVELES.map((n) => (
              <option key={n} value={n}>
                {ETIQUETA_NIVEL[n]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Demarcación
          <select
            value={prefs.filtros.demarcacion}
            onChange={(e) => cambiarPrefs({ filtros: { ...prefs.filtros, demarcacion: e.target.value as Demarcacion | 'todas' } })}
          >
            <option value="todas">Todas</option>
            {DEMARCACIONES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          Colección
          <select value={prefs.filtros.coleccion} onChange={(e) => cambiarPrefs({ filtros: { ...prefs.filtros, coleccion: e.target.value } })}>
            <option value="todas">Todas</option>
            {datos.colecciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <div className="segmentado" role="radiogroup" aria-label="Tamaño de las cartas">
          {(Object.keys(TAMANOS) as Tamano[]).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={prefs.tamano === t} onClick={() => cambiarPrefs({ tamano: t }, false)}>
              {TAMANOS[t].etiqueta}
            </button>
          ))}
        </div>
      </section>

      {lista.length > 0 && <Paginador pagina={pagina} paginas={paginas} irA={irA} posicion="arriba" />}

      <div ref={rejilla} className="coleccion-rejilla-medida">
        {lista.length === 0 ? (
          <EstadoVacio
            mensaje="No hay cartas que coincidan"
            accion={
              hayFiltro && (
                <button
                  type="button"
                  className="secundario"
                  onClick={() => {
                    setBusqueda('');
                    cambiarPrefs({ filtros: FILTROS_INICIALES });
                  }}
                >
                  Borrar búsqueda
                </button>
              )
            }
          />
        ) : (
          <ul className={`coleccion-rejilla tamano-${prefs.tamano}`} style={{ '--columnas': columnas } as CSSProperties} aria-label="Cartas">
            {elementos.map((c) => (
              <li key={c.id} className={c.activa ? 'coleccion-carta' : 'coleccion-carta inactiva'} data-carta={c.id}>
                <CartaJugador jugador={c} compacta={compacta} onClick={() => setFichaId(c.id)} />
                <div className="coleccion-carta-pie">
                  {!c.activa && <span className="insignia suave">Inactiva</span>}
                  <InterruptorActiva carta={c} motivoMinimo={motivoMinimo(c)} onCambiar={(a) => alternar(c, a)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lista.length > 0 && <Paginador pagina={pagina} paginas={paginas} irA={irA} posicion="abajo" />}

      {ficha && (
        <FichaCartaColeccion
          carta={ficha}
          nombresColecciones={nombresColecciones}
          motivoMinimo={motivoMinimo(ficha)}
          onCambiarActiva={(a) => alternar(ficha, a)}
          onDesfragmentar={() => alDesfragmentar(ficha)}
          onCerrar={() => setFichaId(null)}
        />
      )}
      {historial && <HistorialFragmentos saldo={datos.saldo} onCerrar={() => setHistorial(false)} />}
    </main>
  );
}

/** Botones con número: la página actual y las cuatro siguientes. */
const PAGINAS_VISIBLES = 5;

/** Paginador de la rejilla; va encima y debajo de ella (solo el de abajo anuncia el cambio de página). */
function Paginador({ pagina, paginas, irA, posicion }: { pagina: number; paginas: number; irA: (p: number) => void; posicion: 'arriba' | 'abajo' }) {
  const numeros = Array.from({ length: Math.min(PAGINAS_VISIBLES, paginas - pagina) }, (_, i) => pagina + i);
  return (
    <nav className={`paginador paginador-${posicion}`} aria-label={posicion === 'arriba' ? 'Páginas (arriba)' : 'Páginas'}>
      <button type="button" className="secundario" disabled={pagina === 0} onClick={() => irA(0)}>
        Primera
      </button>
      <button type="button" className="secundario" disabled={pagina === 0} onClick={() => irA(pagina - 1)}>
        Anterior
      </button>
      {numeros.map((p) => (
        <button
          key={p}
          type="button"
          className="secundario numero"
          aria-current={p === pagina ? 'page' : undefined}
          aria-label={`Página ${p + 1}`}
          onClick={() => irA(p)}
        >
          {p + 1}
        </button>
      ))}
      <span aria-live={posicion === 'abajo' ? 'polite' : undefined}>
        Página {pagina + 1} de {paginas}
      </span>
      <button type="button" className="secundario" disabled={pagina >= paginas - 1} onClick={() => irA(pagina + 1)}>
        Siguiente
      </button>
      <button type="button" className="secundario" disabled={pagina >= paginas - 1} onClick={() => irA(paginas - 1)}>
        Última
      </button>
    </nav>
  );
}

const LIMITE_HISTORIAL = 50;

/** Historial de movimientos de fragmentos, del más reciente al más antiguo (FR-018). */
function HistorialFragmentos({ saldo, onCerrar }: { saldo: number; onCerrar: () => void }) {
  const [movimientos, setMovimientos] = useState<MovimientoFragmentos[] | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const cargar = async (antes?: string) => {
    const r = await obtenerMovimientos(antes);
    setMovimientos((m) => [...(antes ? (m ?? []) : []), ...r.movimientos]);
    setHayMas(r.movimientos.length === LIMITE_HISTORIAL);
  };
  useEffect(() => {
    void cargar().catch(() => setMovimientos([]));
  }, []);
  const fecha = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  return (
    <Dialogo etiquetadoPor="titulo-historial" alEscape={onCerrar} alPulsarFondo={onCerrar}>
      <h2 id="titulo-historial">Fragmentos: {formatoFragmentos.format(saldo)}</h2>
      {movimientos === null ? (
        <p>Cargando…</p>
      ) : movimientos.length === 0 ? (
        <p>Aún no tienes movimientos. Gana torneos o desfragmenta cartas repetidas para conseguir fragmentos.</p>
      ) : (
        <table className="historial-fragmentos">
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Motivo</th>
              <th scope="col">Fragmentos</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => (
              <tr key={m.id}>
                <td>{fecha.format(new Date(m.creadoEn))}</td>
                <td>{m.descripcion}</td>
                <td className={m.importe > 0 ? 'positivo' : 'negativo'}>
                  {m.importe > 0 ? '+' : '−'}
                  {formatoFragmentos.format(Math.abs(m.importe))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="acciones">
        {hayMas && movimientos && (
          <button type="button" className="secundario" onClick={() => void cargar(movimientos[movimientos.length - 1]!.creadoEn)}>
            Cargar más
          </button>
        )}
        <button type="button" className="secundario" onClick={onCerrar} autoFocus>
          Cerrar
        </button>
      </div>
    </Dialogo>
  );
}
