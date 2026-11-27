/**
 * Panel de administración (spec 017, FR-045; contracts/ui.md). Se carga de forma diferida y solo se enlaza a los
 * administradores, pero el control está en el servidor: cada acción se vuelve a comprobar allí.
 */
import type { AccionRegistro, AjusteAdmin, CuentaAdmin, EntradaRegistroAdmin, PartidaAdmin, RespuestaAjustesAdmin, RespuestaEntregaFragmentos } from '@fbd/protocol';
import { ENTREGA_MAXIMA_FRAGMENTOS, ROLES_ASIGNABLES, type RolAsignable } from '@fbd/domain';
import { useCallback, useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { api, ErrorApi } from '../api/cliente';
import { Dialogo } from '../componentes/Dialogo';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { ListaPestanas } from '../componentes/ListaPestanas';
import { mostrarAviso } from '../estado/avisos';
import { useSesion } from '../estado/sesion';
import '../estilos/admin.css';

type Pestana = 'partidas' | 'cuentas' | 'ajustes' | 'registro';

const PESTANAS: readonly { id: Pestana; texto: string }[] = [
  { id: 'partidas', texto: 'Partidas' },
  { id: 'cuentas', texto: 'Cuentas' },
  { id: 'ajustes', texto: 'Ajustes' },
  { id: 'registro', texto: 'Registro' },
];

const ERRORES: Record<string, string> = {
  ULTIMO_ADMINISTRADOR: 'Debe quedar al menos un administrador.',
  ROL_PROPIO: 'No puedes cambiar tu propio rol.',
  SUSPENSION_PROPIA: 'No puedes suspender tu propia cuenta.',
  PARTICIPA_ADMIN: 'Juegas en esta partida: debe cerrarla otro administrador o la consola.',
  NO_BETATESTER: 'Esta cuenta no tiene el rol betatester.',
};

const textoError = (e: unknown) => (e instanceof ErrorApi ? (ERRORES[e.codigo] ?? e.message) : 'No se pudo completar la acción. Inténtalo de nuevo.');

const TEXTO_ROL: Record<string, string> = { invitado: 'Invitado', jugador: 'Jugador', betatester: 'Betatester', administrador: 'Administrador', consola: 'Consola' };
const TEXTO_ESTADO: Record<PartidaAdmin['estado'], string> = { buscando: 'Buscando', en_draft: 'En draft', en_torneo: 'En torneo' };
const TEXTO_MODO: Record<string, string> = { liga: 'Liga', playoff: 'Playoff', mixto: 'Mixto', duelos: 'Duelo de jugadores' };
const TEXTO_ACCION: Record<AccionRegistro, string> = {
  'rol.cambiar': 'Cambiar rol',
  'cuenta.suspender': 'Suspender cuenta',
  'cuenta.reactivar': 'Reactivar cuenta',
  'premium.conceder': 'Conceder premium',
  'premium.retirar': 'Retirar premium',
  'fragmentos.entregar': 'Entregar fragmentos',
  'ajuste.cambiar': 'Cambiar ajuste',
  'partida.cerrar': 'Cerrar partida',
  'panel.acceso_denegado': 'Acceso denegado',
};
const TEXTO_RESULTADO: Record<EntradaRegistroAdmin['resultado'], string> = { ok: 'Hecho', denegado: 'Denegado', error: 'Error' };
const TEXTO_AJUSTE: Record<string, { nombre: string; valores: Record<string, string> }> = {
  identidad_cartas: { nombre: 'Identidad de las cartas', valores: { real: 'Real', alternativa: 'Alternativa' } },
  acceso_niveles_rareza: { nombre: 'Acceso a los niveles de rareza', valores: { libre: 'Libre', restringido: 'Restringido' } },
};

const fecha = (iso: string) => new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
const numero = new Intl.NumberFormat('es-ES');

/** Lista paginada del servidor, con «Anterior» y «Siguiente» para que no haya que desplazarse (Principio XI). */
function usePagina<T>(ruta: string, campo: string) {
  const [paginas, setPaginas] = useState<{ ruta: string; cursores: (string | null)[] }>({ ruta, cursores: [null] });
  const cursores = paginas.ruta === ruta ? paginas.cursores : [null];
  const cursor = cursores.at(-1) ?? null;
  const [datos, setDatos] = useState<{ lista: T[]; cursor: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    const separador = ruta.includes('?') ? '&' : '?';
    api<Record<string, unknown>>(`${ruta}${separador}limite=10${cursor ? `&cursor=${cursor}` : ''}`, { sinCache: true })
      .then((r) => {
        if (!vigente) return;
        setDatos({ lista: r[campo] as T[], cursor: r.cursor as string | null });
        setError(null);
      })
      .catch((e: unknown) => vigente && setError(textoError(e)));
    return () => {
      vigente = false;
    };
  }, [ruta, campo, cursor, version]);

  return {
    lista: datos?.lista ?? null,
    error,
    recargar: useCallback(() => setVersion((v) => v + 1), []),
    anterior: cursores.length > 1 ? () => setPaginas({ ruta, cursores: cursores.slice(0, -1) }) : null,
    siguiente: datos?.cursor ? () => setPaginas({ ruta, cursores: [...cursores, datos.cursor] }) : null,
  };
}

function Paginacion({ anterior, siguiente }: { anterior: (() => void) | null; siguiente: (() => void) | null }) {
  if (!anterior && !siguiente) return null;
  return (
    <nav className="acciones admin-paginacion" aria-label="Páginas">
      <button type="button" className="secundario" disabled={!anterior} onClick={() => anterior?.()}>
        Anterior
      </button>
      <button type="button" className="secundario" disabled={!siguiente} onClick={() => siguiente?.()}>
        Siguiente
      </button>
    </nav>
  );
}

/** Confirmación de una acción: explica qué va a pasar y pide el motivo. */
function DialogoAccion({
  titulo,
  descripcion,
  confirmar,
  peligro,
  puedeEnviar = true,
  children,
  alConfirmar,
  alCerrar,
}: {
  titulo: string;
  descripcion: ReactNode;
  confirmar: string;
  peligro?: boolean;
  puedeEnviar?: boolean;
  children?: ReactNode;
  alConfirmar: (motivo: string) => Promise<void>;
  alCerrar: () => void;
}) {
  const id = useId();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const limpio = motivo.trim();

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await alConfirmar(limpio);
      alCerrar();
    } catch (err) {
      setError(textoError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialogo etiquetadoPor={`${id}-titulo`} alEscape={alCerrar}>
      <form onSubmit={(e) => void enviar(e)}>
        <h2 id={`${id}-titulo`}>{titulo}</h2>
        <p>{descripcion}</p>
        {children}
        <label htmlFor={`${id}-motivo`}>Motivo</label>
        <textarea id={`${id}-motivo`} rows={3} minLength={3} maxLength={500} required value={motivo} aria-describedby={`${id}-nota`} onChange={(e) => setMotivo(e.target.value)} autoFocus />
        <p id={`${id}-nota`} className="nota">
          No escribas datos personales
        </p>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        <div className="acciones">
          <button type="button" className="secundario" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="submit" className={peligro ? 'peligro' : 'boton-principal'} disabled={enviando || !puedeEnviar || limpio.length < 3}>
            {confirmar}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

function PanelPartidas() {
  const { lista, error, recargar, anterior, siguiente } = usePagina<PartidaAdmin>('/api/admin/partidas', 'partidas');
  const [elegida, setElegida] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const partida = lista?.find((p) => p.id === elegida) ?? null;

  return (
    <div className="admin-columnas">
      <div>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {lista?.length === 0 && <EstadoVacio mensaje="No hay partidas activas." />}
        <ul className="admin-lista">
          {lista?.map((p) => (
            <li key={p.id}>
              <button type="button" className="admin-fila" aria-pressed={p.id === elegida} onClick={() => setElegida(p.id)}>
                <strong>{TEXTO_MODO[p.modo] ?? p.modo}</strong>
                <span>{TEXTO_ESTADO[p.estado]}</span>
                <span>
                  {p.humanos} de {p.participantes} personas
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Paginacion anterior={anterior} siguiente={siguiente} />
      </div>
      <aside className="admin-detalle" aria-label="Detalle de la partida">
        {!partida ? (
          <p className="nota">Elige una partida de la lista.</p>
        ) : (
          <>
            <h2>{TEXTO_MODO[partida.modo] ?? partida.modo}</h2>
            <dl>
              <dt>Estado</dt>
              <dd>{TEXTO_ESTADO[partida.estado]}</dd>
              <dt>Participantes</dt>
              <dd>
                {partida.humanos} personas de {partida.participantes}
              </dd>
              <dt>Creada</dt>
              <dd>{fecha(partida.creadaEn)}</dd>
              <dt>Id</dt>
              <dd className="admin-id">{partida.id}</dd>
            </dl>
            {partida.participaAdmin && <p className="nota">{ERRORES.PARTICIPA_ADMIN}</p>}
            <button type="button" className="peligro" disabled={partida.participaAdmin} onClick={() => setCerrando(true)}>
              Cerrar partida
            </button>
          </>
        )}
      </aside>
      {cerrando && partida && (
        <DialogoAccion
          titulo="Cerrar partida"
          descripcion="La partida terminará para todos, sin premios. Los participantes recibirán un aviso."
          confirmar="Cerrar partida"
          peligro
          alCerrar={() => setCerrando(false)}
          alConfirmar={async (motivo) => {
            await api(`/api/admin/partidas/${partida.id}/cerrar`, { cuerpo: { motivo } });
            mostrarAviso('exito', 'Partida cerrada.');
            setElegida(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}

type AccionCuenta = 'rol' | 'suspender' | 'reactivar' | 'premium' | 'fragmentos';

function DialogoCuenta({ accion, cuenta, alCerrar, alTerminar }: { accion: AccionCuenta; cuenta: CuentaAdmin; alCerrar: () => void; alTerminar: () => void }) {
  const [rol, setRol] = useState<RolAsignable>(cuenta.rol);
  const [cantidad, setCantidad] = useState('1000');
  // Se genera al abrir y se reutiliza al reintentar: una entrega repetida no suma dos veces (FR-050a).
  const [idEntrega] = useState(() => crypto.randomUUID());
  const base = `/api/admin/cuentas/${cuenta.id}`;
  const terminar = (texto: string) => {
    mostrarAviso('exito', texto);
    alTerminar();
  };

  if (accion === 'rol') {
    return (
      <DialogoAccion
        titulo={`Cambiar el rol de ${cuenta.apodo}`}
        descripcion="El cambio se aplica en su siguiente petición, sin volver a iniciar sesión."
        confirmar="Cambiar rol"
        puedeEnviar={rol !== cuenta.rol}
        alCerrar={alCerrar}
        alConfirmar={async (motivo) => {
          await api(`${base}/rol`, { metodo: 'PUT', cuerpo: { rol, motivo } });
          terminar('Rol cambiado.');
        }}
      >
        <label htmlFor="admin-rol">Rol</label>
        <select id="admin-rol" value={rol} onChange={(e) => setRol(e.target.value as RolAsignable)}>
          {ROLES_ASIGNABLES.map((r) => (
            <option key={r} value={r}>
              {TEXTO_ROL[r]}
            </option>
          ))}
        </select>
      </DialogoAccion>
    );
  }
  if (accion === 'suspender') {
    return (
      <DialogoAccion
        titulo={`Suspender a ${cuenta.apodo}`}
        descripcion="Se cerrarán sus sesiones y no podrá entrar. Sus partidas seguirán con las reglas de desconexión."
        confirmar="Suspender"
        peligro
        alCerrar={alCerrar}
        alConfirmar={async (motivo) => {
          await api(`${base}/suspender`, { cuerpo: { motivo } });
          terminar('Cuenta suspendida.');
        }}
      />
    );
  }
  if (accion === 'reactivar') {
    return (
      <DialogoAccion
        titulo={`Reactivar a ${cuenta.apodo}`}
        descripcion="Podrá volver a iniciar sesión."
        confirmar="Reactivar"
        alCerrar={alCerrar}
        alConfirmar={async (motivo) => {
          await api(`${base}/reactivar`, { cuerpo: { motivo } });
          terminar('Cuenta reactivada.');
        }}
      />
    );
  }
  if (accion === 'premium') {
    const cortesia = !cuenta.premiumCortesia;
    return (
      <DialogoAccion
        titulo={`${cortesia ? 'Conceder' : 'Retirar'} premium a ${cuenta.apodo}`}
        descripcion={cortesia ? 'Tendrá premium de cortesía, sin fecha de fin.' : 'Dejará de tener premium de cortesía. Un pase comprado no cambia.'}
        confirmar={cortesia ? 'Conceder' : 'Retirar'}
        alCerrar={alCerrar}
        alConfirmar={async (motivo) => {
          await api(`${base}/premium`, { metodo: 'PUT', cuerpo: { cortesia, motivo } });
          terminar(cortesia ? 'Premium concedido.' : 'Premium retirado.');
        }}
      />
    );
  }
  const n = Number(cantidad);
  const valida = Number.isInteger(n) && n >= 1 && n <= ENTREGA_MAXIMA_FRAGMENTOS;
  return (
    <DialogoAccion
      titulo={`Entregar fragmentos a ${cuenta.apodo}`}
      descripcion={valida ? `Saldo resultante: ${numero.format(cuenta.saldo + n)} fragmentos.` : `Indica un número entero entre 1 y ${numero.format(ENTREGA_MAXIMA_FRAGMENTOS)}.`}
      confirmar="Entregar"
      puedeEnviar={valida}
      alCerrar={alCerrar}
      alConfirmar={async (motivo) => {
        const r = await api<RespuestaEntregaFragmentos>(`${base}/fragmentos`, { cuerpo: { idEntrega, cantidad: n, motivo } });
        terminar(`Entregados ${numero.format(r.cantidad)} fragmentos. Saldo: ${numero.format(r.saldo)}.`);
      }}
    >
      <label htmlFor="admin-cantidad">Cantidad (máximo {numero.format(ENTREGA_MAXIMA_FRAGMENTOS)})</label>
      <input id="admin-cantidad" type="number" inputMode="numeric" min={1} max={ENTREGA_MAXIMA_FRAGMENTOS} step={1} value={cantidad} aria-invalid={!valida} onChange={(e) => setCantidad(e.target.value)} />
    </DialogoAccion>
  );
}

function PanelCuentas() {
  const miId = useSesion((s) => s.usuario?.id);
  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');
  const { lista, error, recargar, anterior, siguiente } = usePagina<CuentaAdmin>(`/api/admin/cuentas${q ? `?q=${encodeURIComponent(q)}` : ''}`, 'cuentas');
  const [elegida, setElegida] = useState<string | null>(null);
  const [accion, setAccion] = useState<AccionCuenta | null>(null);
  const cuenta = lista?.find((c) => c.id === elegida) ?? null;
  const propia = cuenta?.id === miId;

  return (
    <div className="admin-columnas">
      <div>
        <form
          className="admin-filtros"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(texto.trim());
          }}
        >
          <label htmlFor="admin-buscar">Buscar por correo o apodo</label>
          <input id="admin-buscar" type="search" maxLength={100} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <button type="submit" className="secundario">
            Buscar
          </button>
        </form>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {lista?.length === 0 && <EstadoVacio mensaje="No hay cuentas con esa búsqueda." />}
        <ul className="admin-lista">
          {lista?.map((c) => (
            <li key={c.id}>
              <button type="button" className="admin-fila" aria-pressed={c.id === elegida} onClick={() => setElegida(c.id)}>
                <strong>{c.apodo}</strong>
                <span className="admin-correo">{c.email}</span>
                <span>
                  {TEXTO_ROL[c.rol]}
                  {c.suspendida && ' · Suspendida'}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Paginacion anterior={anterior} siguiente={siguiente} />
      </div>
      <aside className="admin-detalle" aria-label="Detalle de la cuenta">
        {!cuenta ? (
          <p className="nota">Elige una cuenta de la lista.</p>
        ) : (
          <>
            <h2>{cuenta.apodo}</h2>
            <dl>
              <dt>Correo</dt>
              <dd className="admin-correo">{cuenta.email}</dd>
              <dt>Rol</dt>
              <dd>{TEXTO_ROL[cuenta.rol]}</dd>
              <dt>Estado</dt>
              <dd>{cuenta.suspendida ? 'Suspendida' : 'Activa'}</dd>
              <dt>Premium de cortesía</dt>
              <dd>{cuenta.premiumCortesia ? 'Sí' : 'No'}</dd>
              <dt>Saldo</dt>
              <dd>{numero.format(cuenta.saldo)} fragmentos</dd>
            </dl>
            {propia && <p className="nota">Es tu cuenta: no puedes cambiar tu rol ni suspenderte.</p>}
            <div className="acciones">
              <button type="button" className="secundario" disabled={propia} onClick={() => setAccion('rol')}>
                Cambiar rol
              </button>
              <button type="button" className="secundario" onClick={() => setAccion('premium')}>
                {cuenta.premiumCortesia ? 'Retirar premium' : 'Conceder premium'}
              </button>
              {cuenta.rol === 'betatester' && (
                <button type="button" className="secundario" onClick={() => setAccion('fragmentos')}>
                  Entregar fragmentos
                </button>
              )}
              {cuenta.suspendida ? (
                <button type="button" className="secundario" onClick={() => setAccion('reactivar')}>
                  Reactivar
                </button>
              ) : (
                cuenta.rol !== 'administrador' && (
                  <button type="button" className="peligro" disabled={propia} onClick={() => setAccion('suspender')}>
                    Suspender
                  </button>
                )
              )}
            </div>
          </>
        )}
      </aside>
      {accion && cuenta && <DialogoCuenta accion={accion} cuenta={cuenta} alCerrar={() => setAccion(null)} alTerminar={recargar} />}
    </div>
  );
}

function PanelAjustes() {
  const [ajustes, setAjustes] = useState<AjusteAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegidos, setElegidos] = useState<Record<string, string>>({});
  const [cambiando, setCambiando] = useState<AjusteAdmin | null>(null);

  const cargar = useCallback(() => {
    api<RespuestaAjustesAdmin>('/api/admin/ajustes', { sinCache: true })
      .then((r) => {
        setAjustes(r.ajustes);
        setElegidos({});
        setError(null);
      })
      .catch((e: unknown) => setError(textoError(e)));
  }, []);
  useEffect(cargar, [cargar]);

  const textos = (clave: string) => TEXTO_AJUSTE[clave] ?? { nombre: clave, valores: {} };

  return (
    <div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <ul className="admin-ajustes">
        {ajustes?.map((a) => {
          const valor = elegidos[a.clave] ?? a.valor;
          return (
            <li key={a.clave}>
              <label htmlFor={`ajuste-${a.clave}`}>{textos(a.clave).nombre}</label>
              <select id={`ajuste-${a.clave}`} value={valor} onChange={(e) => setElegidos((s) => ({ ...s, [a.clave]: e.target.value }))}>
                {a.admitidos.map((v) => (
                  <option key={v} value={v}>
                    {textos(a.clave).valores[v] ?? v}
                  </option>
                ))}
              </select>
              <button type="button" className="secundario" disabled={valor === a.valor} aria-label={`Cambiar ${textos(a.clave).nombre}`} onClick={() => setCambiando(a)}>
                Cambiar
              </button>
            </li>
          );
        })}
      </ul>
      {cambiando && (
        <DialogoAccion
          titulo={`Cambiar ${textos(cambiando.clave).nombre.toLowerCase()}`}
          descripcion="Se aplica en 30 s como máximo y solo a las partidas nuevas."
          confirmar="Cambiar ajuste"
          alCerrar={() => setCambiando(null)}
          alConfirmar={async (motivo) => {
            await api(`/api/admin/ajustes/${cambiando.clave}`, { metodo: 'PUT', cuerpo: { valor: elegidos[cambiando.clave], motivo } });
            mostrarAviso('exito', 'Ajuste cambiado.');
            cargar();
          }}
        />
      )}
    </div>
  );
}

function PanelRegistro() {
  const [filtros, setFiltros] = useState({ accion: '', actor: '', objeto: '' });
  const [aplicados, setAplicados] = useState(filtros);
  const consulta = new URLSearchParams(Object.entries(aplicados).filter(([, v]) => v !== '')).toString();
  const { lista, error, anterior, siguiente } = usePagina<EntradaRegistroAdmin>(`/api/admin/registro${consulta ? `?${consulta}` : ''}`, 'entradas');

  return (
    <div>
      <form
        className="admin-filtros admin-filtros-registro"
        onSubmit={(e) => {
          e.preventDefault();
          setAplicados({ accion: filtros.accion, actor: filtros.actor.trim(), objeto: filtros.objeto.trim() });
        }}
      >
        <div>
          <label htmlFor="registro-accion">Acción</label>
          <select id="registro-accion" value={filtros.accion} onChange={(e) => setFiltros((f) => ({ ...f, accion: e.target.value }))}>
            <option value="">Todas</option>
            {Object.entries(TEXTO_ACCION).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="registro-actor">Id de quien actúa</label>
          <input id="registro-actor" maxLength={64} value={filtros.actor} onChange={(e) => setFiltros((f) => ({ ...f, actor: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="registro-objeto">Id del objeto</label>
          <input id="registro-objeto" maxLength={64} value={filtros.objeto} onChange={(e) => setFiltros((f) => ({ ...f, objeto: e.target.value }))} />
        </div>
        <button type="submit" className="secundario">
          Filtrar
        </button>
      </form>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {lista?.length === 0 && <EstadoVacio mensaje="No hay entradas con esos filtros." />}
      <ul className="admin-lista admin-registro">
        {lista?.map((e) => (
          <li key={e.id}>
            <strong>{TEXTO_ACCION[e.accion]}</strong>
            <span>{TEXTO_RESULTADO[e.resultado]}{e.intentos > 1 && ` (${e.intentos} intentos)`}</span>
            <span>
              {e.actor.nombre} · {TEXTO_ROL[e.actor.rol]}
            </span>
            {e.objeto && <span className="admin-id">Sobre: {e.objeto.nombre}</span>}
            {e.motivo && <span>Motivo: {e.motivo}</span>}
            <time dateTime={e.creadoEn}>{fecha(e.creadoEn)}</time>
          </li>
        ))}
      </ul>
      <Paginacion anterior={anterior} siguiente={siguiente} />
    </div>
  );
}

/** Pantalla `/admin`, con una pestaña por área. */
export function Admin() {
  const [pestana, setPestana] = useState<Pestana>('partidas');
  return (
    <main className="pantalla admin">
      <h1>Administración</h1>
      <ListaPestanas pestanas={PESTANAS} activa={pestana} onElegir={setPestana} etiqueta="Secciones del panel" />
      <section id={`panel-${pestana}`} role="tabpanel" aria-labelledby={`pestana-${pestana}`}>
        {pestana === 'partidas' && <PanelPartidas />}
        {pestana === 'cuentas' && <PanelCuentas />}
        {pestana === 'ajustes' && <PanelAjustes />}
        {pestana === 'registro' && <PanelRegistro />}
      </section>
    </main>
  );
}
