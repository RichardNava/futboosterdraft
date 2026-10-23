import {
  FORMACIONES,
  FORMACIONES_IDS,
  parametrosActuales,
  proponerLanzadores,
  validarAlineacion,
  type Alineacion as AlineacionDominio,
  type Equipaciones,
  type FormacionId,
  type Jugador,
  type Lanzadores,
  type Posicion,
  type Tactica,
} from '@fbd/domain';
import { coloresDe } from '../componentes/colores';
import { EditorEquipacion, equipacionesParecidas } from '../componentes/EditorEquipacion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, ErrorApi } from '../api/cliente';
import { BarraPrincipal, type AccionBarra } from '../componentes/BarraPrincipal';
import { CampoEquipo } from '../componentes/CampoEquipo';
import { cambiarFormacion as cambiarFormacionCampo, colocacionDe, mover, RADIO_FICHA, soltar, type DestinoSoltar, type EstadoCampo } from '../componentes/campoEquipoEstado';
import { EditorDorsales } from '../componentes/EditorDorsales';
import { EditorLanzadores } from '../componentes/EditorLanzadores';
import type { CartaResumen } from '../componentes/CartaJugador';
import { DistintivoBaja, type BajaVista } from '../componentes/DistintivoBaja';
import { PanelTactica } from '../componentes/PanelTactica';
import { mostrarAviso } from '../estado/avisos';
import { PantallaCargando } from '../componentes/Esqueleto';
import { Aviso } from '../componentes/Aviso';
import { Dialogo } from '../componentes/Dialogo';
import { Insignia } from '../componentes/Insignia';

export interface CasillaVista {
  casillaId: string;
  media: number;
  fueraDePosicion: boolean;
  penalizacion: number;
}

interface DatosEquipo {
  alineacion: AlineacionDominio;
  confirmada: boolean;
  version: number | null;
  previsualizacion: { titulares: (CasillaVista & { jugadorId: number })[] };
  plantilla: CartaResumen[];
  bajas: number[];
  bajasDetalle: BajaVista[];
  dorsales: Record<number, number> | null;
  equipaciones: Equipaciones | null;
  /** Spec 003, FR-042: nombre del equipo, editable hasta que se abre el primer partido. */
  nombreEquipo?: string;
  nombreEditable?: boolean;
  /** Modo Duelo de jugadores (spec 005, FR-063, FR-063a): once único en la formación común, confirmado una vez. */
  soloTitulares?: true;
  formacionFija?: FormacionId;
  bloqueada?: boolean;
}

const NOMBRE_FORMACION: Record<FormacionId, string> = Object.fromEntries(
  FORMACIONES_IDS.map((id) => [id, FORMACIONES[id].nombre]),
) as Record<FormacionId, string>;

const P = parametrosActuales();

/** Forma canónica de una alineación, para saber si hay cambios sin confirmar (sin depender del orden de claves). */
function firma(a: AlineacionDominio | null): string {
  if (!a) return '';
  const ordenar = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(ordenar) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y)).map(([k, x]) => [k, ordenar(x)])) : v;
  return JSON.stringify(
    ordenar({
      ...a,
      titulares: [...a.titulares].sort((x, y) => x.casillaId.localeCompare(y.casillaId)),
      colocacion: [...(a.colocacion ?? [])].sort((x, y) => x.jugadorId - y.jugadorId),
    }),
  );
}

function estadoDesde(a: AlineacionDominio): EstadoCampo {
  return {
    formacion: a.formacion,
    asignacion: Object.fromEntries(a.titulares.map((t) => [t.casillaId, t.jugadorId])),
    puntos: Object.fromEntries((a.colocacion ?? []).map((c) => [c.jugadorId, { x: c.x, y: c.y }])),
    banquillo: [...a.suplentes],
  };
}

/**
 * «Formación» (spec 003, US2; FR-001 a FR-003): un único campo con titulares, banquillo y resto de la plantilla,
 * donde se eligen titulares, se intercambian y se coloca libremente. La carta completa aparece al pasar el cursor
 * o mantener pulsado. El botón principal es siempre «Confirmar alineación», que guarda y lleva al torneo, donde está la
 * preparación del partido con el modo y «Comenzar partido» (FR-003b, FR-032).
 */
export function Alineacion() {
  const { partidaId } = useParams();
  const navegar = useNavigate();
  const [datos, setDatos] = useState<DatosEquipo | null>(null);
  const [campo, setCampo] = useState<EstadoCampo | null>(null);
  const [tactica, setTactica] = useState<Tactica | null>(null);
  const [lanzadores, setLanzadores] = useState<Lanzadores | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'error'; texto: string; motivos?: string[] } | null>(null);
  const [equipaciones, setEquipaciones] = useState<Equipaciones | null>(null);
  const [nombreEquipo, setNombreEquipo] = useState('');
  /** Cambio de formación pendiente de confirmar (FR-002a). */
  const [formacionPendiente, setFormacionPendiente] = useState<FormacionId | null>(null);
  /** Diálogo «Confirmar once» del modo duelos. */
  const [confirmandoOnce, setConfirmandoOnce] = useState(false);

  const aplicarDatos = useCallback((d: DatosEquipo) => {
    setDatos(d);
    setCampo(estadoDesde(d.alineacion));
    setTactica(d.alineacion.tactica);
    setLanzadores(d.alineacion.lanzadores);
    setEquipaciones(d.equipaciones);
    setNombreEquipo(d.nombreEquipo ?? '');
  }, []);

  useEffect(() => {
    api<DatosEquipo>(`/api/partidas/${partidaId}/alineacion`)
      .then(aplicarDatos)
      .catch((e: unknown) => {
        if (e instanceof ErrorApi && e.codigo === 'DRAFT_EN_CURSO') navegar(`/partidas/${partidaId}/draft`, { replace: true });
        else setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo cargar la alineación' });
      });
  }, [partidaId, aplicarDatos, navegar]);

  const porId = useMemo(() => new Map((datos?.plantilla ?? []).map((j) => [j.id, j])), [datos]);
  const bajas = useMemo(() => new Set(datos?.bajas ?? []), [datos]);
  const detalleBaja = useMemo(() => new Map((datos?.bajasDetalle ?? []).map((b) => [b.jugadorId, b])), [datos]);
  const posicionesDe = useCallback((id: number) => (porId.get(id)?.posicion ?? []) as Posicion[], [porId]);
  const opcionesCampo = useMemo(() => ({ parametros: P, radioFicha: RADIO_FICHA, posicionesDe, bloqueados: bajas }), [posicionesDe, bajas]);

  const alineacionActual = useCallback((): AlineacionDominio | null => {
    if (!tactica || !lanzadores || !campo) return null;
    const lista = FORMACIONES[campo.formacion].casillas.flatMap((c) => (campo.asignacion[c.id] !== undefined ? [{ casillaId: c.id, jugadorId: campo.asignacion[c.id]! }] : []));
    const colocacion = lista.flatMap((t) => (campo.puntos[t.jugadorId] ? [{ jugadorId: t.jugadorId, ...campo.puntos[t.jugadorId]! }] : []));
    return { formacion: campo.formacion, titulares: lista, suplentes: campo.banquillo, tactica, lanzadores, ...(colocacion.length ? { colocacion } : {}) };
  }, [campo, tactica, lanzadores]);

  // Colocación calculada al instante en el cliente con el mismo dominio que el servidor (002/SC-016).
  const resultadoColocacion = useMemo(() => (campo ? colocacionDe(campo, P, posicionesDe) : null), [campo, posicionesDe]);
  const titulares = campo?.asignacion ?? {};

  // Los lanzadores deben ser titulares: si alguno deja de serlo, se vuelven a proponer (FR-029a).
  useEffect(() => {
    if (!lanzadores) return;
    const enCampo = new Set(Object.values(titulares).filter((x): x is number => x !== undefined));
    const valido =
      [lanzadores.penaltis, lanzadores.faltas, lanzadores.corners].every((id) => enCampo.has(id)) &&
      lanzadores.tanda.every((id) => enCampo.has(id)) &&
      lanzadores.tanda.length === Math.min(5, enCampo.size);
    if (!valido) setLanzadores(proponerLanzadores([...enCampo].map((id) => porId.get(id) as unknown as Jugador)));
  }, [titulares, lanzadores, porId]);

  const cambiarFormacion = (f: FormacionId, confirmado = false) => {
    if (!datos || !campo) return;
    const r = cambiarFormacionCampo(campo, f, datos.plantilla as unknown as Jugador[], P);
    if (r.requiereConfirmacion && !confirmado) {
      setFormacionPendiente(f);
      return;
    }
    setFormacionPendiente(null);
    setCampo(r.estado);
  };

  // En el modo duelos no hay colocación libre: solo se cambia quién ocupa cada casilla, y con el once bloqueado, nada.
  const duelos = datos?.soloTitulares === true;
  const bloqueada = datos?.bloqueada === true;
  const alSoltar = (jugadorId: number, destino: DestinoSoltar) =>
    setCampo((c) => {
      if (!c || bloqueada) return c;
      const n = soltar(c, jugadorId, destino, opcionesCampo);
      return duelos ? { ...n, puntos: {} } : n;
    });
  const alMover = (jugadorId: number, dx: number, dy: number) => setCampo((c) => (c && !duelos ? mover(c, jugadorId, dx, dy, opcionesCampo) : c));

  const confirmar = async () => {
    const a = alineacionActual();
    if (!a) return;
    setMensaje(null);
    try {
      const d = await api<DatosEquipo>(`/api/partidas/${partidaId}/alineacion`, { metodo: 'PUT', cuerpo: a });
      aplicarDatos(d);
      mostrarAviso('exito', 'Alineación confirmada');
      return d;
    } catch (e) {
      const motivos = e instanceof ErrorApi ? (e.detalles.motivos as string[] | undefined) : undefined;
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo confirmar', motivos });
    }
  };

  const asignarDorsal = async (jugadorId: number, dorsal: number) => {
    const r = await api<{ dorsales: Record<number, number> }>(`/api/partidas/${partidaId}/dorsales`, { metodo: 'PUT', cuerpo: { jugadorId, dorsal } });
    setDatos((d) => (d ? { ...d, dorsales: r.dorsales } : d));
    mostrarAviso('exito', 'Dorsal cambiado');
  };

  const guardarNombre = async () => {
    try {
      const r = await api<{ nombreEquipo: string }>(`/api/partidas/${partidaId}/nombre-equipo`, { metodo: 'PUT', cuerpo: { nombre: nombreEquipo } });
      setNombreEquipo(r.nombreEquipo);
      setDatos((d) => (d ? { ...d, nombreEquipo: r.nombreEquipo } : d));
      mostrarAviso('exito', 'Nombre guardado');
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo guardar el nombre' });
    }
  };

  const guardarEquipaciones = async () => {
    if (!equipaciones || equipacionesParecidas(equipaciones)) return;
    try {
      await api(`/api/partidas/${partidaId}/equipaciones`, { metodo: 'PUT', cuerpo: equipaciones });
      setDatos((d) => (d ? { ...d, equipaciones } : d));
      mostrarAviso('exito', 'Equipaciones guardadas');
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudieron guardar las equipaciones' });
    }
  };

  if (!datos || !tactica || !lanzadores || !campo || !resultadoColocacion) {
    if (mensaje?.tipo === 'error')
      return (
        <main className="pantalla">
          <Aviso tipo="error">
            <p>{mensaje.texto}</p>
          </Aviso>
        </main>
      );
    return <PantallaCargando forma="campo" texto="Cargando la alineación…" />;
  }

  const enCampo = new Set(Object.values(titulares).filter((x): x is number => x !== undefined));
  const reserva = datos.plantilla.filter((j) => !enCampo.has(j.id) && !campo.banquillo.includes(j.id)).map((j) => j.id);
  const porteroEnPorteria = titulares.POR !== undefined ? porId.get(titulares.POR!) : undefined;
  const titularesLista = [...enCampo].map((id) => porId.get(id)!).filter(Boolean);
  // Sin equipaciones guardadas, una por defecto.
  const colores = equipaciones ? coloresDe(equipaciones.primera) : { principal: '#1f7a4d', secundario: '#ffffff' }; // lint-tokens: datos de equipación
  const nombre = (id: number) => {
    const j = porId.get(id);
    return j ? `${datos.dorsales?.[id] ? `#${datos.dorsales[id]} ` : ''}${j.nombre} ${j.apellidos.split(' ')[0]}` : String(id);
  };
  const distintivos = new Map([...bajas].map((id) => [id, <DistintivoBaja key={id} baja={detalleBaja.get(id)} />]));

  // Motivo por el que no se puede confirmar (FR-007): la primera regla de alineación que no se cumple.
  const actual = alineacionActual();
  const errores = actual ? validarAlineacion(actual, datos.plantilla.map((j) => j.id), bajas) : [];
  const motivo = errores[0]?.motivos?.[0] ?? errores[0]?.mensaje ?? null;
  const sinCambios = firma(datos.alineacion) === firma(actual);
  const confirmada = sinCambios && datos.confirmada;
  // «Confirmar alineación» guarda y vuelve al torneo, donde se prepara el partido (FR-003b).
  const principal: AccionBarra | null = duelos
    ? bloqueada
      ? null
      : { etiqueta: 'Confirmar once', onClick: () => setConfirmandoOnce(true), motivoDesactivado: motivo ? `No se puede confirmar: ${motivo}` : null }
    : {
        etiqueta: 'Confirmar alineación',
        onClick: async () => {
          if (await confirmar()) navegar(`/partidas/${partidaId}/torneo`);
        },
        motivoDesactivado: motivo ? `No se puede confirmar: ${motivo}` : null,
      };

  return (
    <main className="pantalla alineacion">
      <header className="cabecera-fila">
        <h1>Formación</h1>
        <Link className="boton secundario" to={`/partidas/${partidaId}/torneo`}>
          Torneo
        </Link>
        {duelos ? (
          <p className="formacion-fija">
            Formación <strong>{NOMBRE_FORMACION[campo.formacion]}</strong> <span className="nota">(la elige el anfitrión para todos)</span>
            {bloqueada && <Insignia texto="Once confirmado" />}
          </p>
        ) : (
          <label>
            Formación{' '}
            <select value={campo.formacion} onChange={(e) => cambiarFormacion(e.target.value as FormacionId)}>
              {FORMACIONES_IDS.map((id) => (
                <option key={id} value={id}>
                  {NOMBRE_FORMACION[id]}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {porteroEnPorteria && porteroEnPorteria.demarcacion !== 'POR' && (
        <Aviso tipo="advertencia" rol="alert">
          <p>Has puesto a un jugador de campo en la portería: sus stats bajan un 60 %.</p>
        </Aviso>
      )}

      <p className="nota">
        {duelos
          ? bloqueada
            ? 'Este es tu once para todo el torneo. Cada jugador se enfrenta en un duelo al rival de su misma casilla.'
            : 'Elige tu once: arrastra a los jugadores de la plantilla a cada casilla. Cada uno se enfrentará en un duelo al rival de su misma casilla.'
          : 'Arrastra a los jugadores para elegir titulares, intercambiarlos o colocarlos donde quieras; o selecciónalos con Intro y muévelos con las flechas.'}{' '}
        Pasa el cursor (o mantén pulsado) sobre una ficha para ver su carta.
      </p>
      <CampoEquipo
        estado={campo}
        colocacion={resultadoColocacion}
        jugadores={porId}
        parametros={P}
        dorsales={datos.dorsales}
        colores={colores}
        modo="preparacion"
        reserva={reserva}
        bloqueados={bajas}
        distintivos={distintivos}
        sinBanquillo={duelos}
        onSoltar={alSoltar}
        onMover={alMover}
      />

      {!duelos && (
      <div className="colocacion-resumen" aria-live="polite">
        <p>
          <strong>
            {resultadoColocacion.personalizada
              ? `Formación personalizada (${campo.formacion} → ${resultadoColocacion.reparto.defensa}-${resultadoColocacion.reparto.medio}-${resultadoColocacion.reparto.ataque})`
              : `Formación ${NOMBRE_FORMACION[campo.formacion]}`}
          </strong>{' '}
          · Ofensividad {resultadoColocacion.ofensividad > 0 ? '+' : ''}
          {resultadoColocacion.ofensividad} · Amplitud {resultadoColocacion.amplitud > 0 ? '+' : ''}
          {resultadoColocacion.amplitud}
        </p>
        {resultadoColocacion.avisos.length > 0 && (
          <ul className="avisos-colocacion" role="status" aria-label="Avisos de la colocación">
            {resultadoColocacion.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
        {Object.keys(campo.puntos).length > 0 && (
          <button type="button" className="secundario" onClick={() => setCampo({ ...campo, puntos: {} })}>
            Volver a la formación
          </button>
        )}
      </div>
      )}

      {mensaje && (
        <Aviso tipo="error">
          <p>{mensaje.texto}</p>
          {mensaje.motivos && mensaje.motivos.length > 1 && (
            <ul>
              {mensaje.motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </Aviso>
      )}

      {!duelos && (
        <>
      <details className="seccion-plegable" open>
        <summary>Táctica</summary>
        <section aria-label="Táctica">
          <PanelTactica tactica={tactica} onCambiar={setTactica} />
        </section>
      </details>

      <details className="seccion-plegable" open>
        <summary>Lanzadores</summary>
        <EditorLanzadores lanzadores={lanzadores} titulares={titularesLista} nombre={nombre} onCambiar={setLanzadores} conTitulo={false} />
      </details>

      <details className="seccion-plegable">
        <summary>Dorsales</summary>
        <EditorDorsales plantilla={datos.plantilla} dorsales={datos.dorsales} asignar={asignarDorsal} />
      </details>
        </>
      )}

      <details className="seccion-plegable">
        <summary>Nombre del equipo</summary>
        {datos.nombreEditable ? (
          <div className="campo-nombre">
            <label>
              Nombre del equipo{' '}
              <input value={nombreEquipo} maxLength={40} onChange={(e) => setNombreEquipo(e.target.value)} />
            </label>
            <button type="button" className="secundario" onClick={() => void guardarNombre()}>
              Guardar nombre
            </button>
          </div>
        ) : (
          <p>
            <strong>{datos.nombreEquipo}</strong> <span className="nota">(ya no se puede cambiar: el torneo ha empezado)</span>
          </p>
        )}
      </details>

      {equipaciones && !duelos && (
        <details className="seccion-plegable">
          <summary>Equipaciones</summary>
          <EditorEquipacion equipaciones={equipaciones} onChange={setEquipaciones} />
          <button type="button" className="secundario" aria-disabled={equipacionesParecidas(equipaciones) || undefined} onClick={() => void guardarEquipaciones()}>
            Guardar equipaciones
          </button>
        </details>
      )}
      {formacionPendiente && (
        <Dialogo rol="alertdialog" etiquetadoPor="titulo-cambio-formacion" alEscape={() => setFormacionPendiente(null)}>
          <p id="titulo-cambio-formacion">Se perderá la colocación personalizada. ¿Cambiar de formación?</p>
          <div className="acciones">
            <button type="button" className="secundario" onClick={() => cambiarFormacion(formacionPendiente, true)}>
              Cambiar
            </button>
            <button type="button" className="texto" onClick={() => setFormacionPendiente(null)}>
              Cancelar
            </button>
          </div>
        </Dialogo>
      )}
      {confirmandoOnce && (
        <Dialogo rol="alertdialog" etiquetadoPor="titulo-confirmar-once" alEscape={() => setConfirmandoOnce(false)}>
          <p id="titulo-confirmar-once">Este será tu once para todo el torneo. No podrás cambiarlo.</p>
          <div className="acciones">
            <button
              type="button"
              className="principal"
              onClick={async () => {
                setConfirmandoOnce(false);
                if (await confirmar()) navegar(`/partidas/${partidaId}/torneo`);
              }}
            >
              Confirmar
            </button>
            <button type="button" className="texto" onClick={() => setConfirmandoOnce(false)}>
              Seguir editando
            </button>
          </div>
        </Dialogo>
      )}
      <BarraPrincipal
        principal={principal}
        estado={
          duelos
            ? bloqueada
              ? 'Once confirmado para todo el torneo.'
              : 'Aún no has confirmado tu once.'
            : datos.confirmada
              ? `Última confirmada: versión ${datos.version}${confirmada ? '' : ' · hay cambios sin confirmar'}`
              : 'Aún no has confirmado ninguna alineación.'
        }
      />
    </main>
  );
}
