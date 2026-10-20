/**
 * Partido en el servidor (T095; FR-044 a FR-047): modalidad rápida.
 *
 * - `partido.inicio` revela las alineaciones, dorsales y equipaciones (FR-054a).
 * - Cada tramo (`avanzar('parte')`) se persiste antes de anunciarse con `partido.tramo`.
 * - En el descanso (y antes de la prórroga) se admiten decisiones hasta que el humano pulsa «Seguir», que
 *   reanuda al instante (FR-012), o vence el tiempo (`descansoS`). En directo solo hay un humano por
 *   partido: los partidos entre humanos se resuelven sin ellos (spec 002, FR-030).
 * - NPC contra NPC: `avanzar('final')` sin pausas.
 */
import { decidirAlineacion, decidirNPCEnPausa, jugarHastaElFinal, resolverResto, type NivelesPartido } from '@fbd/ai';
import {
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
  type ModoSimulacion,
  type Dorsales,
  type Equipaciones,
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
  type ResultadoTramo,
} from '@fbd/engine';
import type { FilaPartido } from '../persistencia/repos/partidos';
import type { ContextoComando } from './actor';
import { alineacionVigente, bajasActivas, plantillaDe } from './equipo';
import type { ControladorPartida } from './partida';
import { aplicarLote, type DecisionLote } from './loteDecisiones';
import { avanzar2D, crearEstado2D, vista2D, type Estado2D } from './partido2d';

export interface PartidoEnCurso {
  fila: FilaPartido;
  motor: EstadoMotor;
  inicio: Record<string, unknown> & { t: string };
  eventos: EventoPartido[];
  ultimo: Omit<ResultadoTramo, 'estado'> | null;
  /** Ventana de decisión abierta; `restanteMs` si la partida de un humano está pausada (research R10). */
  pausa: { motivo: 'descanso' | 'pre_prorroga'; venceEn: number; restanteMs?: number } | null;
  listos: Set<string>;
  /** Solo en la 2D en directo contra un NPC: búfer de anticipación y tramos enviados (ver `partido2d.ts`). */
  dosD: Estado2D | null;
}

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

/**
 * Alineación con la que juega un participante: la de su nivel si lo controla un NPC (T128), que mira la
 * plantilla del rival (visible tras el draft, FR-054a); si no, la vigente o la automática (FR-031).
 */
async function alineacionParaPartido(c: ControladorPartida, participanteId: string, rivalId: string, semilla: string) {
  const nivel = nivelNPCDe(c, participanteId);
  if (!nivel) return alineacionVigente(c, participanteId);
  const plantilla = await plantillaDe(c, participanteId);
  const rival = await plantillaDe(c, rivalId);
  const alineacion: Alineacion = decidirAlineacion(
    nivel,
    plantilla,
    bajasActivas(c, participanteId),
    rival,
    derivarSemilla(semilla, `npc-alineacion:${participanteId}`),
    { parametros: parametrosActuales() },
  );
  return { alineacion, plantilla };
}

/** Equipo para el motor a partir de la alineación con la que juega el participante. */
export async function equipoParaMotor(
  c: ControladorPartida,
  participanteId: string,
  rivalId: string,
  semilla: string,
): Promise<{ equipo: EquipoPartido; dorsales: Dorsales; asignados: { jugadorId: number; dorsal: number }[] }> {
  const { alineacion, plantilla } = await alineacionParaPartido(c, participanteId, rivalId, semilla);
  const porId = new Map(plantilla.map((j) => [j.id, j]));
  let dorsales = await c.servicios.repoEquipo.dorsales(participanteId);
  if (!dorsales) {
    dorsales = asignarDorsalesIniciales(
      plantilla.map((j) => j.id),
      alineacion.titulares,
      alineacion.formacion,
      derivarSemilla(c.partida.semilla, `dorsales:${participanteId}`),
      posicionesColocadas(alineacion.formacion, alineacion.titulares, alineacion.colocacion, parametrosActuales()),
    );
    await c.servicios.repoEquipo.guardarDorsales(participanteId, dorsales);
  }
  // Al empezar, cada convocado sin dorsal recibe el libre más bajo (FR-038).
  const convocados = [...alineacion.titulares.map((t) => t.jugadorId), ...alineacion.suplentes];
  const completados = completarDorsales(dorsales, convocados);
  if (completados.asignados.length) {
    dorsales = completados.dorsales;
    await c.servicios.repoEquipo.guardarDorsales(participanteId, dorsales);
  }
  return {
    dorsales,
    asignados: completados.asignados,
    equipo: {
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
    },
  };
}

function equipacionesDe(c: ControladorPartida, pid: string): Equipaciones {
  return desdeV1(c.participante(pid)?.equipaciones ?? null) ?? equipacionesAleatorias(derivarSemilla(c.partida.semilla, `equipaciones:${pid}`), parametrosActuales());
}

/** Colores con los que juega cada equipo (el visitante cambia a la segunda si coinciden). */
export function equipacionesDelPartido(c: ControladorPartida, localId: string, visitanteId: string) {
  return equipacionEnPartido(equipacionesDe(c, localId), equipacionesDe(c, visitanteId), parametrosActuales());
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
      titulares: e.titulares.map((t) => ({ casillaId: t.casillaId, jugador: c.servicios.catalogo.resumen(t.jugador.id), ...(ampliada && t.ancla ? { ancla: t.ancla } : {}) })),
      ...(ampliada ? { colocacion: e.titulares.flatMap((t) => (t.ancla ? [{ jugadorId: t.jugador.id, x: t.ancla.x, y: t.ancla.y }] : [])) } : {}),
      suplentes: e.suplentes.map((j) => c.servicios.catalogo.resumen(j.id)),
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
  opciones: { automatico?: boolean } = {},
): Promise<void> {
  const { reloj, repoPartidos, metricas } = c.servicios;
  const parametros = parametrosActuales();
  const local = await equipoParaMotor(c, fila.localId, fila.visitanteId, fila.semilla);
  const visitante = await equipoParaMotor(c, fila.visitanteId, fila.localId, fila.semilla);
  const entrada: EntradaPartido = {
    version: parametros.version,
    parametros,
    semilla: fila.semilla,
    eliminatoria: fila.eliminatoria,
    local: local.equipo,
    visitante: visitante.equipo,
  };
  const motor = crearPartido(entrada);
  const { parametros: _p, ...guardada } = entrada;
  await repoPartidos.actualizar(fila.id, {
    entrada: guardada satisfies EntradaGuardada,
    estado: 'primera_parte',
    versionParametros: parametros.version,
    iniciadoEn: new Date(reloj.ahora()),
    resolucion: opciones.automatico === true ? 'plazo' : sinHumanos(c, fila) ? 'npc' : 'directo',
  });
  const nombre = (pid: string) => (c.participante(pid) ? c.nombreDe(c.participante(pid)!) : pid);
  const inicio = {
    t: 'partido.inicio',
    partidoId: fila.id,
    modalidad: modalidadDe(c, fila),
    local: { id: fila.localId, nombre: nombre(fila.localId) },
    visitante: { id: fila.visitanteId, nombre: nombre(fila.visitanteId) },
    alineaciones: resumenAlineaciones(c, entrada, humanosDe(c, fila)),
    dorsales: { ...local.dorsales, ...visitante.dorsales },
    equipaciones: equipacionesDelPartido(c, fila.localId, fila.visitanteId),
    decisiones: true,
    // En directo solo se juega contra un NPC: se puede gestionar el equipo (FR-027).
    gestionDisponible: humanosDe(c, fila).length === 1,
    ordenJugadores: ordenJugadores(motor),
    dorsalesAsignados: [...local.asignados, ...visitante.asignados],
  };
  const p: PartidoEnCurso = { fila: { ...fila, estado: 'primera_parte', entrada: guardada }, motor, inicio, eventos: [], ultimo: null, pausa: null, listos: new Set(), dosD: null };
  c.partidosEnCurso.set(fila.id, p);
  metricas.partidosSimuladosTotal.inc();
  emitirAParticipantes(c, ctx, fila, inicio);
  // Resuelto sin el participante (al vencer el plazo): el aviso de los dorsales nuevos va a su bandeja.
  if (opciones.automatico === true) {
    for (const [pid, r] of [[fila.localId, local], [fila.visitanteId, visitante]] as const) if (r.asignados.length) await c.alAsignarDorsales?.(pid, r.asignados);
  }

  // Sin humanos, o resuelto al vencer el plazo de la jornada: de una vez y sin pausas (FR-056a).
  const conHumanos = [fila.localId, fila.visitanteId].some((pid) => esHumano(c, pid));
  if (conHumanos && !opciones.automatico && modalidadDe(c, fila) === '2d') {
    // 2D: con el búfer de anticipación, al ritmo de la reproducción del humano (research R6).
    p.dosD = crearEstado2D();
    await avanzar2D(c, ctx, p);
    return;
  }
  await jugarTramo(c, ctx, p, conHumanos && !opciones.automatico ? 'parte' : 'final');
}

async function jugarTramo(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso, modo: 'parte' | 'final'): Promise<void> {
  // Sin pausas, los NPC deciden igualmente en el descanso y antes de la prórroga.
  const r = modo === 'final' ? jugarHastaElFinal(p.motor, nivelesDe(c, p.fila), p.fila.semilla) : avanzar(p.motor, modo);
  await registrarTramo(c, ctx, p, r);

  if (r.fase === 'descanso' || r.fase === 'pre_prorroga') {
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

export function abrirPausa(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso, motivo: 'descanso' | 'pre_prorroga'): void {
  const descansoS = (c.partida.tiempos as { descansoS: number }).descansoS;
  const venceEn = c.servicios.reloj.ahora() + descansoS * 1000;
  p.pausa = { motivo, venceEn };
  p.listos = new Set([p.fila.localId, p.fila.visitanteId].filter((pid) => !esHumano(c, pid)));
  // El NPC rival decide al empezar la pausa; sus cambios se aplican al reanudar, como los del humano.
  decidirNPCEnPausa(p.motor, nivelesDe(c, p.fila), p.fila.semilla);
  emitirPausa(c, ctx, p);
  programarVentana(c, p);
}

/** Programa el cierre de la ventana de decisión abierta (al abrirla o al reanudar una partida pausada). */
export function programarVentana(c: ControladorPartida, p: PartidoEnCurso): void {
  if (!p.pausa) return;
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
  emitirAParticipantes(c, ctx, p.fila, {
    t: 'partido.pausa_decision',
    partidoId: p.fila.id,
    motivo: p.pausa.motivo,
    venceEn: new Date(p.pausa.venceEn).toISOString(),
  });
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
  c.servicios.temporizadores.cancelar(c.clave(`pausa:${p.fila.id}`));
  p.pausa = null;
  p.listos.clear();
  const tramos: ResultadoTramo[] = [];
  resolverResto(p.motor, nivelesDe(c, p.fila), p.fila.semilla, (t) => tramos.push(t));
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
    pausa: p.pausa ? { motivo: p.pausa.motivo, venceEn: new Date(p.pausa.venceEn).toISOString() } : null,
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
  let estado = motor;
  for (let i = 0; i < 6 && estado.fase !== fila.estado && estado.fase !== 'finalizado'; i++) estado = avanzar(estado, 'parte').estado;
  return estado;
}
