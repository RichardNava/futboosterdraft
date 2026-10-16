/**
 * Torneo en el servidor (T113; FR-051 a FR-056c).
 *
 * - Al terminar el draft se crea el torneo (calendario o cuadro) y se abre la primera jornada.
 * - En directo: preparación → partidos → cierre → siguiente jornada tras el tiempo de preparación.
 * - En asíncrono: la jornada se abre con un plazo; un partido empieza cuando sus humanos están listos
 *   (contra un NPC, cuando el humano lo inicia); al vencer el plazo, lo pendiente se resuelve
 *   automáticamente sin descanso interactivo, y la siguiente jornada se abre al cerrarse la anterior.
 * - Tras cada partido: resultado, bajas y amarillas, `torneo.actualizado`, y cierre de jornada, paso a
 *   la fase final del mixto o campeón.
 *
 * Los plazos de jornada se guardan en la tabla `jornadas` y se reprograman al rehidratar la partida
 * (research R6, ver nota sobre pg-boss): cada vencimiento comprueba el estado antes de actuar, así que
 * se ejecuta una sola vez.
 */
import {
  abrirJornada,
  bajasActivas,
  cerrarJornadaSiCompleta,
  clasificacionActual,
  crearTorneo,
  esEliminatoria,
  jornadaActual,
  registrarResultado,
  transicion,
  type Baja,
  type EstadoTorneo,
} from '@fbd/domain';
import type { EventoPartido } from '@fbd/engine';
import type { ServicioAvisos, TipoAviso } from '../avisos/servicio';
import type { ContextoComando } from './actor';
import type { ControladorPartida } from './partida';
import { forzarFinal, iniciarPartido, nivelNPCDe, type PartidoEnCurso } from './partidoRapido';
import { crearPartidosJornada, emitirPreparacion, programarInicio } from './preparacion';

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
  c.programarPrimeraJornada ??= (ctx) => iniciarTorneo(c, ctx, deps);
}

export async function iniciarTorneo(c: ControladorPartida, ctx: ContextoComando, deps: DependenciasTorneo): Promise<void> {
  const participantes = c.mesas.flatMap((m) => m.mesa.participantes);
  const mesas = c.mesas.map((m) => m.mesa.participantes);
  c.torneo = crearTorneo(c.partida.modo as EstadoTorneo['modo'], participantes, mesas, c.partida.semilla);
  await c.servicios.repoTorneo.guardar(c.id, c.torneo);
  await abrirSiguienteJornada(c, ctx, deps, true);
}

async function abrirSiguienteJornada(c: ControladorPartida, ctx: ContextoComando, deps: DependenciasTorneo, inicial = false): Promise<void> {
  const t = c.torneo!;
  const j = jornadaActual(t);
  if (!j) return;
  c.torneo = abrirJornada(t, j.numero);
  const { reloj, repoTorneo } = c.servicios;
  const ahora = reloj.ahora();
  const asincrono = c.partida.ritmo === 'asincrono';
  const tiempos = c.partida.tiempos as { preparacionS: number; preparacionInicialS: number };
  const venceEn = asincrono
    ? ahora + c.partida.plazoJornadaHoras * 3600_000
    : ahora + (inicial ? tiempos.preparacionInicialS : tiempos.preparacionS) * 1000;
  const jornadaId = await repoTorneo.guardarJornada(c.id, { ...j, estado: 'abierta' }, { abreEn: ahora, venceEn });
  await repoTorneo.guardar(c.id, c.torneo);
  await crearPartidosJornada(c, j.numero, j.cruces, { eliminatoria: esEliminatoria(j), jornadaId }, asincrono ? null : venceEn);
  ctx.emitirATodos({ t: 'torneo.actualizado', ...(await vistaTorneo(c)) });

  if (!asincrono) {
    emitirPreparacion(c, ctx, venceEn);
    programarInicio(c, j.numero, venceEn);
    return;
  }
  // Asíncrono: los partidos sin humanos se resuelven ya; el resto espera a que estén listos.
  for (const cruce of c.jornada!.cruces) {
    const humanos = [cruce.local, cruce.visitante].filter((pid) => esHumanoActivo(c, pid));
    if (humanos.length === 0) {
      const fila = await c.servicios.repoPartidos.obtener(cruce.partidoId);
      if (fila?.estado === 'programado') await iniciarPartido(c, ctx, fila);
    }
  }
  await avisarHumanos(
    c,
    deps,
    c.participantes.map((p) => p.id),
    'jornada_abierta',
    `Se abre la jornada ${j.numero}. Tienes hasta el ${new Date(venceEn).toISOString().replace('T', ' ').slice(0, 16)} (UTC) para jugar tu partido.`,
  );
  programarPlazos(c, deps, j.numero, venceEn);
}

const esHumanoActivo = (c: ControladorPartida, pid: string) => c.participante(pid)?.tipo === 'humano' && !c.participante(pid)?.controladoPorNPC;

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

/** Vence el plazo de una jornada asíncrona: se resuelve todo lo pendiente (FR-056a). */
async function vencerJornada(c: ControladorPartida, ctx: ContextoComando, numero: number): Promise<void> {
  if (!c.jornada || c.jornada.numero !== numero) return;
  for (const cruce of [...c.jornada.cruces]) {
    const enCurso = c.partidosEnCurso.get(cruce.partidoId);
    if (enCurso) {
      await forzarFinal(c, ctx, enCurso);
      continue;
    }
    const fila = await c.servicios.repoPartidos.obtener(cruce.partidoId);
    if (fila?.estado === 'programado') await iniciarPartido(c, ctx, fila, { automatico: true });
  }
}

/** Asíncrono: un humano está listo para jugar su partido (POST /api/partidos/:id/listo). */
export async function marcarListo(c: ControladorPartida, ctx: ContextoComando, deps: DependenciasTorneo, participanteId: string, partidoId: string) {
  const cruce = c.jornada?.cruces.find((x) => x.partidoId === partidoId);
  if (!cruce || (cruce.local !== participanteId && cruce.visitante !== participanteId)) return { error: 'PARTIDO_NO_ENCONTRADO' as const };
  const fila = await c.servicios.repoPartidos.obtener(partidoId);
  if (fila?.estado !== 'programado') return { error: 'PARTIDO_INICIADO' as const };
  const listos = c.listosAsincrono.get(partidoId) ?? new Set<string>();
  listos.add(participanteId);
  c.listosAsincrono.set(partidoId, listos);
  const humanos = [cruce.local, cruce.visitante].filter((pid) => esHumanoActivo(c, pid));
  if (humanos.every((pid) => listos.has(pid))) {
    c.listosAsincrono.delete(partidoId);
    await iniciarPartido(c, ctx, fila);
    return { iniciado: true };
  }
  const rival = cruce.local === participanteId ? cruce.visitante : cruce.local;
  await avisarHumanos(c, deps, [rival], 'rival_listo', `${nombre(c, participanteId)} está listo para jugar vuestro partido.`, partidoId);
  return { iniciado: false };
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
  ctx.emitirATodos({ t: 'torneo.actualizado', ...(await vistaTorneo(c)) });
  if (!cerrada) return;
  if (torneo.campeon) {
    await terminarTorneo(c, ctx, deps);
    return;
  }
  await abrirSiguienteJornada(c, ctx, deps);
}

async function terminarTorneo(c: ControladorPartida, ctx: ContextoComando, deps: DependenciasTorneo): Promise<void> {
  await c.servicios.repoPartidas.actualizarEstado(c.id, 'terminada');
  c.partida = { ...c.partida, estado: transicion(c.partida.estado as 'en_torneo', 'terminar_torneo') };
  await avisarHumanos(
    c,
    deps,
    c.participantes.map((p) => p.id),
    'torneo_terminado',
    `El torneo ha terminado. Campeón: ${nombre(c, c.torneo!.campeon!)}.`,
  );
  const { emitirEstadoATodos } = await import('./vistas');
  await emitirEstadoATodos(c, ctx);
}

/** Reprograma los plazos tras un reinicio del servidor. */
export async function reprogramarTorneo(c: ControladorPartida, deps: DependenciasTorneo): Promise<void> {
  if (!c.torneo || c.partida.estado !== 'en_torneo') return;
  const j = jornadaActual(c.torneo);
  if (!j || j.estado !== 'abierta') return;
  const filas = await c.servicios.repoTorneo.jornadas(c.id);
  const fila = filas.find((x) => x.numero === j.numero);
  const partidos = (await c.servicios.repoPartidos.resumenesDePartida(c.id)).filter((x) => x.jornadaNumero === j.numero);
  const venceEn = fila?.venceEn?.getTime() ?? c.servicios.reloj.ahora();
  const pendientePreparacion = c.partida.ritmo === 'directo' && partidos.every((x) => x.estado === 'programado');
  c.jornada = {
    numero: j.numero,
    partidoIds: partidos.map((x) => x.id),
    cruces: partidos.map((x) => ({ partidoId: x.id, local: x.localId, visitante: x.visitanteId })),
    preparacionVenceEn: pendientePreparacion ? venceEn : null,
  };
  if (c.partida.ritmo === 'directo') {
    if (pendientePreparacion) programarInicio(c, j.numero, venceEn);
  } else {
    programarPlazos(c, deps, j.numero, venceEn);
  }
}

/** Vista del torneo: jornadas con resultados, clasificación o cuadro, y campeón (FR-054). */
export async function vistaTorneo(c: ControladorPartida) {
  const t = c.torneo;
  if (!t) return { modo: c.partida.modo, fase: null, jornadas: [], clasificacion: [], cuadro: null, campeon: null, jornadaActual: null };
  const filasJornadas = await c.servicios.repoTorneo.jornadas(c.id);
  const partidos = await c.servicios.repoPartidos.resumenesDePartida(c.id);
  // Cada NPC muestra su nivel en el torneo (T129); también el que sustituye a un humano que abandona.
  const ref = (pid?: string) => (pid ? { id: pid, nombre: nombre(c, pid), nivelNPC: nivelNPCDe(c, pid) } : null);
  return {
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
          const partido = partidos.find((x) => x.jornadaNumero === j.numero && x.localId === cruce.local && x.visitanteId === cruce.visitante);
          return {
            partidoId: partido?.id ?? null,
            local: ref(cruce.local),
            visitante: ref(cruce.visitante),
            marcador: partido?.marcador ?? null,
            estado: partido?.estado ?? 'pendiente',
            resueltoAutomaticamente: partido?.resueltoAutomaticamente ?? false,
            listos: partido ? [...(c.listosAsincrono.get(partido.id) ?? [])] : [],
          };
        }),
      };
    }),
    clasificacion:
      t.modo === 'playoff' ? [] : clasificacionActual(t).map((f, i) => ({ posicion: i + 1, nombre: nombre(c, f.participanteId), nivelNPC: nivelNPCDe(c, f.participanteId), ...f })),
    cuadro: t.cuadro
      ? {
          rondas: t.cuadro.rondas.map((r) => ({
            tipo: r.tipo,
            cruces: r.cruces.map((x) => ({ local: ref(x.local), visitante: ref(x.visitante), ganador: ref(x.ganador) })),
          })),
        }
      : null,
    campeon: ref(t.campeon ?? undefined),
  };
}

/** Un humano abandona el torneo: su plaza pasa a un NPC intermedio (Edge Cases). */
export async function abandonar(c: ControladorPartida, ctx: ContextoComando, participanteId: string): Promise<void> {
  const p = c.participante(participanteId);
  if (!p || p.tipo !== 'humano' || p.controladoPorNPC) return;
  await c.servicios.repoPartidas.pasarANPC(participanteId);
  p.controladoPorNPC = true;
  p.nivelNPC = 'intermedio';
  // Si estaba en un descanso, cuenta como listo.
  for (const partido of c.partidosEnCurso.values()) {
    if (partido.pausa && (partido.fila.localId === participanteId || partido.fila.visitanteId === participanteId)) partido.listos.add(participanteId);
  }
  ctx.emitirATodos({ t: 'torneo.actualizado', ...(await vistaTorneo(c)) });
}
