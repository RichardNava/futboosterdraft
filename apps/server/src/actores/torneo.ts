/**
 * Torneo en el servidor (T113; FR-051 a FR-056c; spec 002: FR-030, research R8 y R9).
 *
 * - Al terminar el draft se crea el torneo (calendario o cuadro) y se abre la primera jornada.
 * - El ritmo se deduce del número de humanos activos:
 *   - con uno solo, no hay plazos: los NPC contra NPC se resuelven al abrir la jornada, su partido empieza
 *     cuando lo abre, y la siguiente jornada se abre con «Siguiente jornada»;
 *   - con varios, cada jornada tiene plazo; los partidos contra un NPC se juegan en directo cuando el
 *     humano los abre, los partidos entre humanos se resuelven al abrirlos uno de ellos (research R8), y al
 *     vencer el plazo se resuelve lo pendiente y se abre la siguiente jornada.
 * - Tras cada partido: resultado, bajas y amarillas, `torneo.actualizado` (filtrado por participante:
 *   nadie ve el resultado de un partido propio que aún no ha visto) y cierre de jornada, paso a la fase
 *   final del mixto o campeón.
 *
 * Los plazos de jornada se guardan en la tabla `jornadas` y se reprograman al rehidratar la partida
 * (research R6, ver nota sobre pg-boss): cada vencimiento comprueba el estado antes de actuar, así que
 * se ejecuta una sola vez.
 */
import {
  tablaAsistentes,
  tablaGoleadores,
  type FilaTabla,
  abrirJornada,
  bajasActivas,
  cerrarJornadaSiCompleta,
  clasificacionActual,
  crearTorneo,
  eliminacionDe,
  esEliminatoria,
  ETIQUETA_FASE,
  humanosEnCompeticion,
  jornadaActual,
  PARAMETROS_ECONOMIA,
  registrarResultado,
  soloUnHumano,
  transicion,
  type Baja,
  type EstadoTorneo,
  type ModoSimulacion,
} from '@fbd/domain';
import type { EventoPartido } from '@fbd/engine';
import type { ServicioAvisos, TipoAviso } from '../avisos/servicio';
import { resueltoAutomaticamente } from '../persistencia/repos/partidos';
import type { ContextoComando } from './actor';
import type { ControladorPartida } from './partida';
import { entreHumanos, resolverPartidoEntreHumanos, terminarPartidoEntreHumanosEnJuego } from './partidoEntreHumanos';
import { esHumano, forzarFinal, iniciarPartido, nivelNPCDe, type PartidoEnCurso } from './partidoRapido';
import { cartasDelCruce, resolverCrucesDuelos } from './duelos';
import { crearPartidosJornada, emitirPreparacion, resolverPartidosSinHumanos } from './preparacion';
import type { ResultadoCruce } from '@fbd/domain';

/** Aviso anticipado antes de que venza el plazo de una jornada asíncrona. */
export const AVISO_PLAZO_MS = 2 * 60 * 60 * 1000;

export interface DependenciasTorneo {
  avisos: ServicioAvisos;
}

function nombre(c: ControladorPartida, pid: string): string {
  const p = c.participante(pid);
  return p ? c.nombreDe(p) : pid;
}

async function avisarHumanos(c: ControladorPartida, deps: DependenciasTorneo, pids: string[], tipo: TipoAviso, texto: string, partidoId?: string) {
  for (const pid of pids) {
    const p = c.participante(pid);
    if (p?.tipo !== 'humano' || p.controladoPorNPC || !p.usuarioId) continue;
    await deps.avisos.avisar({ usuarioId: p.usuarioId, tipo, partidaId: c.id, ...(partidoId ? { partidoId } : {}), texto });
  }
}

/** Conecta el controlador con el torneo: bajas, final de partido y alineaciones. */
export function engancharTorneo(c: ControladorPartida, deps: DependenciasTorneo): void {
  c.bajasActivas = (pid) => (c.torneo ? bajasActivas(c.torneo.bajas, pid) : new Set());
  c.alTerminarPartido = (ctx, p) => registrarPartido(c, ctx, p);
  c.trasTerminarPartido = (ctx) => despuesDePartido(c, ctx, deps);
  c.alAsignarDorsales = async (pid, asignados) => {
    const texto = `Nuevos dorsales en tu equipo: ${asignados.map((a) => `${c.catalogo.resumen(a.jugadorId).apellidos.split(' ')[0]} lleva el ${a.dorsal}`).join(', ')}.`;
    await avisarHumanos(c, deps, [pid], 'dorsal_asignado', texto);
  };
  c.programarPrimeraJornada ??= (ctx) => iniciarTorneo(c, ctx, deps);
  c.resolverDuelos = (ctx, opciones) => resolverDuelos(c, ctx, deps, opciones);
}

/** Modo duelos (spec 005, T070): resuelve los cruces que se pueden y, si ha resuelto alguno, sigue el torneo. */
async function resolverDuelos(c: ControladorPartida, ctx: ContextoComando, deps: DependenciasTorneo, opciones: { forzar?: boolean; soloPartido?: string } = {}) {
  if (c.partida.modo !== 'duelos') return;
  if ((await resolverCrucesDuelos(c, opciones)) > 0) await despuesDePartido(c, ctx, deps);
}

export async function iniciarTorneo(c: ControladorPartida, ctx: ContextoComando, deps: DependenciasTorneo): Promise<void> {
  const participantes = c.mesas.flatMap((m) => m.mesa.participantes);
  const mesas = c.mesas.map((m) => m.mesa.participantes);
  c.torneo = crearTorneo(c.partida.modo as EstadoTorneo['modo'], participantes, mesas, c.partida.semilla);
  await c.servicios.repoTorneo.guardar(c.id, c.torneo);
  await abrirSiguienteJornada(c, ctx, deps);
}

/** Humanos activos (sin sustituir por un NPC). */
function humanosActivos(c: ControladorPartida): string[] {
  return c.participantes.filter((p) => p.tipo === 'humano' && !p.controladoPorNPC).map((p) => p.id);
}

/** ¿Queda algún humano activo sin eliminar? (spec 003, FR-041b; data-model §8.3). */
export function hayHumanosEnCompeticion(c: ControladorPartida): boolean {
  return !!c.torneo && humanosEnCompeticion(c.torneo, humanosActivos(c)).length > 0;
}

type ResumenPartido = Awaited<ReturnType<ControladorPartida['servicios']['repoPartidos']['resumenesDePartida']>>[number];

/**
 * Eliminación de un participante tal como la ve él (FR-039): no se revela hasta que ha visto el partido que
 * lo eliminó.
 */
function eliminacionVista(t: EstadoTorneo, participanteId: string, partidos: readonly ResumenPartido[], pendientes: ReadonlySet<string>) {
  const eliminacion = eliminacionDe(t, participanteId);
  if (!eliminacion) return null;
  const partido = partidos.find((x) => x.jornadaNumero === eliminacion.jornada && (x.localId === participanteId || x.visitanteId === participanteId));
  return partido && pendientes.has(partido.id) ? null : eliminacion;
}

/**
 * ¿Queda algún humano activo que, desde su vista, sigue en competición? Quien aún no ha visto el partido que
 * lo eliminó cuenta como en competición: «Simular resto del torneo» no le adelanta el final (FR-039, FR-041b).
 */
async function hayHumanosEnCompeticionVisibles(c: ControladorPartida, opciones: { partidos?: readonly ResumenPartido[]; excepto?: string } = {}): Promise<boolean> {
  const t = c.torneo;
  if (!t || t.campeon) return false;
  if (hayHumanosEnCompeticion(c)) return true;
  const lista = opciones.partidos ?? (await c.servicios.repoPartidos.resumenesDePartida(c.id));
  for (const h of humanosActivos(c)) {
    if (h === opciones.excepto) continue;
    if (!eliminacionVista(t, h, lista, new Set(await pendientesDe(c, h)))) return true;
  }
  return false;
}

/** Partidas en las que `simularResto` está en curso: no se emiten las actualizaciones intermedias. */
const silenciosas = new WeakSet<ControladorPartida>();

async function abrirSiguienteJornada(c: ControladorPartida, ctx: ContextoComando, deps: DependenciasTorneo): Promise<void> {
  const t = c.torneo!;
  const j = jornadaActual(t);
  if (!j) return;
  c.torneo = abrirJornada(t, j.numero);
  const { reloj, repoTorneo } = c.servicios;
  const ahora = reloj.ahora();
  // Con un solo humano no hay plazos (research R9); tampoco si no queda ningún humano en competición (spec 003).
  const conPlazo = !soloUnHumano(c.participantes) && hayHumanosEnCompeticion(c);
  const venceEn = conPlazo ? ahora + c.partida.plazoJornadaHoras * 3600_000 : null;
  const jornadaId = await repoTorneo.guardarJornada(c.id, { ...j, estado: 'abierta' }, { abreEn: ahora, venceEn });
  await repoTorneo.guardar(c.id, c.torneo);
  await crearPartidosJornada(c, j.numero, j.cruces, { eliminatoria: esEliminatoria(j), jornadaId }, venceEn);
  await emitirTorneo(c, ctx);
  if (!silenciosas.has(c)) await emitirPreparacion(c, ctx, venceEn);
  // Los partidos sin humanos se resuelven ya; los demás esperan a que su humano los abra.
  if (c.partida.modo !== 'duelos') await resolverPartidosSinHumanos(c, ctx);
  if (venceEn === null) {
    // Duelos: los cruces cuyos onces ya están fijados se resuelven al abrir la ronda.
    await resolverDuelos(c, ctx, deps);
    return;
  }
  await avisarHumanos(
    c,
    deps,
    c.participantes.map((p) => p.id),
    'jornada_abierta',
    `Se abre la jornada ${j.numero}. Tienes hasta el ${new Date(venceEn).toISOString().replace('T', ' ').slice(0, 16)} (UTC) para jugar tu partido.`,
  );
  programarPlazos(c, deps, j.numero, venceEn);
  await resolverDuelos(c, ctx, deps);
}

function programarPlazos(c: ControladorPartida, deps: DependenciasTorneo, numero: number, venceEn: number): void {
  const { temporizadores, logger } = c.servicios;
  temporizadores.programar(c.clave(`plazo:${numero}`), venceEn, () => {
    void c.ejecutar((ctx) => vencerJornada(c, ctx, numero)).catch((err: unknown) => logger.error({ err, partidaId: c.id }, 'Error al vencer la jornada'));
  });
  temporizadores.programar(c.clave(`aviso-plazo:${numero}`), venceEn - AVISO_PLAZO_MS, () => {
    void c
      .ejecutar(async () => {
        if (c.jornada?.numero !== numero) return;
        const pendientes = new Set<string>();
        for (const cruce of c.jornada.cruces) {
          const fila = await c.servicios.repoPartidos.obtener(cruce.partidoId);
          if (fila?.estado === 'programado') for (const pid of [cruce.local, cruce.visitante]) pendientes.add(pid);
        }
        await avisarHumanos(c, deps, [...pendientes], 'plazo_proximo', `Quedan 2 horas para que venza el plazo de la jornada ${numero}.`);
      })
      .catch((err: unknown) => logger.error({ err, partidaId: c.id }, 'Error en el aviso de plazo'));
  });
}

/** Vence el plazo de una jornada: se resuelve todo lo pendiente (FR-056a; spec 002, FR-030). */
async function vencerJornada(c: ControladorPartida, ctx: ContextoComando, numero: number): Promise<void> {
  if (!c.jornada || c.jornada.numero !== numero) return;
  // Duelos: al vencer el plazo, la alineación automática de quien no confirmó, también bloqueada.
  if (c.partida.modo === 'duelos') {
    await c.resolverDuelos?.(ctx, { forzar: true });
    return;
  }
  for (const cruce of [...c.jornada.cruces]) {
    const enCurso = c.partidosEnCurso.get(cruce.partidoId);
    if (enCurso) {
      await forzarFinal(c, ctx, enCurso);
      continue;
    }
    const fila = await c.servicios.repoPartidos.obtener(cruce.partidoId);
    if (fila?.estado !== 'programado') continue;
    if (entreHumanos(c, fila)) await resolverPartidoEntreHumanos(c, ctx, fila.id, { resolucion: 'plazo' });
    else await iniciarPartido(c, ctx, fila, { automatico: true });
  }
}

export type ResultadoAbrir =
  | { modo: 'directo' | 'reproduccion'; modalidad: ModoSimulacion }
  | { modo: 'duelos'; duelos: ResultadoCruce; cartas: Record<number, unknown> }
  | { error: 'PARTIDO_NO_ENCONTRADO' | 'JORNADA_NO_ABIERTA' };

/**
 * «Comenzar partido» o «Ver partido» (`POST /api/partidos/:id/abrir`, research R8 y R9). Contra un NPC,
 * empieza el partido en directo; contra un humano, lo resuelve si aún no lo está. Es idempotente.
 */
export async function abrirPartido(
  c: ControladorPartida,
  ctx: ContextoComando,
  participanteId: string,
  partidoId: string,
  pedida: ModoSimulacion = 'rapida',
): Promise<ResultadoAbrir> {
  const { repoPartidos, repoPartidas, repoPerfiles, reloj } = c.servicios;
  const fila = await repoPartidos.obtener(partidoId);
  if (!fila || fila.partidaId !== c.id || (fila.localId !== participanteId && fila.visitanteId !== participanteId)) {
    return { error: 'PARTIDO_NO_ENCONTRADO' };
  }
  // Cruce de duelos (spec 005): se resuelve ya si falta (fijando el once de quien lo abre) y se entrega para la animación.
  if (fila.tipo === 'duelos') {
    if (fila.estado === 'programado') {
      if (!c.jornada?.cruces.some((x) => x.partidoId === partidoId)) return { error: 'JORNADA_NO_ABIERTA' };
      await c.resolverDuelos?.(ctx, { forzar: true, soloPartido: fila.id });
    }
    const resuelta = await repoPartidos.obtener(partidoId);
    const duelos = resuelta?.duelos as ResultadoCruce | null;
    if (!resuelta || !duelos) return { error: 'JORNADA_NO_ABIERTA' };
    return { modo: 'duelos', duelos, cartas: cartasDelCruce(c, duelos) };
  }
  const rival = fila.localId === participanteId ? fila.visitanteId : fila.localId;
  const contraHumano = esHumano(c, rival) && esHumano(c, participanteId);
  if (fila.estado === 'programado' && !c.jornada?.cruces.some((x) => x.partidoId === partidoId)) return { error: 'JORNADA_NO_ABIERTA' };
  // La modalidad se fija en el primer `abrir` y ya no cambia (FR-035); se recuerda en el participante y, si es un
  // usuario registrado, en su perfil (FR-032).
  const modalidad = await repoPartidos.fijarModalidad(fila.id, participanteId, pedida);
  fila.modalidades = { ...((fila.modalidades as Record<string, ModoSimulacion> | null) ?? {}), [participanteId]: modalidad };
  await repoPartidas.fijarUltimaModalidad(participanteId, modalidad);
  const participante = c.participante(participanteId);
  if (participante) participante.ultimaModalidad = modalidad;
  if (participante?.usuarioId) await repoPerfiles.fijarUltimaModalidad(participante.usuarioId, modalidad, reloj.ahora());
  const enCurso = c.partidosEnCurso.get(fila.id);
  if (enCurso) enCurso.fila.modalidades = fila.modalidades;

  if (fila.estado === 'finalizado') return { modo: 'reproduccion', modalidad };
  if (fila.estado !== 'programado') return { modo: 'directo', modalidad };
  if (contraHumano) {
    await resolverPartidoEntreHumanos(c, ctx, fila.id, { resolucion: 'apertura', abiertoPorId: participanteId });
    return { modo: 'reproduccion', modalidad };
  }
  await iniciarPartido(c, ctx, fila);
  return { modo: 'directo', modalidad };
}

export type ResultadoSiguienteJornada = { ok: true } | { error: 'JORNADA_ABIERTA' | 'TORNEO_TERMINADO' | 'HAY_VARIOS_HUMANOS' };

/**
 * «Siguiente jornada» (`POST /api/partidas/:id/siguiente-jornada`, research R9): solo con un humano y con
 * la jornada anterior cerrada. La idempotencia por `Idempotency-Key` la da la ruta.
 */
export async function siguienteJornada(c: ControladorPartida, ctx: ContextoComando, deps: DependenciasTorneo): Promise<ResultadoSiguienteJornada> {
  if (!soloUnHumano(c.participantes)) return { error: 'HAY_VARIOS_HUMANOS' };
  const t = c.torneo;
  if (!t || t.campeon || c.partida.estado !== 'en_torneo') return { error: 'TORNEO_TERMINADO' };
  const j = jornadaActual(t);
  if (!j) return { error: 'TORNEO_TERMINADO' };
  if (j.estado === 'abierta') return { error: 'JORNADA_ABIERTA' };
  await abrirSiguienteJornada(c, ctx, deps);
  return { ok: true };
}

/** Titulares iniciales de cada equipo (para saber quién jugó, research R15). */
function titularesIniciales(p: PartidoEnCurso): { titulares?: { local: number[]; visitante: number[] } } {
  const entrada = p.fila.entrada as { local?: { titulares: { jugador: { id: number } }[] }; visitante?: { titulares: { jugador: { id: number } }[] } } | null;
  if (!entrada?.local || !entrada.visitante) return {};
  return { titulares: { local: entrada.local.titulares.map((t) => t.jugador.id), visitante: entrada.visitante.titulares.map((t) => t.jugador.id) } };
}

/** Registra el resultado de un partido terminado (antes de anunciar el final) y devuelve las bajas nuevas. */
async function registrarPartido(c: ControladorPartida, _ctx: ContextoComando, p: PartidoEnCurso): Promise<Baja[]> {
  if (!c.torneo || !c.jornada) return [];
  const indice = c.jornada.cruces.findIndex((x) => x.partidoId === p.fila.id);
  if (indice < 0) return [];
  const marcador = p.ultimo?.marcador ?? p.motor.marcador;
  const { torneo, bajasNuevas } = registrarResultado(c.torneo, {
    jornada: c.jornada.numero,
    indice,
    local: p.fila.localId,
    visitante: p.fila.visitanteId,
    golesLocal: marcador.local,
    golesVisitante: marcador.visitante,
    ...(marcador.penaltis ? { penaltis: marcador.penaltis } : {}),
    partidoId: p.fila.id,
    eventos: p.eventos as EventoPartido[],
    ...titularesIniciales(p),
  });
  c.torneo = torneo;
  await c.servicios.repoTorneo.guardar(c.id, torneo);
  return bajasNuevas;
}

/** Tras anunciar el final de un partido: actualización, cierre de jornada y lo que venga después. */
async function despuesDePartido(c: ControladorPartida, ctx: ContextoComando, deps: DependenciasTorneo): Promise<void> {
  if (!c.torneo || !c.jornada) return;
  const numero = c.jornada.numero;
  const { torneo, cerrada } = cerrarJornadaSiCompleta(c.torneo, numero);
  c.torneo = torneo;
  if (cerrada) {
    // Si la jornada sigue abierta, el torneo no ha cambiado desde que se registró el resultado (ya guardado).
    await c.servicios.repoTorneo.guardar(c.id, torneo);
    await c.servicios.repoTorneo.marcarJornada(c.id, numero, 'cerrada');
    c.servicios.temporizadores.cancelar(c.clave(`plazo:${numero}`));
    c.servicios.temporizadores.cancelar(c.clave(`aviso-plazo:${numero}`));
  }
  await emitirTorneo(c, ctx);
  if (!cerrada) return;
  if (torneo.campeon) {
    await terminarTorneo(c, ctx, deps);
    return;
  }
  // Con un solo humano, la siguiente jornada se abre cuando él lo pide (research R9). Sin humanos en competición,
  // el resto del torneo se juega con «Simular resto del torneo» (spec 003, FR-041a).
  if (soloUnHumano(c.participantes) || !hayHumanosEnCompeticion(c)) return;
  await abrirSiguienteJornada(c, ctx, deps);
}

export type ResultadoSimularResto =
  | { ok: true; campeon: { id: string; nombre: string } }
  | { error: 'NO_ELIMINADO' | 'HAY_HUMANOS_EN_COMPETICION' | 'TORNEO_TERMINADO' };

/**
 * «Simular resto del torneo» (spec 003, FR-041a y FR-041b; research R22): quien lo pide está eliminado y no
 * queda ningún humano en competición. En un solo comando del actor se abren y resuelven las jornadas que
 * faltan, sin emitir las actualizaciones intermedias; al final se emite una vez (el torneo termina con
 * `terminarTorneo` desde `despuesDePartido`). La idempotencia por `Idempotency-Key` la da la ruta.
 */
export async function simularResto(c: ControladorPartida, ctx: ContextoComando, deps: DependenciasTorneo, participanteId: string): Promise<ResultadoSimularResto> {
  const t = c.torneo;
  if (!t) return { error: 'TORNEO_TERMINADO' };
  if (!eliminacionDe(t, participanteId)) return { error: 'NO_ELIMINADO' };
  if (t.campeon || c.partida.estado !== 'en_torneo') return { error: 'TORNEO_TERMINADO' };
  if (await hayHumanosEnCompeticionVisibles(c, { excepto: participanteId })) return { error: 'HAY_HUMANOS_EN_COMPETICION' };
  silenciosas.add(c);
  try {
    for (let guarda = 0; guarda < 200 && !c.torneo!.campeon; guarda++) {
      const j = jornadaActual(c.torneo!);
      if (!j) break;
      if (j.estado === 'abierta') await resolverPartidosSinHumanos(c, ctx);
      else await abrirSiguienteJornada(c, ctx, deps);
    }
  } finally {
    silenciosas.delete(c);
  }
  await emitirTorneo(c, ctx);
  const campeon = c.torneo!.campeon;
  if (!campeon) return { error: 'TORNEO_TERMINADO' };
  return { ok: true, campeon: { id: campeon, nombre: nombre(c, campeon) } };
}

/** Marca vista la pantalla de derrota o la del campeón (spec 003, FR-041). Idempotente. */
export async function marcarPantallaVista(c: ControladorPartida, participanteId: string, pantalla: 'derrota' | 'campeon'): Promise<void> {
  const p = c.participante(participanteId);
  if (!p) return;
  const ahora = c.servicios.reloj.ahora();
  await c.servicios.repoPartidas.marcarPantallaVista(participanteId, pantalla, ahora);
  if (pantalla === 'derrota') p.derrotaVistaEn ??= new Date(ahora);
  else p.campeonVistoEn ??= new Date(ahora);
}

async function terminarTorneo(c: ControladorPartida, ctx: ContextoComando, deps: DependenciasTorneo): Promise<void> {
  await c.servicios.repoPartidas.actualizarEstado(c.id, 'terminada');
  c.partida = { ...c.partida, estado: transicion(c.partida.estado as 'en_torneo', 'terminar_torneo') };
  // Recompensa del campeón (spec 006, R14; FR-019): solo humanos registrados; idempotente por partida.
  const campeon = c.participante(c.torneo!.campeon!);
  if (campeon?.tipo === 'humano' && campeon.usuarioId) {
    await c.servicios.economia.recompensarTorneo(campeon.usuarioId, c.id, PARAMETROS_ECONOMIA.recompensaTorneo);
  }
  // A quien aún tiene partidos o duelos sin ver no se le nombra al campeón: lo verá al terminar de verlos.
  for (const p of c.participantes) {
    const sinVer = p.tipo === 'humano' && (await pendientesDe(c, p.id)).length > 0;
    const texto = sinVer ? 'El torneo ha terminado. Mira tus partidos pendientes para conocer al campeón.' : `El torneo ha terminado. Campeón: ${nombre(c, c.torneo!.campeon!)}.`;
    await avisarHumanos(c, deps, [p.id], 'torneo_terminado', texto);
  }
  const { emitirEstadoATodos } = await import('./vistas');
  await emitirEstadoATodos(c, ctx);
}

/**
 * Reprograma los plazos tras un reinicio del servidor. Además, al desplegar la spec 002 (research R9):
 * - una jornada con varios humanos que se abrió con el ritmo "en directo" de la spec 001 (un plazo más
 *   corto que el de la partida) recibe un plazo completo desde ahora;
 * - un partido entre humanos que estaba en juego (síncrono) se termina con `resolverResto`.
 */
export async function reprogramarTorneo(c: ControladorPartida, deps: DependenciasTorneo): Promise<void> {
  if (!c.torneo || c.partida.estado !== 'en_torneo') return;
  const j = jornadaActual(c.torneo);
  if (!j || j.estado !== 'abierta') return;
  const { repoTorneo, repoPartidos, reloj } = c.servicios;
  const fila = (await repoTorneo.jornadas(c.id)).find((x) => x.numero === j.numero);
  const partidos = (await repoPartidos.resumenesDePartida(c.id)).filter((x) => x.jornadaNumero === j.numero);
  const ahora = reloj.ahora();
  const plazoMs = c.partida.plazoJornadaHoras * 3600_000;
  let venceEn = fila?.venceEn?.getTime() ?? null;
  if (soloUnHumano(c.participantes)) venceEn = null;
  else {
    const abreEn = fila?.abreEn?.getTime() ?? ahora;
    if (venceEn === null || venceEn - abreEn < plazoMs) {
      venceEn = ahora + plazoMs;
      await repoTorneo.guardarJornada(c.id, j, { abreEn, venceEn });
    }
  }
  c.jornada = {
    numero: j.numero,
    partidoIds: partidos.map((x) => x.id),
    cruces: partidos.map((x) => ({ partidoId: x.id, local: x.localId, visitante: x.visitanteId })),
    venceEn,
  };
  if (venceEn !== null) programarPlazos(c, deps, j.numero, venceEn);
  const enJuego = partidos.filter((x) => x.estado !== 'programado' && x.estado !== 'finalizado' && entreHumanos(c, x));
  if (enJuego.length) {
    await c.ejecutar(async (ctx) => {
      for (const x of enJuego) await terminarPartidoEntreHumanosEnJuego(c, ctx, x.id);
    });
  }
}

/** Partidos del participante que aún no ha visto (research R8). */
async function pendientesDe(c: ControladorPartida, participanteId: string | undefined): Promise<string[]> {
  if (!participanteId) return [];
  return c.servicios.repoVisionados.pendientesDe(participanteId, c.id);
}

/**
 * Vista del torneo para un participante (FR-054; spec 002, FR-030): jornadas con resultados,
 * clasificación o cuadro, y campeón. Sus partidos "pendientes de ver" aparecen sin marcador y no cuentan
 * en la clasificación ni en el cuadro.
 */
export async function vistaTorneo(c: ControladorPartida, participanteId?: string) {
  const t = c.torneo;
  const siguiente = soloUnHumano(c.participantes) ? ('manual' as const) : ('automatica' as const);
  const yo = participanteId ? c.participante(participanteId) : undefined;
  const pantallas = { derrotaVista: !!yo?.derrotaVistaEn, campeonVisto: !!yo?.campeonVistoEn };
  if (!t) {
    return {
      modo: c.partida.modo,
      fase: null,
      jornadas: [],
      clasificacion: [],
      cuadro: null,
      campeon: null,
      jornadaActual: null,
      pendientesDeVer: [],
      siguienteJornada: siguiente,
      goleadores: [],
      asistentes: [],
      miEliminacion: null,
      puedeSimularResto: false,
      pantallas,
      recompensaFragmentos: null,
    };
  }
  const filasJornadas = await c.servicios.repoTorneo.jornadas(c.id);
  const partidos = await c.servicios.repoPartidos.resumenesDePartida(c.id);
  const pendientes = await pendientesDe(c, participanteId);
  const oculto = new Set(pendientes);
  // Cada NPC muestra su nivel en el torneo (T129); también el que sustituye a un humano que abandona.
  const ref = (pid?: string) => (pid ? { id: pid, nombre: nombre(c, pid), nivelNPC: nivelNPCDe(c, pid) } : null);
  // Cruces del cuadro decididos por un partido que este participante aún no ha visto: sin ganador.
  const crucesOcultos = new Set(
    partidos.filter((x) => oculto.has(x.id)).map((x) => [x.localId, x.visitanteId].sort().join()),
  );
  // Quien pasa de un cruce que no ha visto tampoco se revela en las rondas siguientes: allí sale «Por decidir» y esos
  // cruces van sin ganador ni partido. En duelos los cruces se resuelven al instante y, si no, el cuadro lo delataría.
  const pases = t.cuadro ? pasesOcultos(t.cuadro, crucesOcultos) : null;
  const refEnRonda = (ronda: number | undefined, pid?: string) => (ronda !== undefined && pid && pases?.ocultos[ronda]?.has(pid) ? null : ref(pid));
  // Eliminación propia (spec 003, FR-039): no se revela hasta que ha visto el partido que lo eliminó.
  const eliminacion = participanteId ? eliminacionVista(t, participanteId, partidos, oculto) : null;
  const miEliminacion = eliminacion ? { fase: eliminacion.fase, etiqueta: ETIQUETA_FASE[eliminacion.fase] } : null;
  // Fragmentos del campeón registrado (spec 006, R14), leídos del movimiento guardado.
  const recompensaFragmentos = yo?.usuarioId && t.campeon === participanteId ? await c.servicios.economia.recompensaDe(yo.usuarioId, c.id) : null;
  return {
    miEliminacion,
    recompensaFragmentos,
    puedeSimularResto:
      miEliminacion !== null && !t.campeon && c.partida.estado === 'en_torneo' && !(await hayHumanosEnCompeticionVisibles(c, { partidos, excepto: participanteId })),
    pantallas,
    modo: t.modo,
    fase: t.fase,
    jornadaActual: jornadaActual(t)?.numero ?? null,
    jornadas: t.jornadas.map((j) => {
      const fila = filasJornadas.find((x) => x.numero === j.numero);
      return {
        numero: j.numero,
        tipo: j.tipo,
        estado: j.estado,
        abreEn: fila?.abreEn?.toISOString() ?? null,
        venceEn: fila?.venceEn?.toISOString() ?? null,
        descansa: ref(j.descansa),
        partidos: j.cruces.map((cruce) => {
          const local = refEnRonda(j.rondaCuadro, cruce.local);
          const visitante = refEnRonda(j.rondaCuadro, cruce.visitante);
          const sinRevelar = local === null || visitante === null;
          const partido = sinRevelar ? undefined : partidos.find((x) => x.jornadaNumero === j.numero && x.localId === cruce.local && x.visitanteId === cruce.visitante);
          const pendiente = partido !== undefined && oculto.has(partido.id);
          return {
            partidoId: partido?.id ?? null,
            local,
            visitante,
            marcador: pendiente ? null : (partido?.marcador ?? null),
            estado: pendiente ? 'pendiente_de_ver' : (partido?.estado ?? 'pendiente'),
            resueltoAutomaticamente: partido && !pendiente ? resueltoAutomaticamente(partido) : false,
            resolucion: partido && !pendiente ? (partido.resolucion as 'directo' | 'apertura' | 'plazo' | 'npc') : null,
            tipo: (partido?.tipo ?? (t.modo === 'duelos' ? 'duelos' : 'futbol')) as 'futbol' | 'duelos',
          };
        }),
      };
    }),
    clasificacion:
      t.modo === 'playoff' || t.modo === 'duelos'
        ? []
        : clasificacionActual(t, { excluirPartidos: pendientes }).map((f, i) => ({
            posicion: i + 1,
            nombre: nombre(c, f.participanteId),
            nivelNPC: nivelNPCDe(c, f.participanteId),
            ...f,
          })),
    cuadro: t.cuadro
      ? {
          rondas: t.cuadro.rondas.map((r, k) => ({
            tipo: r.tipo,
            cruces: r.cruces.map((x, i) => ({
              local: refEnRonda(k, x.local),
              visitante: refEnRonda(k, x.visitante),
              ganador: pases?.sinGanador[k]?.[i] ? null : ref(x.ganador),
            })),
          })),
        }
      : null,
    // El campeón solo se oculta si la final es un partido que este participante aún no ha visto.
    campeon: pases?.sinGanador.at(-1)?.[0] ? null : ref(t.campeon ?? undefined),
    pendientesDeVer: pendientes,
    siguienteJornada: siguiente,
    // Máximos goleadores y asistentes (FR-039 a FR-042): sin los partidos que aún no ha visto.
    goleadores: await filasTabla(c, tablaGoleadores(t, { excluirPartidos: pendientes }), 10),
    asistentes: await filasTabla(c, tablaAsistentes(t, { excluirPartidos: pendientes }), 10),
  };
}

/**
 * Filas de una tabla de goleadores o asistentes para la vista, con el desempate final por nombre y apellidos
 * (FR-042) y las `limite` primeras (todas si es `null`).
 */
export async function filasTabla(c: ControladorPartida, filas: FilaTabla[], limite: number | null) {
  const { repoEquipo } = c.servicios;
  const catalogo = c.catalogo;
  const dorsales = new Map<string, Record<number, number> | null>();
  for (const pid of new Set(filas.map((f) => f.participanteId))) dorsales.set(pid, await repoEquipo.dorsales(pid));
  const conNombre = filas
    .map((f) => ({ f, j: catalogo.resumen(f.jugadorId) }))
    .sort((a, b) => b.f.total - a.f.total || a.f.partidosJugados - b.f.partidosJugados || `${a.j.nombre} ${a.j.apellidos}`.localeCompare(`${b.j.nombre} ${b.j.apellidos}`, 'es'));
  return conNombre.slice(0, limite ?? undefined).map(({ f, j }, i) => {
    const dorsal = dorsales.get(f.participanteId)?.[f.jugadorId];
    return {
      posicion: i + 1,
      jugador: { id: j.id, nombre: j.nombre, apellidos: j.apellidos, ...(dorsal !== undefined ? { dorsal } : {}) },
      equipo: { id: f.participanteId, nombre: nombre(c, f.participanteId) },
      total: f.total,
      partidosJugados: f.partidosJugados,
    };
  });
}

/** Tabla completa de goleadores o asistentes para un participante (`?todos=true`). */
export async function tablaCompleta(c: ControladorPartida, participanteId: string, cual: 'goleadores' | 'asistentes') {
  if (!c.torneo) return [];
  const excluirPartidos = await pendientesDe(c, participanteId);
  const filas = cual === 'goleadores' ? tablaGoleadores(c.torneo, { excluirPartidos }) : tablaAsistentes(c.torneo, { excluirPartidos });
  return filasTabla(c, filas, null);
}

/**
 * Qué no se puede revelar del cuadro a quien tiene cruces sin ver (`crucesOcultos`, por pareja): por ronda, los
 * participantes que han llegado a ella desde un cruce sin ver y los cruces cuyo ganador no se muestra (los no vistos y
 * los que tienen a alguno de esos participantes). Se propaga de ronda en ronda hasta la final.
 */
export function pasesOcultos(cuadro: NonNullable<EstadoTorneo['cuadro']>, crucesOcultos: ReadonlySet<string>) {
  const ocultos = cuadro.rondas.map(() => new Set<string>());
  const sinGanador = cuadro.rondas.map((r, k) =>
    r.cruces.map((x) => {
      const noVisto = !!x.local && !!x.visitante && crucesOcultos.has([x.local, x.visitante].sort().join());
      const oculto = noVisto || (!!x.local && ocultos[k]!.has(x.local)) || (!!x.visitante && ocultos[k]!.has(x.visitante));
      if (oculto && x.ganador) ocultos[k + 1]?.add(x.ganador);
      return oculto;
    }),
  );
  return { ocultos, sinGanador };
}

/** `torneo.actualizado` a cada humano con su propia vista (research R8). */
export async function emitirTorneo(c: ControladorPartida, ctx: ContextoComando, soloA?: string): Promise<void> {
  if (silenciosas.has(c)) return;
  for (const p of c.humanos()) {
    if (soloA && p.id !== soloA) continue;
    ctx.emitirA(p.id, { t: 'torneo.actualizado', ...(await vistaTorneo(c, p.id)) });
  }
}

/** Un humano abandona el torneo: su plaza pasa a un NPC intermedio (Edge Cases). */
export async function abandonar(c: ControladorPartida, ctx: ContextoComando, participanteId: string): Promise<void> {
  const p = c.participante(participanteId);
  if (!p || p.tipo !== 'humano' || p.controladoPorNPC) return;
  await c.servicios.repoPartidas.pasarANPC(participanteId);
  p.controladoPorNPC = true;
  p.nivelNPC = 'intermedio';
  // En el draft (spec 002, FR-019): el NPC que ocupa su plaza elige ya si no lo había hecho.
  if (c.partida.estado === 'en_draft') {
    const { abandonarDraft } = await import('./draft');
    await abandonarDraft(c, ctx, participanteId);
    return;
  }
  // Si estaba en un descanso, cuenta como listo.
  for (const partido of c.partidosEnCurso.values()) {
    if (partido.pausa && (partido.fila.localId === participanteId || partido.fila.visitanteId === participanteId)) partido.listos.add(participanteId);
  }
  await emitirTorneo(c, ctx);
  // Sus partidos pendientes contra NPC se quedan sin humanos: se resuelven ya, como los NPC contra NPC.
  await resolverPartidosSinHumanos(c, ctx);
}
