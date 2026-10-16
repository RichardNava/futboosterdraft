import {
  autoAlineacion,
  FORMACIONES,
  FORMACIONES_IDS,
  PARAMETROS_V1,
  proponerLanzadores,
  type Alineacion as AlineacionDominio,
  type Equipaciones,
  type FormacionId,
  type Jugador,
  type Lanzadores,
  type Tactica,
} from '@fbd/domain';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, ErrorApi } from '../api/cliente';
import { CampoAlineacion, type CasillaVista } from '../componentes/CampoAlineacion';
import { AvisoPartido } from '../componentes/AvisoPartido';
import { CartaJugador, type CartaResumen } from '../componentes/CartaJugador';
import { DistintivoBaja, type BajaVista } from '../componentes/DistintivoBaja';
import { FichaJugador } from '../componentes/FichaJugador';
import { PanelTactica } from '../componentes/PanelTactica';

interface DatosEquipo {
  alineacion: AlineacionDominio;
  confirmada: boolean;
  version: number | null;
  previsualizacion: (CasillaVista & { jugadorId: number })[];
  plantilla: CartaResumen[];
  bajas: number[];
  bajasDetalle: BajaVista[];
  dorsales: Record<number, number> | null;
  equipaciones: Equipaciones | null;
}

const NOMBRE_FORMACION: Record<FormacionId, string> = Object.fromEntries(
  FORMACIONES_IDS.map((id) => [id, FORMACIONES[id].nombre]),
) as Record<FormacionId, string>;

/** Pantalla de alineación (T073; FR-025 a FR-031b). */
export function Alineacion() {
  const { partidaId } = useParams();
  const navegar = useNavigate();
  const [datos, setDatos] = useState<DatosEquipo | null>(null);
  const [formacion, setFormacion] = useState<FormacionId>('4-3-3');
  const [titulares, setTitulares] = useState<Record<string, number | undefined>>({});
  const [suplentes, setSuplentes] = useState<number[]>([]);
  const [tactica, setTactica] = useState<Tactica | null>(null);
  const [lanzadores, setLanzadores] = useState<Lanzadores | null>(null);
  const [prev, setPrev] = useState<Map<string, CasillaVista>>(new Map());
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string; motivos?: string[] } | null>(null);
  const [ficha, setFicha] = useState<number | null>(null);
  const [dorsalesEdit, setDorsalesEdit] = useState<Record<number, number>>({});
  const [equipaciones, setEquipaciones] = useState<Equipaciones | null>(null);

  const aplicarDatos = useCallback((d: DatosEquipo) => {
    setDatos(d);
    setFormacion(d.alineacion.formacion);
    setTitulares(Object.fromEntries(d.alineacion.titulares.map((t) => [t.casillaId, t.jugadorId])));
    setSuplentes(d.alineacion.suplentes);
    setTactica(d.alineacion.tactica);
    setLanzadores(d.alineacion.lanzadores);
    setPrev(new Map(d.previsualizacion.map((p) => [p.casillaId, p])));
    setDorsalesEdit(d.dorsales ?? {});
    setEquipaciones(d.equipaciones);
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
  const casillas = FORMACIONES[formacion].casillas;

  const alineacionActual = useCallback((): AlineacionDominio | null => {
    if (!tactica || !lanzadores) return null;
    return {
      formacion,
      titulares: casillas.flatMap((c) => (titulares[c.id] !== undefined ? [{ casillaId: c.id, jugadorId: titulares[c.id]! }] : [])),
      suplentes,
      tactica,
      lanzadores,
    };
  }, [formacion, casillas, titulares, suplentes, tactica, lanzadores]);

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

  // Previsualización en el servidor de los stats efectivos (con un pequeño retardo).
  const temporizador = useRef<number | undefined>(undefined);
  useEffect(() => {
    const a = alineacionActual();
    if (!a || !datos) return;
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => {
      api<{ previsualizacion: (CasillaVista & { jugadorId: number })[] }>(`/api/partidas/${partidaId}/alineacion/previsualizar`, { cuerpo: a })
        .then((r) => setPrev(new Map(r.previsualizacion.map((p) => [p.casillaId, p]))))
        .catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(temporizador.current);
  }, [alineacionActual, datos, partidaId]);

  // Con teclado: Escape cancela la selección de jugador (alternativa a arrastrar y soltar).
  useEffect(() => {
    if (seleccionado === null) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSeleccionado(null);
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [seleccionado]);

  const casillaDe = (jugadorId: number) => Object.entries(titulares).find(([, id]) => id === jugadorId)?.[0];

  const colocar = (casillaId: string, jugadorId: number) => {
    if (bajas.has(jugadorId)) return;
    const ocupante = titulares[casillaId];
    const origen = casillaDe(jugadorId);
    const nuevos = { ...titulares, [casillaId]: jugadorId };
    let banquillo = [...suplentes];
    if (origen) nuevos[origen] = ocupante;
    else if (banquillo.includes(jugadorId)) {
      banquillo = ocupante !== undefined ? banquillo.map((id) => (id === jugadorId ? ocupante : id)) : banquillo.filter((id) => id !== jugadorId);
    }
    setTitulares(nuevos);
    setSuplentes(banquillo);
    setSeleccionado(null);
  };

  const alBanquillo = (jugadorId: number) => {
    if (bajas.has(jugadorId) || suplentes.includes(jugadorId) || suplentes.length >= 7) return;
    const origen = casillaDe(jugadorId);
    if (origen) setTitulares({ ...titulares, [origen]: undefined });
    setSuplentes([...suplentes, jugadorId]);
    setSeleccionado(null);
  };

  const quitar = (jugadorId: number) => {
    const origen = casillaDe(jugadorId);
    if (origen) setTitulares({ ...titulares, [origen]: undefined });
    setSuplentes(suplentes.filter((id) => id !== jugadorId));
  };

  const cambiarFormacion = (f: FormacionId) => {
    if (!datos || !tactica) return;
    const a = autoAlineacion(datos.plantilla as unknown as Jugador[], bajas, PARAMETROS_V1, { formaciones: [f], tactica });
    setFormacion(f);
    setTitulares(Object.fromEntries(a.titulares.map((t) => [t.casillaId, t.jugadorId])));
    setSuplentes(a.suplentes);
    setLanzadores(a.lanzadores);
  };

  const confirmar = async () => {
    const a = alineacionActual();
    if (!a) return;
    setMensaje(null);
    try {
      const d = await api<DatosEquipo>(`/api/partidas/${partidaId}/alineacion`, { metodo: 'PUT', cuerpo: a });
      aplicarDatos(d);
      setMensaje({ tipo: 'ok', texto: `Alineación confirmada (versión ${d.version ?? 1}).` });
    } catch (e) {
      const motivos = e instanceof ErrorApi ? (e.detalles.motivos as string[] | undefined) : undefined;
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo confirmar', motivos });
    }
  };

  const guardarDorsales = async () => {
    try {
      const r = await api<{ dorsales: Record<number, number> }>(`/api/partidas/${partidaId}/dorsales`, { metodo: 'PUT', cuerpo: { dorsales: dorsalesEdit } });
      setDatos((d) => (d ? { ...d, dorsales: r.dorsales } : d));
      setMensaje({ tipo: 'ok', texto: 'Dorsales guardados.' });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudieron guardar los dorsales' });
    }
  };

  const guardarEquipaciones = async () => {
    if (!equipaciones) return;
    try {
      await api(`/api/partidas/${partidaId}/equipaciones`, { metodo: 'PUT', cuerpo: equipaciones });
      setDatos((d) => (d ? { ...d, equipaciones } : d));
      setMensaje({ tipo: 'ok', texto: 'Equipaciones guardadas.' });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudieron guardar las equipaciones' });
    }
  };

  if (!datos || !tactica || !lanzadores) {
    return <p className="cargando">{mensaje?.texto ?? 'Cargando alineación…'}</p>;
  }

  const enCampo = new Set(Object.values(titulares).filter((x): x is number => x !== undefined));
  const reserva = datos.plantilla.filter((j) => !enCampo.has(j.id) && !suplentes.includes(j.id));
  const porteroEnPorteria = titulares.POR !== undefined ? porId.get(titulares.POR!) : undefined;
  const titularesLista = [...enCampo].map((id) => porId.get(id)!).filter(Boolean);
  const colores = equipaciones?.primera ?? { principal: '#1f7a4d', secundario: '#ffffff' };
  const nombre = (id: number) => {
    const j = porId.get(id);
    return j ? `${datos.dorsales?.[id] ? `#${datos.dorsales[id]} ` : ''}${j.nombre} ${j.apellidos.split(' ')[0]}` : String(id);
  };

  return (
    <main className="pantalla alineacion">
      <header className="cabecera-fila">
        <h1>Alineación</h1>
        <Link className="boton secundario" to={`/partidas/${partidaId}/torneo`}>
          Torneo
        </Link>
        <label>
          Formación{' '}
          <select value={formacion} onChange={(e) => cambiarFormacion(e.target.value as FormacionId)}>
            {FORMACIONES_IDS.map((id) => (
              <option key={id} value={id}>
                {NOMBRE_FORMACION[id]}
              </option>
            ))}
          </select>
        </label>
      </header>

      {partidaId && <AvisoPartido partidaId={partidaId} />}
      {porteroEnPorteria && porteroEnPorteria.demarcacion !== 'POR' && (
        <p className="aviso" role="alert">
          Has puesto a un jugador de campo en la portería: sus stats bajan un 60 %.
        </p>
      )}
      {seleccionado !== null && (
        <p className="nota" role="status">
          Pulsa una casilla para colocar a {nombre(seleccionado)}, o «Al banquillo».{' '}
          <button type="button" className="secundario" onClick={() => alBanquillo(seleccionado)}>
            Al banquillo
          </button>{' '}
          <button type="button" className="secundario" onClick={() => setSeleccionado(null)}>
            Cancelar
          </button>
        </p>
      )}

      <div className="alineacion-rejilla">
        <CampoAlineacion
          casillas={casillas}
          titulares={titulares}
          jugadores={porId}
          previsualizacion={prev}
          dorsales={datos.dorsales}
          colores={colores}
          seleccionado={seleccionado}
          onSoltar={colocar}
          onPulsarCasilla={(casillaId) => {
            if (seleccionado !== null) colocar(casillaId, seleccionado);
            else if (titulares[casillaId] !== undefined) setSeleccionado(titulares[casillaId]!);
          }}
        />

        <div className="alineacion-lateral">
          <section
            aria-label="Banquillo"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => alBanquillo(Number(e.dataTransfer.getData('text/plain')))}
          >
            <h2>Banquillo ({suplentes.length}/7)</h2>
            <div className="lista-compacta">
              {suplentes.map((id) => (
                <div key={id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(id))}>
                  <CartaJugador jugador={porId.get(id)!} compacta dorsal={datos.dorsales?.[id]} onClick={() => setSeleccionado(id)} seleccionada={seleccionado === id} />
                  <button type="button" className="secundario mini" onClick={() => quitar(id)}>
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section aria-label="No convocados">
            <h2>Resto de la plantilla</h2>
            <div className="lista-compacta">
              {reserva.map((j) => (
                <div key={j.id} draggable={!bajas.has(j.id)} onDragStart={(e) => e.dataTransfer.setData('text/plain', String(j.id))}>
                  <CartaJugador
                    jugador={j}
                    compacta
                    dorsal={datos.dorsales?.[j.id]}
                    seleccionada={seleccionado === j.id}
                    onClick={bajas.has(j.id) ? undefined : () => setSeleccionado(j.id)}
                    onVerFicha={() => setFicha(j.id)}
                  />
                  {bajas.has(j.id) && <DistintivoBaja baja={detalleBaja.get(j.id)} />}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section aria-label="Táctica">
        <h2>Táctica</h2>
        <PanelTactica tactica={tactica} onCambiar={setTactica} />
      </section>

      <section aria-label="Lanzadores" className="lanzadores">
        <h2>Lanzadores</h2>
        {(
          [
            ['penaltis', 'Penaltis'],
            ['faltas', 'Faltas directas'],
            ['corners', 'Córners'],
          ] as const
        ).map(([tipo, texto]) => (
          <label key={tipo}>
            {texto}{' '}
            <select value={lanzadores[tipo]} onChange={(e) => setLanzadores({ ...lanzadores, [tipo]: Number(e.target.value) })}>
              {titularesLista.map((j) => (
                <option key={j.id} value={j.id}>
                  {nombre(j.id)}
                </option>
              ))}
            </select>
          </label>
        ))}
        <fieldset>
          <legend>Orden de la tanda de penaltis</legend>
          {lanzadores.tanda.map((id, i) => (
            <label key={i}>
              {i + 1}.{' '}
              <select
                value={id}
                onChange={(e) => {
                  const nuevo = Number(e.target.value);
                  const tanda = [...lanzadores.tanda];
                  const previo = tanda.indexOf(nuevo);
                  if (previo >= 0) tanda[previo] = tanda[i]!;
                  tanda[i] = nuevo;
                  setLanzadores({ ...lanzadores, tanda });
                }}
              >
                {titularesLista.map((j) => (
                  <option key={j.id} value={j.id}>
                    {nombre(j.id)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>
      </section>

      <div className="acciones">
        <button type="button" onClick={() => void confirmar()}>
          Confirmar alineación
        </button>
        <span className="nota">{datos.confirmada ? `Última confirmada: versión ${datos.version}` : 'Aún no has confirmado ninguna alineación.'}</span>
      </div>
      {mensaje && (
        <div className={mensaje.tipo === 'error' ? 'error' : 'exito'} role={mensaje.tipo === 'error' ? 'alert' : 'status'}>
          {mensaje.texto}
          {mensaje.motivos && mensaje.motivos.length > 1 && (
            <ul>
              {mensaje.motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <details className="seccion-plegable">
        <summary>Dorsales</summary>
        {!datos.dorsales && <p className="nota">Los dorsales se asignan al confirmar tu primer once; después puedes cambiarlos.</p>}
        <div className="rejilla-dorsales">
          {datos.plantilla.map((j) => (
            <label key={j.id}>
              <input
                type="number"
                min={1}
                max={99}
                value={dorsalesEdit[j.id] ?? ''}
                disabled={!datos.dorsales}
                onChange={(e) => setDorsalesEdit({ ...dorsalesEdit, [j.id]: Number(e.target.value) })}
              />{' '}
              {j.nombre} {j.apellidos.split(' ')[0]}
            </label>
          ))}
        </div>
        <button type="button" className="secundario" disabled={!datos.dorsales} onClick={() => void guardarDorsales()}>
          Guardar dorsales
        </button>
      </details>

      {equipaciones && (
        <details className="seccion-plegable">
          <summary>Equipaciones</summary>
          <div className="equipaciones">
            {(['primera', 'segunda'] as const).map((cual) => (
              <fieldset key={cual}>
                <legend>{cual === 'primera' ? 'Primera equipación' : 'Segunda equipación'}</legend>
                <span className="chapa grande" style={{ background: equipaciones[cual].principal, color: equipaciones[cual].secundario }}>
                  10
                </span>
                <label>
                  Principal{' '}
                  <input
                    type="color"
                    value={equipaciones[cual].principal}
                    onChange={(e) => setEquipaciones({ ...equipaciones, [cual]: { ...equipaciones[cual], principal: e.target.value } })}
                  />
                </label>
                <label>
                  Secundario{' '}
                  <input
                    type="color"
                    value={equipaciones[cual].secundario}
                    onChange={(e) => setEquipaciones({ ...equipaciones, [cual]: { ...equipaciones[cual], secundario: e.target.value } })}
                  />
                </label>
              </fieldset>
            ))}
          </div>
          <button type="button" className="secundario" onClick={() => void guardarEquipaciones()}>
            Guardar equipaciones
          </button>
        </details>
      )}
      {ficha !== null && <FichaJugador jugadorId={ficha} onCerrar={() => setFicha(null)} />}
    </main>
  );
}
