import { CaraEnergia, TRAMOS_ENERGIA } from './IndicadorEnergia';
import { nombreCartaDe } from './CartaJugador';
import { FORMACIONES, FORMACIONES_IDS, parametrosActuales, validarTactica, type FormacionId, type Lanzadores, type Posicion, type Tactica } from '@fbd/domain';
import { useCallback, useMemo, useState } from 'react';
import { BarraPrincipal } from './BarraPrincipal';
import { CampoEquipo } from './CampoEquipo';
import { cambiarFormacion, colocacionDe, mover, RADIO_FICHA, soltar, titularesDe, type DestinoSoltar, type EstadoCampo } from './campoEquipoEstado';
import type { CartaResumen } from './CartaJugador';
import { EditorLanzadores } from './EditorLanzadores';
import { Icono } from './Icono';
import type { EstadoEquipo } from './estadoEquipoEnPartido';
import { PanelTactica } from './PanelTactica';
import { Dialogo } from './Dialogo';
import { ListaPestanas } from './ListaPestanas';
import { useDistribucion } from './useDistribucion';
import { mostrarAviso } from '../estado/avisos';
import type { ConexionPartida } from '../conexion/ws';

/** Sin «Personalización»: en el partido solo se cambia lo que afecta al juego (spec 012, FR-017). */
type PestanaGestion = 'alineacion' | 'tactica' | 'lanzadores';
const PESTANAS_GESTION: { id: PestanaGestion; texto: string }[] = [
  { id: 'alineacion', texto: 'Alineación' },
  { id: 'tactica', texto: 'Táctica' },
  { id: 'lanzadores', texto: 'Lanzadores' },
];

const P = parametrosActuales();

/** Envía un lote de decisiones del partido; si el servidor lo acepta, llama a `alAceptar` (para marcarlas en espera). */
export async function enviarLoteDecisiones(conexion: ConexionPartida | null, partidoId: string, decisiones: DecisionGestion[], alAceptar: () => void) {
  if (!conexion) throw new Error('Sin conexión');
  const ack = await conexion.enviar({ t: 'partido.decisiones', partidoId, decisiones });
  if (ack.ok) alAceptar();
  return ack;
}

export interface DecisionGestion {
  tipo: 'sustitucion' | 'formacion' | 'recolocacion' | 'tactica' | 'lanzadores';
  datos: Record<string, unknown>;
}

interface Borrador {
  campo: EstadoCampo;
  tactica: Tactica;
  lanzadores: Lanzadores | null;
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Decisiones que llevan del estado inicial al borrador (spec 003, research R17), en este orden: sustituciones
 * (suplente sobre titular), formación con su asignación y colocación (o recolocación si no cambia la formación),
 * táctica y lanzadores. El servidor las valida en este orden, todas o ninguna.
 */
function decisionesDeCambios(inicial: Borrador, final: Borrador): DecisionGestion[] {
  const decisiones: DecisionGestion[] = [];
  const antes = titularesDe(inicial.campo);
  const despues = titularesDe(final.campo);
  const idsAntes = new Set(antes.map((t) => t.jugadorId));
  const idsDespues = new Set(despues.map((t) => t.jugadorId));
  const entran = despues.filter((t) => !idsAntes.has(t.jugadorId));
  const salen = antes.filter((t) => !idsDespues.has(t.jugadorId));
  // Cada uno que entra sustituye al que ocupaba su casilla (si salió); si no, a otro de los que salen.
  const pendientes = [...salen];
  const pares: [number, number][] = [];
  for (const e of entran) {
    const i = pendientes.findIndex((x) => x.casillaId === e.casillaId);
    const sale = pendientes.splice(i >= 0 ? i : 0, 1)[0];
    if (!sale) continue;
    pares.push([sale.jugadorId, e.jugadorId]);
    decisiones.push({ tipo: 'sustitucion', datos: { sale: sale.jugadorId, entra: e.jugadorId } });
  }
  // Lo que deja el motor tras las sustituciones: el que entra, en la casilla y el punto del que sale.
  const porSale = new Map(pares);
  const tras = antes.map((t) => ({ casillaId: t.casillaId, jugadorId: porSale.get(t.jugadorId) ?? t.jugadorId }));
  const puntosTras = Object.fromEntries(Object.entries(inicial.campo.puntos).map(([id, p]) => [porSale.get(Number(id)) ?? Number(id), p]));
  const ordenar = (xs: { casillaId: string; jugadorId: number }[]) => [...xs].sort((x, y) => x.casillaId.localeCompare(y.casillaId));
  const colocacion = despues.flatMap((t) => (final.campo.puntos[t.jugadorId] ? [{ jugadorId: t.jugadorId, ...final.campo.puntos[t.jugadorId]! }] : []));
  if (final.campo.formacion !== inicial.campo.formacion) {
    decisiones.push({ tipo: 'formacion', datos: { formacion: final.campo.formacion, asignacion: despues, ...(colocacion.length ? { colocacion } : {}) } });
  } else if (!igual(ordenar(tras), ordenar(despues)) || !igual(ordenarClaves(puntosTras), ordenarClaves(final.campo.puntos))) {
    decisiones.push({ tipo: 'recolocacion', datos: { asignacion: despues, ...(colocacion.length ? { colocacion } : {}) } });
  }
  if (!igual(inicial.tactica, final.tactica)) decisiones.push({ tipo: 'tactica', datos: { tactica: final.tactica } });
  if (final.lanzadores && !igual(inicial.lanzadores, final.lanzadores)) decisiones.push({ tipo: 'lanzadores', datos: { lanzadores: final.lanzadores } });
  return decisiones;
}

const ordenarClaves = (o: Record<number, unknown>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => Number(a) - Number(b)));

interface Props {
  estado: EstadoEquipo;
  jugadores: Map<number, CartaResumen>;
  dorsales: Record<number, number> | null;
  colores: { principal: string; secundario: string };
  /** Envía el lote `partido.decisiones`; devuelve el `ack`. */
  enviar: (decisiones: DecisionGestion[]) => Promise<{ ok: boolean; error?: { mensaje?: string; indice?: number } }>;
  /** Se cierra la pantalla; `aplicado` si se confirmaron cambios. */
  onCerrar: (aplicado: boolean) => void;
  /** Parada de «control total» (spec 012): qué ha pasado y cuántos cambios quedan. */
  aviso?: string | null;
  /** Lesionados de la parada (ronda 5): no se sigue sin sustituirlos mientras queden cambios y suplentes. */
  lesionadosParada?: ReadonlySet<number>;
  /** Resultado y minuto del partido en la 2D (ronda 5): al llegar en una parada, se sabe qué ha pasado. */
  marcador?: string | null;
  /** Spec 014 (FR-016): energía de los jugadores en el campo, del mensaje de la pausa. */
  energia?: ReadonlyMap<number, { energia: number; penalizacion: number }>;
}

/**
 * Gestión del equipo durante el partido (spec 003, US5; FR-027 a FR-031; contracts/ui.md): a pantalla completa,
 * sobre el mismo campo de «Formación», con el banquillo, el contador de sustituciones, la táctica y los
 * lanzadores. Nada se envía hasta «Confirmar cambios», que manda todo en un lote atómico.
 *
 * Spec 012 (FR-015 a FR-017): la misma mesa que Formación (`useDistribucion`, pestañas fijas sobre el lateral), con
 * solo los titulares y el banquillo convocado, y sin «Personalización».
 */
export function GestionEquipo({ estado, jugadores, dorsales, colores, enviar, onCerrar, aviso = null, lesionadosParada = SIN_LESIONADOS, marcador = null, energia }: Props) {
  const inicial = useMemo<Borrador>(
    () => ({ campo: { formacion: estado.formacion, asignacion: { ...estado.asignacion }, puntos: { ...estado.puntos }, banquillo: [...estado.banquillo] }, tactica: estado.tactica, lanzadores: estado.lanzadores }),
    [estado],
  );
  const [borrador, setBorrador] = useState<Borrador>(inicial);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [formacionPendiente, setFormacionPendiente] = useState<FormacionId | null>(null);
  const [pestana, setPestana] = useState<PestanaGestion>('alineacion');
  const [ayudaEnergia, setAyudaEnergia] = useState(false);
  const distribucion = useDistribucion();

  const posicionesDe = useCallback((id: number) => (jugadores.get(id)?.posicion ?? []) as Posicion[], [jugadores]);
  // Los lesionados también: desde «No disponibles» no se pueden llevar al campo (el de la parada sigue en su casilla).
  const bloqueados = useMemo(() => new Set([...estado.sustituidos, ...estado.expulsados, ...estado.lesionados]), [estado]);
  const opciones = useMemo(() => ({ parametros: P, radioFicha: RADIO_FICHA, posicionesDe, bloqueados }), [posicionesDe, bloqueados]);
  const colocacion = useMemo(() => colocacionDe(borrador.campo, P, posicionesDe), [borrador.campo, posicionesDe]);
  const decisiones = decisionesDeCambios(inicial, borrador);
  const sustituciones = decisiones.filter((d) => d.tipo === 'sustitucion').length;
  const restantes = estado.sustitucionesRestantes - sustituciones;
  const hayCambios = decisiones.length > 0;
  // Ronda 5: en «control total», el lesionado de la parada lo cambia el participante, no el entrenador automático.
  const enCampo = new Set(Object.values(borrador.campo.asignacion));
  const noDisponibles = [...bloqueados].filter((id) => !enCampo.has(id) && !borrador.campo.banquillo.includes(id));
  const lesionadosSinCambiar = [...lesionadosParada].filter((id) => enCampo.has(id));
  const suplentesLibres = borrador.campo.banquillo.some((id) => !bloqueados.has(id) && !estado.lesionados.has(id) && !lesionadosParada.has(id));
  const debeSustituir = lesionadosSinCambiar.length > 0 && restantes > 0 && suplentesLibres;
  const conUnoMenos = lesionadosSinCambiar.length > 0 && !debeSustituir;
  const motivoSustituir = debeSustituir ? 'Sustituye al lesionado para seguir' : null;

  const alSoltar = (jugadorId: number, destino: DestinoSoltar) => {
    const nuevo = soltar(borrador.campo, jugadorId, destino, opciones);
    if (decisionesDeCambios(inicial, { ...borrador, campo: nuevo }).filter((d) => d.tipo === 'sustitucion').length > estado.sustitucionesRestantes) {
      setMensaje(`Ya has hecho las ${estado.sustitucionesUsadas + estado.sustitucionesRestantes} sustituciones`);
      return;
    }
    setMensaje(null);
    setBorrador({ ...borrador, campo: nuevo });
  };
  const alMover = (jugadorId: number, dx: number, dy: number) => setBorrador({ ...borrador, campo: mover(borrador.campo, jugadorId, dx, dy, opciones) });
  const elegirFormacion = (f: FormacionId, confirmado = false) => {
    const plantilla = titularesDe(borrador.campo).map((t) => jugadores.get(t.jugadorId)!).filter(Boolean);
    const r = cambiarFormacion(borrador.campo, f, plantilla as never, P);
    if (r.requiereConfirmacion && !confirmado) {
      setFormacionPendiente(f);
      return;
    }
    setFormacionPendiente(null);
    setBorrador({ ...borrador, campo: r.estado });
  };

  const confirmar = async () => {
    if (!hayCambios) return onCerrar(false);
    const ack = await enviar(decisiones);
    if (ack.ok) {
      mostrarAviso('exito', 'Cambios confirmados');
      return onCerrar(true);
    }
    const fallida = ack.error?.indice !== undefined ? decisiones[ack.error.indice] : undefined;
    setMensaje(`${ack.error?.mensaje ?? 'No se pudieron aplicar los cambios'}${fallida ? ` (${ETIQUETA_DECISION[fallida.tipo]})` : ''}`);
  };
  const volver = () => (hayCambios ? setConfirmarSalida(true) : onCerrar(false));

  const titulares = titularesDe(borrador.campo).map((t) => jugadores.get(t.jugadorId)!).filter(Boolean);
  const pestanas = PESTANAS_GESTION.filter((p) => p.id !== 'lanzadores' || borrador.lanzadores !== null);
  const nombre = (id: number) => {
    const j = jugadores.get(id);
    return j ? `${dorsales?.[id] ? `#${dorsales[id]} ` : ''}${nombreCartaDe(j)}` : String(id);
  };
  const distintivos = new Map<number, React.ReactNode>();
  for (const [id, n] of estado.amarillas)
    distintivos.set(
      id,
      <span className="distintivo amarilla">
        <Icono nombre="amarilla" etiqueta={`${n} amarilla${n > 1 ? 's' : ''}`} className="icono-amarilla" />
        {n > 1 ? `×${n}` : ''}
      </span>,
    );
  for (const id of estado.expulsados)
    distintivos.set(
      id,
      <span className="distintivo roja">
        <Icono nombre="roja" etiqueta="Expulsado" className="icono-roja" />
      </span>,
    );
  for (const id of estado.sustituidos)
    distintivos.set(
      id,
      <span className="distintivo sustituido">
        <Icono nombre="cambio" etiqueta="Sustituido" />
      </span>,
    );
  for (const id of estado.lesionados)
    distintivos.set(
      id,
      <span className="distintivo lesion">
        <Icono nombre="lesion" etiqueta="Lesionado" />
      </span>,
    );

  return (
    <div className="gestion-equipo" role="dialog" aria-modal="true" aria-labelledby="titulo-gestion" data-testid="gestion-equipo">
      <header className="cabecera-fila">
        <h1 id="titulo-gestion">Gestionar equipo</h1>
        {marcador && (
          <p className="marcador-gestion" data-testid="marcador-gestion">
            {marcador}
          </p>
        )}
        {pestana === 'alineacion' && (
          <button type="button" className="texto boton-ayuda-energia" aria-label="Ayuda: energía de los jugadores" title="Energía de los jugadores" onClick={() => setAyudaEnergia(true)}>
            ?
          </button>
        )}
        <p className="contador-sustituciones" aria-live="polite">
          Sustituciones restantes: <strong>{restantes}</strong>
        </p>
        <label>
          Formación{' '}
          <select value={borrador.campo.formacion} onChange={(e) => elegirFormacion(e.target.value as FormacionId)}>
            {FORMACIONES_IDS.map((id) => (
              <option key={id} value={id}>
                {FORMACIONES[id].nombre}
              </option>
            ))}
          </select>
        </label>
      </header>
      {aviso && (
        <p className="aviso-parada" role="status">
          <Icono nombre="lesion" /> {aviso}
          {debeSustituir && ' Arrastra un suplente sobre el lesionado para sustituirlo.'}
        </p>
      )}
      {conUnoMenos && (
        <p className="error" role="alert">
          No te quedan cambios: tu equipo jugará el resto del partido con un jugador menos.
        </p>
      )}
      {mensaje && (
        <p className="error" role="alert">
          {mensaje}
        </p>
      )}
      <CampoEquipo
        estado={borrador.campo}
        colocacion={colocacion}
        jugadores={jugadores}
        parametros={P}
        dorsales={dorsales}
        colores={colores}
        modo="partido"
        bloqueados={bloqueados}
        distintivos={distintivos}
        {...(energia ? { energia } : {})}
        noDisponibles={noDisponibles}
        pestanas={{
          lista: <ListaPestanas pestanas={pestanas} activa={pestana} onElegir={setPestana} etiqueta="Secciones de la gestión" />,
          activa: pestana,
          panel:
            pestana === 'tactica' ? (
              <section aria-label="Táctica">
                <PanelTactica tactica={borrador.tactica} onCambiar={(tactica) => setBorrador({ ...borrador, tactica })} />
              </section>
            ) : pestana === 'lanzadores' && borrador.lanzadores ? (
              <EditorLanzadores
                lanzadores={borrador.lanzadores}
                titulares={titulares}
                nombre={nombre}
                onCambiar={(lanzadores) => setBorrador({ ...borrador, lanzadores })}
                conTitulo={false}
              />
            ) : undefined,
        }}
        orientacion={distribucion.orientacion}
        onSoltar={alSoltar}
        onMover={alMover}
      />

      {formacionPendiente && (
        <Dialogo rol="alertdialog" etiquetadoPor="titulo-formacion-gestion" alEscape={() => setFormacionPendiente(null)}>
          <p id="titulo-formacion-gestion">Se perderá la colocación personalizada. ¿Cambiar de formación?</p>
          <div className="acciones">
            <button type="button" className="secundario" onClick={() => elegirFormacion(formacionPendiente, true)}>
              Cambiar
            </button>
            <button type="button" className="texto" onClick={() => setFormacionPendiente(null)}>
              Cancelar
            </button>
          </div>
        </Dialogo>
      )}
      {ayudaEnergia && (
        <Dialogo etiquetadoPor="titulo-ayuda-energia" alEscape={() => setAyudaEnergia(false)}>
          <h2 id="titulo-ayuda-energia">Energía de los jugadores</h2>
          <p>Desde el minuto 65 (55 con Presión alta) los jugadores se cansan y rinden menos.</p>
          <table className="tabla-energia">
            <thead>
              <tr>
                <th scope="col">Cara</th>
                <th scope="col">Estado</th>
                <th scope="col">Energía</th>
              </tr>
            </thead>
            <tbody>
              {TRAMOS_ENERGIA.map((t) => (
                <tr key={t.tramo} className={`energia-${t.tramo}`}>
                  <td>
                    <CaraEnergia tramo={t.tramo} />
                  </td>
                  <td>{t.texto}</td>
                  <td>
                    {t.desde}–{t.hasta} %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="acciones">
            <button type="button" className="secundario" onClick={() => setAyudaEnergia(false)}>
              Cerrar
            </button>
          </div>
        </Dialogo>
      )}
      {confirmarSalida && (
        <Dialogo rol="alertdialog" etiquetadoPor="titulo-descartar" alEscape={() => setConfirmarSalida(false)}>
          <p id="titulo-descartar">¿Descartar los cambios?</p>
          <div className="acciones">
            <button type="button" className="peligro" onClick={() => onCerrar(false)}>
              Descartar
            </button>
            <button type="button" className="secundario" onClick={() => setConfirmarSalida(false)}>
              Seguir editando
            </button>
          </div>
        </Dialogo>
      )}
      <BarraPrincipal
        principal={{ etiqueta: 'Confirmar cambios', onClick: confirmar, motivoDesactivado: motivoSustituir ?? (validarTactica(borrador.tactica).length > 0 ? 'La táctica no es válida' : null) }}
        secundarios={[{ etiqueta: 'Volver sin cambios', onClick: volver, motivoDesactivado: motivoSustituir }]}
        estado={hayCambios ? `${decisiones.length} cambio${decisiones.length > 1 ? 's' : ''} sin confirmar` : 'Sin cambios'}
      />
    </div>
  );
}

const SIN_LESIONADOS: ReadonlySet<number> = new Set();

const ETIQUETA_DECISION: Record<DecisionGestion['tipo'], string> = {
  sustitucion: 'sustitución',
  formacion: 'formación',
  recolocacion: 'colocación',
  tactica: 'táctica',
  lanzadores: 'lanzadores',
};
