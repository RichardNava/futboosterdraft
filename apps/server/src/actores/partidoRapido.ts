/**
 * Partido en el servidor (T095; FR-044 a FR-047): modalidad rápida.
 *
 * - `partido.inicio` revela las alineaciones, dorsales y equipaciones (FR-054a).
 * - Cada tramo (`avanzar('parte')`) se persiste antes de anunciarse con `partido.tramo`.
 * - En el descanso (y antes de la prórroga) se admiten decisiones hasta que todos los humanos pulsan
 *   «Seguir» o vence el tiempo (`descansoS`). Los NPC cuentan siempre como listos.
 * - NPC contra NPC: `avanzar('final')` sin pausas.
 */
import { decidirAlineacion, decidirNPCEnPausa, jugarHastaElFinal, type NivelesPartido } from '@fbd/ai';
import {
  asignarDorsalesIniciales,
  derivarSemilla,
  equipacionEnPartido,
  equipacionesAleatorias,
  parametrosActuales,
  parametrosPorVersion,
  type Alineacion,
  type Dorsales,
  type Equipaciones,
  type NivelNPC,
} from '@fbd/domain';
import {
  aplicarDecision,
  avanzar,
  crearPartido,
  minutoMostrable,
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
import { avanzar2D, cancelarEspera2D, crearEstado2D, vista2D, type Estado2D } from './partido2d';

export interface PartidoEnCurso {
  fila: FilaPartido;
  motor: EstadoMotor;
  inicio: Record<string, unknown> & { t: string };
  eventos: EventoPartido[];
  ultimo: Omit<ResultadoTramo, 'estado'> | null;
  pausa: { motivo: 'descanso' | 'pre_prorroga'; venceEn: number } | null;
  listos: Set<string>;
  /** Solo en 2D con algún humano: velocidades y relojes de reproducción (ver `partido2d.ts`). */
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
async function equipoParaMotor(
  c: ControladorPartida,
  participanteId: string,
  rivalId: string,
  semilla: string,
): Promise<{ equipo: EquipoPartido; dorsales: Dorsales }> {
  const { alineacion, plantilla } = await alineacionParaPartido(c, participanteId, rivalId, semilla);
  const porId = new Map(plantilla.map((j) => [j.id, j]));
  let dorsales = await c.servicios.repoEquipo.dorsales(participanteId);
  if (!dorsales) {
    dorsales = asignarDorsalesIniciales(
      plantilla.map((j) => j.id),
      alineacion.titulares,
      alineacion.formacion,
      derivarSemilla(c.partida.semilla, `dorsales:${participanteId}`),
    );
    await c.servicios.repoEquipo.guardarDorsales(participanteId, dorsales);
  }
  return {
    dorsales,
    equipo: {
      participanteId,
      formacion: alineacion.formacion,
      titulares: alineacion.titulares.map((t) => ({ casillaId: t.casillaId, jugador: porId.get(t.jugadorId)! })),
      suplentes: alineacion.suplentes.map((id) => porId.get(id)!),
      tactica: alineacion.tactica,
      lanzadores: alineacion.lanzadores,
    },
  };
}

function equipacionesDe(c: ControladorPartida, pid: string): Equipaciones {
  return (c.participante(pid)?.equipaciones as Equipaciones | null) ?? equipacionesAleatorias(derivarSemilla(c.partida.semilla, `equipaciones:${pid}`), parametrosActuales());
}

/** Colores con los que juega cada equipo (el visitante cambia a la segunda si coinciden). */
export function equipacionesDelPartido(c: ControladorPartida, localId: string, visitanteId: string) {
  return equipacionEnPartido(equipacionesDe(c, localId), equipacionesDe(c, visitanteId), parametrosActuales());
}

/** Entrada sin los parámetros (se recuperan por versión al reconstruir). */
type EntradaGuardada = Omit<EntradaPartido, 'parametros'>;

/** Alineaciones iniciales de los dos equipos, tal como se anuncian al empezar el partido. */
export function resumenAlineaciones(c: ControladorPartida, entrada: Pick<EntradaGuardada, 'local' | 'visitante'>) {
  const resumen = (e: EquipoPartido) => ({
    formacion: e.formacion,
    titulares: e.titulares.map((t) => ({ casillaId: t.casillaId, jugador: c.servicios.catalogo.resumen(t.jugador.id) })),
    suplentes: e.suplentes.map((j) => c.servicios.catalogo.resumen(j.id)),
    tactica: e.tactica,
    lanzadores: e.lanzadores,
  });
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
    resueltoAutomaticamente: opciones.automatico === true,
  });
  const nombre = (pid: string) => (c.participante(pid) ? c.nombreDe(c.participante(pid)!) : pid);
  const inicio = {
    t: 'partido.inicio',
    partidoId: fila.id,
    modalidad: c.partida.tipoSimulacion as 'rapida' | '2d',
    local: { id: fila.localId, nombre: nombre(fila.localId) },
    visitante: { id: fila.visitanteId, nombre: nombre(fila.visitanteId) },
    alineaciones: resumenAlineaciones(c, entrada),
    dorsales: { ...local.dorsales, ...visitante.dorsales },
    equipaciones: equipacionesDelPartido(c, fila.localId, fila.visitanteId),
  };
  const p: PartidoEnCurso = { fila: { ...fila, estado: 'primera_parte' }, motor, inicio, eventos: [], ultimo: null, pausa: null, listos: new Set(), dosD: null };
  c.partidosEnCurso.set(fila.id, p);
  metricas.partidosSimuladosTotal.inc();
  emitirAParticipantes(c, ctx, fila, inicio);

  // Sin humanos, o resuelto al vencer el plazo de la jornada: de una vez y sin pausas (FR-056a).
  const conHumanos = [fila.localId, fila.visitanteId].some((pid) => esHumano(c, pid));
  if (conHumanos && !opciones.automatico && c.partida.tipoSimulacion === '2d') {
    // 2D: de interrupción en interrupción, al ritmo de la reproducción de los humanos (FR-049).
    p.dosD = crearEstado2D(c, p);
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
    emitirAParticipantes(c, ctx, p.fila, {
      t: 'partido.decision_aplicada',
      partidoId: p.fila.id,
      participanteId: d.participanteId,
      tipo: d.tipo,
      datos: d.datos,
      aplicadaEnTick: d.aplicadaEnTick ?? r.estado.tick,
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
    ...(r.fotogramas ? { fotogramas: r.fotogramas } : {}),
  };
  emitirAParticipantes(c, ctx, p.fila, tramo);
  return tramo;
}

function abrirPausa(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso, motivo: 'descanso' | 'pre_prorroga'): void {
  const descansoS = (c.partida.tiempos as { descansoS: number }).descansoS;
  const venceEn = c.servicios.reloj.ahora() + descansoS * 1000;
  p.pausa = { motivo, venceEn };
  p.listos = new Set([p.fila.localId, p.fila.visitanteId].filter((pid) => !esHumano(c, pid)));
  // El NPC rival decide al empezar la pausa; sus cambios se aplican al reanudar, como los del humano.
  decidirNPCEnPausa(p.motor, nivelesDe(c, p.fila), p.fila.semilla);
  emitirPausa(c, ctx, p);
  c.servicios.temporizadores.programar(c.clave(`pausa:${p.fila.id}`), venceEn, () => {
    void c
      .ejecutar(async (ctx2) => {
        if (p.pausa && c.partidosEnCurso.get(p.fila.id) === p) await reanudar(c, ctx2, p);
      })
      .catch((err: unknown) => c.servicios.logger.error({ err, partidaId: c.id }, 'Error al reanudar el partido'));
  });
}

function emitirPausa(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso): void {
  if (!p.pausa) return;
  emitirAParticipantes(c, ctx, p.fila, {
    t: 'partido.pausa_decision',
    partidoId: p.fila.id,
    motivo: p.pausa.motivo,
    venceEn: new Date(p.pausa.venceEn).toISOString(),
    listos: [...p.listos],
  });
}

async function reanudar(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso): Promise<void> {
  c.servicios.temporizadores.cancelar(c.clave(`pausa:${p.fila.id}`));
  p.pausa = null;
  p.listos.clear();
  await jugarTramo(c, ctx, p, 'parte');
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

/** Termina sin más pausas un partido que sigue en juego (al vencer el plazo de la jornada). */
export async function forzarFinal(c: ControladorPartida, ctx: ContextoComando, p: PartidoEnCurso): Promise<void> {
  if (p.fila.estado === 'finalizado') return;
  c.servicios.temporizadores.cancelar(c.clave(`pausa:${p.fila.id}`));
  cancelarEspera2D(c, p);
  p.pausa = null;
  p.listos.clear();
  await c.servicios.repoPartidos.actualizar(p.fila.id, { resueltoAutomaticamente: true });
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

export function procesarDecisionPartido(
  c: ControladorPartida,
  participanteId: string,
  partidoId: string,
  decision: { tipo: DecisionPartido['tipo']; datos: Record<string, unknown> },
): ResultadoComandoPartido {
  const p = partidoDe(c, participanteId, partidoId);
  if ('ok' in p) return p;
  // En la modalidad rápida solo se decide en el descanso o antes de la prórroga (FR-045).
  if (!p.pausa && c.partida.tipoSimulacion === 'rapida') return fallo('SIN_PAUSA', 'Solo puedes hacer cambios en el descanso');
  const r = aplicarDecision(p.motor, { participanteId, tipo: decision.tipo, datos: decision.datos } as DecisionPartido);
  return r.ok ? { ok: true } : fallo(r.codigo, r.mensaje);
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
    pausa: p.pausa ? { motivo: p.pausa.motivo, venceEn: new Date(p.pausa.venceEn).toISOString(), listos: [...p.listos] } : null,
    // 2D: los tramos ya simulados (sin fotogramas, salvo el último, para seguir reproduciendo) y la velocidad.
    ...(p.dosD ? { dosD: vista2D(p, participanteId) } : {}),
  };
}

/** Reconstruye un partido en curso tras un reinicio, reproduciendo sus decisiones (FR-040). */
export function reconstruirMotor(fila: FilaPartido): EstadoMotor | null {
  if (!fila.entrada) return null;
  const guardada = fila.entrada as EntradaGuardada;
  const motor = crearPartido({ ...guardada, parametros: parametrosPorVersion(fila.versionParametros) });
  for (const d of fila.decisiones as DecisionRegistrada[]) aplicarDecision(motor, d);
  let estado = motor;
  for (let i = 0; i < 6 && estado.fase !== fila.estado && estado.fase !== 'finalizado'; i++) estado = avanzar(estado, 'parte').estado;
  return estado;
}
