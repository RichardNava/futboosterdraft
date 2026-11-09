/**
 * Partido en el servidor (T095; FR-044 a FR-047): modalidad rápida.
 *
 * - `partido.inicio` revela las alineaciones, dorsales y equipaciones (FR-054a).
 * - Cada tramo (`avanzar('parte')`) se persiste antes de anunciarse con `partido.tramo`.
 * - En el descanso (y antes de la prórroga) se admiten decisiones hasta que el humano pulsa «Seguir», que
 *   reanuda al instante (FR-012), o vence el tiempo (`descansoS`). En directo solo hay un humano por
 *   partido: los partidos entre humanos se resuelven sin ellos (spec 002, FR-030).
 * - NPC contra NPC: `avanzar('final')` sin pausas.
 * - Lo que simula el motor o la IA se calcula en `servicios.calculo` (spec 009): en un hilo de trabajo o en proceso.
 */
import { decidirNPCEnPausa, type NivelesPartido } from '@fbd/ai';
import {
  CELEBRACION_DEL_JUEGO,
  cubrirBajas,
  MODO_INCIDENCIAS_POR_DEFECTO,
  escudosEnPartido,
  asignarDorsalesIniciales,
  completarDorsales,
  derivarSemilla,
  desdeV1,
  equipacionEnPartido,
  equipacionesAleatorias,
  parametrosActuales,
  parametrosPorVersion,
  posicionesColocadas,
  VERSION_MAYOR_SOPORTADA,
  versionMayor,
  type Alineacion,
  type DatosCelebracion,
  type ModoSimulacion,
  type Dorsales,
  type Equipaciones,
  type Jugador,
  type ModoIncidencias,
  type NivelNPC,
} from '@fbd/domain';
import {
  aplicarDecision,
  avanzar,
  crearPartido,
  minutoMostrable,
  ordenJugadores,
  type DecisionPartido,
  type DecisionRegistrada,
  type EntradaPartido,
  type EquipoPartido,
  type EstadoMotor,
  type EventoPartido,
  type Incidencia,
  type ResultadoTramo,
  maxSustituciones,
  MAX_PASOS,
} from '@fbd/engine';
import type { Ejecutor } from '../persistencia/db';
import type { FilaPartido } from '../persistencia/repos/partidos';
import { ErrorCalculo, type Prioridad } from '../simulacion/grupo';
import type { ContextoComando } from './actor';
import { alineacionVigente, bajasActivas, plantillaDe, type Precarga } from './equipo';
import type { ControladorPartida } from './partida';
import { aplicarLote, type DecisionLote } from './loteDecisiones';
import { avanzar2D, crearEstado2D, vista2D, type Estado2D } from './partido2d';
import { escudoDe } from './identidad';

export interface PartidoEnCurso {
  fila: FilaPartido;
  motor: EstadoMotor;
  inicio: Record<string, unknown> & { t: string };
  eventos: EventoPartido[];
  ultimo: Omit<ResultadoTramo, 'estado'> | null;
  /**
   * Ventana de decisión abierta; `restanteMs` si la partida de un humano está pausada (research R10). Spec 012: también
   * la parada de «control total» (`incidencia`), con las incidencias que la han provocado.
   */
  pausa: { motivo: MotivoPausa; venceEn: number; restanteMs?: number; incidencias?: Incidencia[] } | null;
  listos: Set<string>;
  /** Solo en la 2D en directo contra un NPC: búfer de anticipación y tramos enviados (ver `partido2d.ts`). */
  dosD: Estado2D | null;
}

/** `gol`: en la 2D con «control total», cada gol para el partido para gestionar el equipo (spec 012, ronda 2). */
export type MotivoPausa = 'descanso' | 'pre_prorroga' | 'incidencia' | 'gol';

export const esHumano = (c: ControladorPartida, pid: string) => c.participante(pid)?.tipo === 'humano' && !c.participante(pid)?.controladoPorNPC;

export function emitirAParticipantes(c: ControladorPartida, ctx: ContextoComando, fila: FilaPartido, mensaje: { t: string } & Record<string, unknown>) {
  for (const pid of [fila.localId, fila.visitanteId]) if (c.participante(pid)?.tipo === 'humano') ctx.emitirA(pid, mensaje);
}

/** Nivel con el que decide un participante controlado por un NPC (null si lo controla un humano). */
export function nivelNPCDe(c: ControladorPartida, participanteId: string): NivelNPC | null {
  const p = c.participante(participanteId);
  if (!p || (p.tipo !== 'npc' && !p.controladoPorNPC)) return null;
  return (p.nivelNPC as NivelNPC | null) ?? 'intermedio';
}

export function nivelesDe(c: ControladorPartida, fila: Pick<FilaPartido, 'localId' | 'visitanteId'>): NivelesPartido {
  const niveles: NivelesPartido = {};
  const local = nivelNPCDe(c, fila.localId);
  const visitante = nivelNPCDe(c, fila.visitanteId);
  if (local) niveles.local = local;
  if (visitante) niveles.visitante = visitante;
  return niveles;
}

type AlineacionDe = { alineacion: Alineacion; plantilla: Jugador[] };

/**
 * Alineación con la que juega un participante: la de su nivel si lo controla un NPC (T128), que mira la
 * plantilla del rival (visible tras el draft, FR-054a); si no, la vigente o la automática (FR-031).
 */
async function alineacionParaPartido(
  c: ControladorPartida,
  participanteId: string,
  rivalId: string,
  semilla: string,
  prioridad: Prioridad,
  precarga?: Precarga,
): Promise<AlineacionDe> {
  const nivel = nivelNPCDe(c, participanteId);
  if (!nivel) {
    // Spec 012 (FR-030): si se juega con bajas en la confirmada (plazo vencido o sin nadie con quien cubrirlas), solo
    // se sustituyen esas bajas y se avisa. Con una baja evitable, el partido no llega aquí (409 BAJA_PENDIENTE).
    const v = await alineacionVigente(c, participanteId, precarga);
    if (v.bajasPendientes.length === 0) return v;
    const alineacion = cubrirBajas(v.alineacion, v.plantilla, v.bajas, parametrosActuales());
    const motivo = new Map(v.bajasPendientes.map((b) => [b.jugadorId, b.motivo]));
    const cambios = v.alineacion.titulares
      .filter((t) => v.bajas.has(t.jugadorId))
      .map((t) => ({ sale: t.jugadorId, entra: alineacion.titulares.find((x) => x.casillaId === t.casillaId)?.jugadorId ?? null, motivo: motivo.get(t.jugadorId)! }));
    if (cambios.length) await c.alSustituirBajas?.(participanteId, cambios);
    return { alineacion, plantilla: v.plantilla };
  }
  const plantilla = await plantillaDe(c, participanteId, precarga);
  const rival = await plantillaDe(c, rivalId, precarga);
  const alineacion = await c.servicios.calculo.ejecutar(
    'decidirAlineacion',
    [nivel, plantilla, bajasActivas(c, participanteId), rival, derivarSemilla(semilla, `npc-alineacion:${participanteId}`), { parametros: parametrosActuales() }],
    prioridad,
  );
  return { alineacion, plantilla };
}

/** Lo que se calcula de un partido antes de guardar nada (spec 009, research R6). */
export interface PartidoCalculado {
  alineaciones: { local: AlineacionDe; visitante: AlineacionDe };
  entrada: EntradaPartido;
  motor: EstadoMotor;
  /** El partido entero, si se juega sin pausas. */
  final?: ResultadoTramo;
}

/** Alineaciones y estado inicial del motor; no guarda ni anuncia nada. */
export async function prepararPartido(c: ControladorPartida, fila: FilaPartido, prioridad: Prioridad, precarga?: Precarga): Promise<PartidoCalculado> {
  const parametros = parametrosActuales();
  const [local, visitante] = await Promise.all([
    alineacionParaPartido(c, fila.localId, fila.visitanteId, fila.semilla, prioridad, precarga),
    alineacionParaPartido(c, fila.visitanteId, fila.localId, fila.semilla, prioridad, precarga),
  ]);
  const entrada: EntradaPartido = {
    version: parametros.version,
    parametros,
    semilla: fila.semilla,
    eliminatoria: fila.eliminatoria,
    local: equipoDesde(fila.localId, local),
    visitante: equipoDesde(fila.visitanteId, visitante),
  };
  return { alineaciones: { local, visitante }, entrada, motor: crearPartido(entrada) };
}

/** Con algún humano y sin vencer el plazo, se juega en directo; si no, de una vez y sin pausas (FR-056a). */
const enDirecto = (c: ControladorPartida, fila: FilaPartido, automatico?: boolean) => !automatico && [fila.localId, fila.visitanteId].some((pid) => esHumano(c, pid));

/** Como `prepararPartido` y, si se juega sin pausas, también el partido entero. */
export async function calcularPartido(c: ControladorPartida, fila: FilaPartido, opciones: { automatico?: boolean } = {}): Promise<PartidoCalculado> {
  const directo = enDirecto(c, fila, opciones.automatico);
  const preparado = await prepararPartido(c, fila, directo ? 'humano' : 'npc');
  if (directo) return preparado;
  return { ...preparado, final: await c.servicios.calculo.ejecutar('jugarHastaElFinal', [preparado.motor, nivelesDe(c, fila), fila.semilla], 'npc') };
}

/** Registra un cálculo de partido fallido con lo necesario para repetirlo (FR-008). */
export function registrarCalculoFallido(c: ControladorPartida, fila: Pick<FilaPartido, 'id' | 'semilla'>, err: unknown): void {
  const motivo = err instanceof ErrorCalculo ? err.motivo : 'error';
  c.servicios.logger.error({ err, partidaId: c.id, partidoId: fila.id, semilla: fila.semilla, motivo }, 'Cálculo de partido fallido');
}

/** Equipo para el motor a partir de la alineación con la que juega el participante. */
function equipoDesde(participanteId: string, { alineacion, plantilla }: AlineacionDe): EquipoPartido {
  const porId = new Map(plantilla.map((j) => [j.id, j]));
  return {
    participanteId,
    formacion: alineacion.formacion,
    // Con colocación libre, cada titular juega desde su punto (FR-034; research R13).
    titulares: alineacion.titulares.map((t) => {
      const punto = alineacion.colocacion?.find((c) => c.jugadorId === t.jugadorId);
      return { casillaId: t.casillaId, jugador: porId.get(t.jugadorId)!, ...(punto ? { ancla: { x: punto.x, y: punto.y } } : {}) };
    }),
    suplentes: alineacion.suplentes.map((id) => porId.get(id)!),
    tactica: alineacion.tactica,
    lanzadores: alineacion.lanzadores,
  };
}

/** Dorsales con los que juega el participante: los iniciales si aún no tiene y uno para cada convocado sin dorsal. */
export async function dorsalesParaPartido(
  c: ControladorPartida,
  participanteId: string,
  { alineacion, plantilla }: AlineacionDe,
  ejecutor?: Ejecutor,
  precarga?: Precarga,
): Promise<{ dorsales: Dorsales; asignados: { jugadorId: number; dorsal: number }[] }> {
  let dorsales = precarga ? (precarga.dorsales.get(participanteId) ?? null) : await c.servicios.repoEquipo.dorsales(participanteId, ejecutor);
  if (!dorsales) {
    dorsales = asignarDorsalesIniciales(
      plantilla.map((j) => j.id),
      alineacion.titulares,
      alineacion.formacion,
      derivarSemilla(c.partida.semilla, `dorsales:${participanteId}`),
      posicionesColocadas(alineacion.formacion, alineacion.titulares, alineacion.colocacion, parametrosActuales()),
    );
    await c.servicios.repoEquipo.guardarDorsales(participanteId, dorsales, ejecutor);
  }
  // Al empezar, cada convocado sin dorsal recibe el libre más bajo (FR-038).
  const convocados = [...alineacion.titulares.map((t) => t.jugadorId), ...alineacion.suplentes];
  const completados = completarDorsales(dorsales, convocados);
  if (completados.asignados.length) {
    dorsales = completados.dorsales;
    await c.servicios.repoEquipo.guardarDorsales(participanteId, dorsales, ejecutor);
  }
  return { dorsales, asignados: completados.asignados };
}

export function equipacionesDe(c: ControladorPartida, pid: string): Equipaciones {
  return desdeV1(c.participante(pid)?.equipaciones ?? null) ?? equipacionesAleatorias(derivarSemilla(c.partida.semilla, `equipaciones:${pid}`), parametrosActuales());
}

/** Colores con los que juega cada equipo (el visitante cambia a la segunda si coinciden). */
export function equipacionesDelPartido(c: ControladorPartida, localId: string, visitanteId: string) {
  return equipacionEnPartido(equipacionesDe(c, localId), equipacionesDe(c, visitanteId), parametrosActuales());
}

/** Escudos que se pintan (spec 011, FR-008): ninguno si coinciden. Sin consultas: salen de los participantes en memoria. */
export function escudosDelPartido(c: ControladorPartida, localId: string, visitanteId: string) {
  return escudosEnPartido(escudoDe(c, localId), escudoDe(c, visitanteId));
}

/** Datos de la celebración del juego si el catálogo no la tiene cargada (pruebas sin seed). */
const DATOS_CELEBRACION_DEL_JUEGO: DatosCelebracion = { clase: 'juego', duracionMs: 2600 };

/**
 * Celebración de gol de cada equipo (spec 012, FR-012): la copiada del perfil del dueño al unirse; NPC o sin elegir,
 * la del juego. Sin consultas: sale de los participantes y del catálogo en memoria.
 */
export function celebracionesDelPartido(c: ControladorPartida, localId: string, visitanteId: string) {
  const de = (pid: string) => {
    const p = c.participante(pid);
    const id = p?.tipo === 'humano' && p.celebracion ? p.celebracion : CELEBRACION_DEL_JUEGO;
    const datos = c.servicios.cosmeticos.cosmetico(id)?.datos ?? c.servicios.cosmeticos.cosmetico(CELEBRACION_DEL_JUEGO)?.datos;
    return datos ? { id, datos } : { id: CELEBRACION_DEL_JUEGO, datos: DATOS_CELEBRACION_DEL_JUEGO };
  };
  return { local: de(localId), visitante: de(visitanteId) };
}

/** Entrada sin los parámetros (se recuperan por versión al reconstruir). */
export type EntradaGuardada = Omit<EntradaPartido, 'parametros'>;

/** Alineaciones iniciales de los dos equipos, tal como se anuncian al empezar el partido. */
/**
 * Alineaciones del `partido.inicio` (FR-054a). Solo el equipo de los participantes de `ampliadaPara` (el del
 * receptor) lleva el ancla de cada titular, la colocación y los lanzadores, para la gestión del equipo (spec 003,
 * research R17); del rival se muestra lo de siempre. Sin `ampliadaPara` (un resumen ya terminado), las dos van
 * completas.
 */
export function resumenAlineaciones(c: ControladorPartida, entrada: Pick<EntradaGuardada, 'local' | 'visitante'>, ampliadaPara?: readonly string[]) {
  const resumen = (e: EquipoPartido) => {
    const ampliada = !ampliadaPara || ampliadaPara.includes(e.participanteId);
    return {
      formacion: e.formacion,
      titulares: e.titulares.map((t) => ({ casillaId: t.casillaId, jugador: c.catalogo.resumen(t.jugador.id), ...(ampliada && t.ancla ? { ancla: t.ancla } : {}) })),
      ...(ampliada ? { colocacion: e.titulares.flatMap((t) => (t.ancla ? [{ jugadorId: t.jugador.id, x: t.ancla.x, y: t.ancla.y }] : [])) } : {}),
      suplentes: e.suplentes.map((j) => c.catalogo.resumen(j.id)),
      tactica: e.tactica,
      ...(ampliada ? { lanzadores: e.lanzadores } : {}),
    };
  };
  return { local: resumen(entrada.local), visitante: resumen(entrada.visitante) };
}

export async function iniciarPartido(
  c: ControladorPartida,
  ctx: ContextoComando,
  fila: FilaPartido,
  /** `calculado`: lo ya calculado con `calcularPartido` (las jornadas NPC calculan primero y guardan después). */
  opciones: { automatico?: boolean; calculado?: PartidoCalculado } = {},
): Promise<void> {
  const { reloj, repoPartidos, metricas } = c.servicios;
  // Todo lo que se calcula va antes de guardar nada: si falla, el partido sigue programado (FR-008).
  const { alineaciones, entrada, motor, final } =
    opciones.calculado ??
    (await calcularPartido(c, fila, opciones).catch((err: unknown) => {
      registrarCalculoFallido(c, fila, err);
      throw err;
    }));
  const local = await dorsalesParaPartido(c, fila.localId, alineaciones.local);
  const visitante = await dorsalesParaPartido(c, fila.visitanteId, alineaciones.visitante);
  const { parametros, ...guardada } = entrada;
  await repoPartidos.actualizar(fila.id, {
    entrada: guardada satisfies EntradaGuardada,
    estado: 'primera_parte',
    versionParametros: parametros.version,
    iniciadoEn: new Date(reloj.ahora()),
    resolucion: opciones.automatico === true ? 'plazo' : sinHumanos(c, fila) ? 'npc' : 'directo',
  });
  const nombre = (pid: string) => (c.participante(pid) ? c.nombreDe(c.participante(pid)!) : pid);
  const humanos = humanosDe(c, fila);
  const gestionDisponible = humanos.length === 1;
  const inicio = {
    t: 'partido.inicio',
    partidoId: fila.id,
    modalidad: modalidadDe(c, fila),
    local: { id: fila.localId, nombre: nombre(fila.localId) },
    visitante: { id: fila.visitanteId, nombre: nombre(fila.visitanteId) },
    alineaciones: resumenAlineaciones(c, entrada, humanosDe(c, fila)),
    dorsales: { ...local.dorsales, ...visitante.dorsales },
    equipaciones: equipacionesDelPartido(c, fila.localId, fila.visitanteId),
    escudos: escudosDelPartido(c, fila.localId, fila.visitanteId),
    celebraciones: celebracionesDelPartido(c, fila.localId, fila.visitanteId),
    decisiones: true,
    // En directo solo se juega contra un NPC: se puede gestionar el equipo (FR-027).
    gestionDisponible,
    // Spec 012 (FR-020): el modo de incidencias del único humano, que es quien lo ve. Solo en la 2D (ronda 2).
    ...(gestionDisponible && modalidadDe(c, fila) === '2d' ? { modoIncidencias: c.participante(humanos[0]!)?.modoIncidencias ?? MODO_INCIDENCIAS_POR_DEFECTO } : {}),
    ordenJugadores: ordenJugadores(motor),
    dorsalesAsignados: [...local.asignados, ...visitante.asignados],
  };
  // Spec 012 (FR-020, FR-024): «control total» solo contra un NPC y en la 2D, según el modo del único humano.
  if (gestionDisponible) fijarControlTotal(c, motor, fila, humanos[0]!);
  const p: PartidoEnCurso = { fila: { ...fila, estado: 'primera_parte', entrada: guardada }, motor, inicio, eventos: [], ultimo: null, pausa: null, listos: new Set(), dosD: null };
  c.partidosEnCurso.set(fila.id, p);
  metricas.partidosSimuladosTotal.inc();
  emitirAParticipantes(c, ctx, fila, inicio);
  // Resuelto sin el participante (al vencer el plazo): el aviso de los dorsales nuevos va a su bandeja.
  if (opciones.automatico === true) {
    for (const [pid, r] of [[fila.localId, local], [fila.visitanteId, visitante]] as const) if (r.asignados.length) await c.alAsignarDorsales?.(pid, r.asignados);
  }

  const directo = enDirecto(c, fila, opciones.automatico);
  if (directo && modalidadDe(c, fila) === '2d') {
    // 2D: con el búfer de anticipación, al ritmo de la reproducción del humano (research R6).
    p.dosD = crearEstado2D();
    await avanzar2D(c, ctx, p);
    return;
  }
  await jugarTramo(c, ctx, p, directo ? 'parte' : 'final', final);
}

/** Lado del motor de un participante del partido. */
const ladoDe = (motor: EstadoMotor, participanteId: string) => (motor.equipos.local.participanteId === participanteId ? 'local' : 'visitante');

/**
 * Pone en el motor el modo de incidencias que tiene el participante (spec 012, research R3). Solo en la 2D: en la
 * simulación rápida las lesiones y expulsiones se resuelven siempre en automático (spec 012, ronda 2).
 */
function fijarControlTotal(c: ControladorPartida, motor: EstadoMotor, fila: FilaPartido, participanteId: string): void {
  motor.equipos[ladoDe(motor, participanteId)].controlTotal = modalidadDe(c, fila) === '2d' && controlTotalDe(c, participanteId);
}

/** ¿Tiene el participante el modo «control total»? */
export const controlTotalDe = (c: ControladorPartida, participanteId: string): boolean => c.participante(participanteId)?.modoIncidencias === 'control_total';

async function jugarTramo(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso, modo: 'parte' | 'final', calculado?: ResultadoTramo): Promise<void> {
  const { calculo } = c.servicios;
  // Sin pausas, los NPC deciden igualmente en el descanso y antes de la prórroga. `p.motor` solo cambia al
  // registrar el resultado: si el cálculo falla, el partido sigue donde estaba.
  const r =
    calculado ??
    (modo === 'final'
      ? await calculo.ejecutar('jugarHastaElFinal', [p.motor, nivelesDe(c, p.fila), p.fila.semilla], 'npc')
      : await calculo.ejecutar('avanzar', [p.motor, modo], 'humano'));
  await registrarTramo(c, ctx, p, r);

  // Spec 012 (FR-022, research R4): una lesión o expulsión propia en «control total» corta la parte.
  if (r.incidencias) {
    abrirPausa(c, ctx, p, 'incidencia', r.incidencias);
  } else if (r.fase === 'descanso' || r.fase === 'pre_prorroga') {
    abrirPausa(c, ctx, p, r.fase === 'descanso' ? 'descanso' : 'pre_prorroga');
  } else if (r.fase === 'penaltis') {
    await jugarTramo(c, ctx, p, modo);
  } else if (r.fase === 'finalizado') {
    await terminarPartido(c, ctx, p);
  }
}

/**
 * Guarda un tramo ya simulado y después lo anuncia (decisiones aplicadas y `partido.tramo`). Lo usan
 * las dos modalidades; en 2D el tramo lleva además sus fotogramas.
 */
export async function registrarTramo(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso, r: ResultadoTramo): Promise<Record<string, unknown> & { t: string }> {
  const decisionesAntes = p.motor.decisiones.length;
  // Las decisiones se aplican al reanudar, en el punto en que acabó el tramo anterior.
  const minutoAntes = minutoMostrable(p.motor.reloj);
  const tickAntes = p.motor.tick;
  p.motor = r.estado;
  p.eventos.push(...r.eventos);
  const { estado: _estado, fotogramas: _fotogramas, ...sinEstado } = r;
  p.ultimo = sinEstado;
  p.fila = { ...p.fila, estado: r.fase };
  await c.servicios.repoPartidos.actualizar(p.fila.id, {
    estado: r.fase,
    eventos: p.eventos,
    decisiones: r.estado.decisiones,
    marcador: r.marcador,
    estadisticas: r.estadisticas,
    ...(r.fase === 'finalizado' ? { finalizadoEn: new Date(c.servicios.reloj.ahora()) } : {}),
  });

  for (const d of r.estado.decisiones.slice(decisionesAntes)) {
    const tick = d.aplicadaEnTick ?? r.estado.tick;
    emitirAParticipantes(c, ctx, p.fila, {
      t: 'partido.decision_aplicada',
      partidoId: p.fila.id,
      participanteId: d.participanteId,
      tipo: d.tipo,
      datos: d.datos,
      aplicadaEnTick: tick,
      minuto: tick === tickAntes ? minutoAntes : minutoMostrable(r.estado.reloj),
    });
  }
  const tramo = {
    t: 'partido.tramo',
    partidoId: p.fila.id,
    desdeTick: r.desdeTick,
    hastaTick: r.hastaTick,
    eventos: r.eventos.filter((e) => e.relevante),
    marcador: r.marcador,
    estadisticas: r.estadisticas,
    fase: r.fase,
    /** Minuto de juego en que acaba el tramo (la reproducción 2D lo usa para el reloj del marcador). */
    minuto: minutoMostrable(r.estado.reloj),
    acciones: r.acciones,
    ...(r.fotogramas ? { fotogramas: r.fotogramas } : {}),
    provisional: false,
  };
  emitirAParticipantes(c, ctx, p.fila, tramo);
  return tramo;
}

export function abrirPausa(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso, motivo: MotivoPausa, incidencias?: Incidencia[]): void {
  const descansoS = (c.partida.tiempos as { descansoS: number }).descansoS;
  const venceEn = c.servicios.reloj.ahora() + descansoS * 1000;
  p.pausa = { motivo, venceEn, ...(incidencias ? { incidencias } : {}) };
  p.listos = new Set([p.fila.localId, p.fila.visitanteId].filter((pid) => !esHumano(c, pid)));
  // El NPC rival decide al empezar la pausa; sus cambios se aplican al reanudar, como los del humano. En una parada
  // de incidencia o de gol no decide (en automático no existen; spec 012, research R2).
  if (motivo !== 'incidencia' && motivo !== 'gol') decidirNPCEnPausa(p.motor, nivelesDe(c, p.fila), p.fila.semilla);
  emitirPausa(c, ctx, p);
  programarVentana(c, p);
}

/** Programa el cierre de la ventana de decisión abierta (al abrirla o al reanudar una partida pausada). */
export function programarVentana(c: ControladorPartida, p: PartidoEnCurso): void {
  if (!p.pausa) return;
  // Spec 012, ronda 5: en la 2D, la parada de «control total» no vence. Se abre al simular el lance, antes de que el
  // participante lo vea, y al vencer se resolvía en automático el cambio que le tocaba decidir a él.
  if (p.dosD && p.pausa.motivo === 'incidencia') return;
  c.servicios.temporizadores.programar(c.clave(`pausa:${p.fila.id}`), p.pausa.venceEn, () => {
    void c
      .ejecutar(async (ctx) => {
        if (p.pausa && p.pausa.restanteMs === undefined && c.partidosEnCurso.get(p.fila.id) === p) await reanudar(c, ctx, p);
      })
      .catch((err: unknown) => c.servicios.logger.error({ err, partidaId: c.id }, 'Error al reanudar el partido'));
  });
}

export function emitirPausa(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso): void {
  if (!p.pausa) return;
  emitirAParticipantes(c, ctx, p.fila, { t: 'partido.pausa_decision', partidoId: p.fila.id, ...datosPausa(c, p) });
}

/**
 * Motivo y ventana de la pausa; en una parada de incidencia (spec 012, contracts/protocolo.md), las incidencias del
 * humano y los cambios que le quedan.
 */
function datosPausa(c: ControladorPartida, p: PartidoEnCurso) {
  const pausa = p.pausa!;
  const humano = humanosDe(c, p.fila)[0];
  const lado = humano ? ladoDe(p.motor, humano) : null;
  const propias = (pausa.incidencias ?? []).filter((i) => i.lado === lado);
  return {
    motivo: pausa.motivo,
    venceEn: new Date(pausa.venceEn).toISOString(),
    ...(pausa.motivo === 'incidencia' && lado
      ? {
          incidencias: propias.map((i) => ({ jugadorId: i.jugadorId, motivo: i.motivo, minuto: i.minuto, tick: i.tick })),
          sustitucionesRestantes: Math.max(0, maxSustituciones(p.motor) - p.motor.equipos[lado].sustitucionesUsadas),
        }
      : {}),
  };
}

async function reanudar(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso): Promise<void> {
  c.servicios.temporizadores.cancelar(c.clave(`pausa:${p.fila.id}`));
  p.pausa = null;
  p.listos.clear();
  // En la 2D en directo se sigue con el búfer de anticipación; en la rápida, hasta la siguiente parada.
  if (p.dosD) await avanzar2D(c, ctx, p);
  else await jugarTramo(c, ctx, p, 'parte');
}

export async function terminarPartido(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso): Promise<void> {
  // El torneo registra el resultado y calcula las bajas antes de anunciar el final.
  const bajasNuevas = (await c.alTerminarPartido?.(ctx, p)) ?? [];
  emitirAParticipantes(c, ctx, p.fila, {
    t: 'partido.fin',
    partidoId: p.fila.id,
    marcador: p.ultimo?.marcador ?? p.motor.marcador,
    eventos: p.eventos.filter((e) => e.relevante),
    estadisticas: p.ultimo?.estadisticas,
    bajasNuevas,
  });
  // El resultado ya está guardado: se anuncia ya, sin esperar a cerrar la jornada y abrir la siguiente,
  // que van en el mismo comando para que nada se cuele entre medias (T140).
  ctx.publicar();
  await c.trasTerminarPartido?.(ctx, p);
}

/** Ninguno de los dos lados lo controla un humano (NPC contra NPC, también tras un abandono). */
/**
 * Modalidad de un partido en directo (spec 003, FR-033): la que eligió su humano al abrirlo; `rapida` si no hay
 * humano o aún no la eligió. Solo cambia la presentación, nunca el cálculo.
 */
export function modalidadDe(c: ControladorPartida, fila: Pick<FilaPartido, 'localId' | 'visitanteId' | 'modalidades'>): ModoSimulacion {
  const modalidades = (fila.modalidades as Record<string, ModoSimulacion> | null) ?? {};
  for (const pid of [fila.localId, fila.visitanteId]) if (esHumano(c, pid) && modalidades[pid]) return modalidades[pid];
  return 'rapida';
}

/** Humanos del partido (participantes humanos no sustituidos por un NPC). */
export function humanosDe(c: ControladorPartida, fila: Pick<FilaPartido, 'localId' | 'visitanteId'>): string[] {
  return [fila.localId, fila.visitanteId].filter((pid) => esHumano(c, pid));
}

export function sinHumanos(c: ControladorPartida, fila: Pick<FilaPartido, 'localId' | 'visitanteId'>): boolean {
  return [fila.localId, fila.visitanteId].every((pid) => {
    const p = c.participante(pid);
    return !p || p.tipo !== 'humano' || p.controladoPorNPC;
  });
}

/** Termina sin más pausas un partido que sigue en juego (al vencer el plazo de la jornada). */
export async function forzarFinal(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso): Promise<void> {
  if (p.fila.estado === 'finalizado') return;
  c.servicios.temporizadores.cancelar(c.clave(`pausa:${p.fila.id}`));
  p.pausa = null;
  p.listos.clear();
  await c.servicios.repoPartidos.actualizar(p.fila.id, { resolucion: 'plazo' });
  await jugarTramo(c, ctx, p, 'final');
}

export type ResultadoComandoPartido = { ok: true } | { ok: false; error: { codigo: string; mensaje: string } };
const fallo = (codigo: string, mensaje: string): ResultadoComandoPartido => ({ ok: false, error: { codigo, mensaje } });

function partidoDe(c: ControladorPartida, participanteId: string, partidoId: string): PartidoEnCurso | ResultadoComandoPartido {
  const p = c.partidosEnCurso.get(partidoId);
  if (!p || (p.fila.localId !== participanteId && p.fila.visitanteId !== participanteId)) {
    return fallo('PARTIDO_NO_ENCONTRADO', 'No juegas ese partido');
  }
  return p;
}

export async function procesarSeguir(c: ControladorPartida, ctx: ContextoComando, participanteId: string, partidoId: string): Promise<ResultadoComandoPartido> {
  const p = partidoDe(c, participanteId, partidoId);
  if ('ok' in p) return p;
  if (!p.pausa) return fallo('SIN_PAUSA', 'El partido no está detenido');
  p.listos.add(participanteId);
  const humanos = [p.fila.localId, p.fila.visitanteId].filter((pid) => esHumano(c, pid));
  if (humanos.every((pid) => p.listos.has(pid))) await reanudar(c, ctx, p);
  else emitirPausa(c, ctx, p);
  return { ok: true };
}

/**
 * «Finalizar partido» (FR-026 a FR-028; research R7): en cualquier fase menos `finalizado`, también en
 * plena primera parte o durante la pausa de un gol en la 2D. Cierra la ventana de decisión abierta sin
 * cambios, resuelve el resto con `resolverResto` (los NPC deciden en las paradas; las decisiones pendientes
 * del humano se aplican en la primera interrupción no simulada), guarda y anuncia un `partido.tramo` por
 * parte y después `partido.fin`. Es idempotente.
 */
export async function procesarFinalizar(c: ControladorPartida, ctx: ContextoComando, participanteId: string, partidoId: string): Promise<ResultadoComandoPartido> {
  const p = c.partidosEnCurso.get(partidoId);
  if (!p || (p.fila.localId !== participanteId && p.fila.visitanteId !== participanteId)) {
    // Ya terminado (y fuera de los partidos en curso): no hay nada más que hacer.
    const fila = await c.servicios.repoPartidos.obtener(partidoId);
    if (fila?.estado === 'finalizado' && (fila.localId === participanteId || fila.visitanteId === participanteId)) return { ok: true };
    return fallo('PARTIDO_NO_ENCONTRADO', 'No juegas ese partido');
  }
  if (p.fila.estado === 'finalizado') return { ok: true };
  // Se calcula antes de cerrar la ventana: si falla, el partido sigue como estaba y se puede volver a pedir.
  const tramos = await c.servicios.calculo.ejecutar('resolverRestoPorTramos', [p.motor, nivelesDe(c, p.fila), p.fila.semilla], 'humano');
  c.servicios.temporizadores.cancelar(c.clave(`pausa:${p.fila.id}`));
  p.pausa = null;
  p.listos.clear();
  for (const t of tramos) await registrarTramo(c, ctx, p, t);
  await terminarPartido(c, ctx, p);
  return { ok: true };
}

export function procesarDecisionPartido(
  c: ControladorPartida,
  participanteId: string,
  partidoId: string,
  decision: { tipo: DecisionPartido['tipo']; datos: Record<string, unknown> },
): ResultadoComandoPartido {
  const r = procesarDecisionesLote(c, participanteId, partidoId, [decision]);
  if (r.ok) return r;
  const { indice: _indice, ...error } = r.error;
  return { ok: false, error };
}

export type ResultadoLotePartido = { ok: true } | { ok: false; error: { codigo: string; mensaje: string; indice?: number } };

/**
 * Lote de decisiones de la gestión del equipo (spec 003, research R17), con la misma ventana que una decisión
 * suelta: en la rápida solo con una pausa abierta; en la 2D en cualquier fase menos `finalizado` y `penaltis`
 * (lo comprueba el motor). En un partido entre humanos, nunca (FR-027, FR-031).
 */
export function procesarDecisionesLote(c: ControladorPartida, participanteId: string, partidoId: string, decisiones: readonly DecisionLote[]): ResultadoLotePartido {
  // Un partido entre humanos no se juega en directo (se resuelve con decisiones automáticas): nunca admite cambios.
  const cruce = c.jornada?.cruces.find((x) => x.partidoId === partidoId);
  if (cruce && humanosDe(c, { localId: cruce.local, visitanteId: cruce.visitante }).length > 1) {
    return fallo('SIN_PAUSA', 'En un partido entre humanos no se hacen cambios: se juega con decisiones automáticas');
  }
  const p = partidoDe(c, participanteId, partidoId);
  if ('ok' in p) return p;
  if (humanosDe(c, p.fila).length > 1) return fallo('SIN_PAUSA', 'En un partido entre humanos no se hacen cambios: se juega con decisiones automáticas');
  // En la modalidad rápida solo se decide en el descanso o antes de la prórroga (FR-045).
  if (!p.pausa && modalidadDe(c, p.fila) === 'rapida') return fallo('SIN_PAUSA', 'Solo puedes hacer cambios en el descanso');
  const r = aplicarLote(p.motor, participanteId, decisiones);
  return r.ok ? { ok: true } : { ok: false, error: { codigo: r.codigo, mensaje: r.mensaje, indice: r.indice } };
}

/**
 * `partido.modo_incidencias` (spec 012, FR-020, FR-024): cambia el modo durante el partido. Solo en un partido en
 * curso contra un NPC del que es el único humano; si no, `SIN_GESTION`. Actualiza el motor en memoria, el
 * participante y, si es registrado, su perfil. Repetirlo con el mismo modo no cambia nada.
 */
export async function procesarModoIncidencias(
  c: ControladorPartida,
  ctx: ContextoComando,
  participanteId: string,
  partidoId: string,
  modo: ModoIncidencias,
): Promise<ResultadoComandoPartido> {
  const p = partidoDe(c, participanteId, partidoId);
  if ('ok' in p) return p;
  if (p.fila.estado === 'finalizado' || humanosDe(c, p.fila).length !== 1 || !esHumano(c, participanteId) || !p.dosD) {
    return fallo('SIN_GESTION', 'El modo de incidencias solo se puede elegir en un partido 2D contra un NPC');
  }
  const participante = c.participante(participanteId)!;
  participante.modoIncidencias = modo;
  fijarControlTotal(c, p.motor, p.fila, participanteId);
  await c.servicios.repoPartidas.cambiarModoIncidencias(participanteId, modo);
  if (participante.usuarioId && !c.anfitrionEsInvitado) {
    await c.servicios.repoPerfiles.guardarAspecto(participante.usuarioId, { modoIncidencias: modo }, c.servicios.reloj.ahora());
  }
  ctx.emitirA(participanteId, { t: 'partido.modo_incidencias_ok', partidoId, modo });
  return { ok: true };
}

/** ¿Está el participante jugando un partido ahora mismo? */
export function enPartido(c: ControladorPartida, participanteId: string): boolean {
  for (const p of c.partidosEnCurso.values()) {
    if (p.fila.estado !== 'finalizado' && (p.fila.localId === participanteId || p.fila.visitanteId === participanteId)) return true;
  }
  return false;
}

/** Vista del partido de un participante (para el mensaje `estado`). */
export function vistaPartido(c: ControladorPartida, participanteId: string) {
  const p = [...c.partidosEnCurso.values()].reverse().find((x) => x.fila.localId === participanteId || x.fila.visitanteId === participanteId);
  if (!p) return null;
  return {
    inicio: p.inicio,
    eventos: p.eventos.filter((e) => e.relevante),
    marcador: p.ultimo?.marcador ?? p.motor.marcador,
    estadisticas: p.ultimo?.estadisticas ?? null,
    fase: p.fila.estado,
    pausa: p.pausa ? datosPausa(c, p) : null,
    // 2D en directo: los tramos ya simulados (con fotogramas los que aún no se han visto) y el último tick
    // informado, para seguir reproduciendo desde ahí.
    ...(p.dosD ? { dosD: vista2D(p) } : {}),
  };
}

/** Reconstruye un partido en curso tras un reinicio, reproduciendo sus decisiones (FR-040). */
export function reconstruirMotor(fila: FilaPartido): EstadoMotor | null {
  if (!fila.entrada) return null;
  // Un partido de una versión que el motor ya no simula (2.x) solo muestra su resumen guardado (research R2).
  if (versionMayor(fila.versionParametros) < VERSION_MAYOR_SOPORTADA) return null;
  const guardada = fila.entrada as EntradaGuardada;
  const motor = crearPartido({ ...guardada, parametros: parametrosPorVersion(fila.versionParametros) });
  for (const d of fila.decisiones as DecisionRegistrada[]) aplicarDecision(motor, d);
  // Las decisiones de una parada de incidencia (spec 012) se reproducen dentro de su parte: sin control total no hay
  // cortes, así que basta llegar a la fase guardada (con el mismo límite de seguridad que el motor).
  let estado = motor;
  for (let i = 0; i < MAX_PASOS && estado.fase !== fila.estado && estado.fase !== 'finalizado'; i++) estado = avanzar(estado, 'parte').estado;
  return estado;
}
