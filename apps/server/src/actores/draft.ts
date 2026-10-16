/**
 * Draft en el servidor (T050; FR-006 a FR-013).
 *
 * - Genera los sobres de cada mesa al empezar y los persiste.
 * - Abre cada turno: los NPC eligen al instante; a cada humano se le envía su propio sobre.
 * - Procesa las elecciones (validadas por el dominio) y las persiste antes de anunciarlas.
 * - `draft.progreso` nunca revela qué carta se eligió.
 * - Al vencer el plazo, elige automáticamente por quien falte y se lo comunica (`draft.eleccion_auto`).
 * - Al terminar todas las mesas, guarda las plantillas y pasa la partida a `en_torneo`.
 */
import { elegirCarta } from '@fbd/ai';
import {
  crearMesa,
  derivarSemilla,
  elegir,
  equipacionesAleatorias,
  ErrorDraft,
  generarMesa,
  parametrosActuales,
  plantillas,
  resolverTurno,
  sobreDe,
  todosEligieron,
  transicion,
  vistaParticipante,
  type Mesa,
  type NivelNPC,
} from '@fbd/domain';
import type { ContextoComando } from './actor';
import type { ControladorPartida } from './partida';

/** Crea las mesas (1, o 2 de 8 en el playoff de 16) a partir de los participantes ya sentados. */
export async function iniciarDraft(c: ControladorPartida, ctx: ContextoComando, asientos: string[][]): Promise<void> {
  const { catalogo, reloj, repoDraft, repoPartidas, db } = c.servicios;
  const ahora = reloj.ahora();
  const pool = catalogo.pool(c.partida.colecciones);
  const tiempos = c.partida.tiempos as { turnoDraftS: number };

  const nuevas = asientos.map((participantes, indice) => {
    const semilla = derivarSemilla(c.partida.semilla, `mesa:${indice}`);
    const sobres = generarMesa(pool, participantes.length, semilla, parametrosActuales());
    const mesa = crearMesa({
      participantes,
      sobres,
      medias: catalogo.medias(sobres.flatMap((s) => s.cartas)),
      ahora,
      turnoS: tiempos.turnoDraftS,
    });
    return { indice, semilla, mesa };
  });

  await db.transaction(async (tx) => {
    await repoPartidas.asignarAsientos(
      nuevas.flatMap((m) => m.mesa.participantes.map((participanteId, asiento) => ({ participanteId, mesaIndice: m.indice, asiento }))),
      tx,
    );
    for (const m of nuevas) {
      const id = await repoDraft.crearMesa({ partidaId: c.id, indice: m.indice, semilla: m.semilla, mesa: m.mesa }, tx);
      c.mesas.push({ id, indice: m.indice, semilla: m.semilla, mesa: m.mesa });
    }
    await repoPartidas.actualizarEstado(c.id, 'en_draft', tx);
  });
  c.partida = { ...c.partida, estado: transicion(c.partida.estado as 'buscando', 'iniciar_draft') };
  for (const p of c.participantes) {
    const m = c.mesas.find((x) => x.mesa.participantes.includes(p.id));
    if (m) p.asiento = m.mesa.participantes.indexOf(p.id);
  }

  for (const m of c.mesas) await abrirTurno(c, ctx, m.indice);
}

/** Abre el turno actual de una mesa: elecciones NPC, envío de sobres y temporizador. */
export async function abrirTurno(c: ControladorPartida, ctx: ContextoComando, indice: number): Promise<void> {
  const m = c.mesas.find((x) => x.indice === indice);
  if (!m || m.mesa.estado !== 'en_turno') return;
  const ahora = c.servicios.reloj.ahora();

  // Los NPC eligen al instante (con el mismo límite de tiempo que los humanos, FR-057).
  const antes = m.mesa.elecciones.length;
  for (const pid of m.mesa.participantes) {
    const p = c.participante(pid);
    if (p?.tipo !== 'npc' && !p?.controladoPorNPC) continue;
    m.mesa = elegir(m.mesa, pid, eleccionNPC(c, m.mesa, m.semilla, pid, (p.nivelNPC as NivelNPC | null) ?? 'intermedio'), ahora, 'npc');
  }
  await c.servicios.repoDraft.guardarElecciones(m.id, m.mesa.elecciones.slice(antes), ahora);

  if (todosEligieron(m.mesa)) {
    await resolver(c, ctx, indice);
    return;
  }
  for (const pid of m.mesa.participantes) {
    if (c.participante(pid)?.tipo === 'humano') ctx.emitirA(pid, mensajeTurno(c, m.indice, m.mesa, pid));
  }
  emitirProgreso(c, ctx, m.mesa);
  c.servicios.temporizadores.programar(c.clave(`turno:${indice}`), m.mesa.venceEn + 1, () => {
    void c.ejecutar((ctx2) => vencerTurno(c, ctx2, indice)).catch((err: unknown) =>
      c.servicios.logger.error({ err, partidaId: c.id }, 'Error al vencer un turno de draft'),
    );
  });
}

/** Carta que elige un NPC según su nivel (T128): mira su sobre, su plantilla parcial y cuántos quedan en la mesa. */
function eleccionNPC(c: ControladorPartida, mesa: Mesa, semillaMesa: string, pid: string, nivel: NivelNPC): number {
  const { catalogo } = c.servicios;
  const sobre = sobreDe(mesa, pid).restantes.map((id) => catalogo.jugador(id));
  const parcial = vistaParticipante(mesa, pid).misElecciones.map((id) => catalogo.jugador(id));
  const semilla = derivarSemilla(semillaMesa, `npc:${pid}:${mesa.ronda}:${mesa.turno}`);
  return elegirCarta(nivel, sobre, parcial, mesa.ronda, mesa.turno, semilla, { participantes: mesa.participantes.length });
}

export type ResultadoEleccion = { ok: true } | { ok: false; error: { codigo: string; mensaje: string } };

/** Elección manual de un participante humano (mensaje `draft.elegir`). */
export async function procesarEleccion(
  c: ControladorPartida,
  ctx: ContextoComando,
  participanteId: string,
  datos: { ronda: number; turno: number; jugadorId: number },
): Promise<ResultadoEleccion> {
  const m = c.mesaDe(participanteId);
  if (!m || c.partida.estado !== 'en_draft') {
    return { ok: false, error: { codigo: 'DRAFT_NO_ACTIVO', mensaje: 'No hay un draft en curso' } };
  }
  const ahora = c.servicios.reloj.ahora();
  if (m.mesa.estado !== 'en_turno' || datos.ronda !== m.mesa.ronda || datos.turno !== m.mesa.turno) {
    return { ok: false, error: { codigo: 'TURNO_CERRADO', mensaje: 'El turno ya está cerrado' } };
  }
  try {
    const nueva = elegir(m.mesa, participanteId, datos.jugadorId, ahora, 'manual');
    await c.servicios.repoDraft.guardarElecciones(m.id, nueva.elecciones.slice(m.mesa.elecciones.length), ahora);
    m.mesa = nueva;
  } catch (e) {
    if (e instanceof ErrorDraft) return { ok: false, error: { codigo: e.codigo, mensaje: e.message } };
    throw e;
  }
  emitirProgreso(c, ctx, m.mesa);
  if (todosEligieron(m.mesa)) await resolver(c, ctx, m.indice);
  return { ok: true };
}

/** Vencimiento del plazo de un turno. */
export async function vencerTurno(c: ControladorPartida, ctx: ContextoComando, indice: number): Promise<void> {
  const m = c.mesas.find((x) => x.indice === indice);
  if (!m || m.mesa.estado !== 'en_turno' || c.servicios.reloj.ahora() <= m.mesa.venceEn) return;
  await resolver(c, ctx, indice);
}

async function resolver(c: ControladorPartida, ctx: ContextoComando, indice: number): Promise<void> {
  const m = c.mesas.find((x) => x.indice === indice)!;
  const { reloj, repoDraft, db, metricas, temporizadores, catalogo } = c.servicios;
  const ahora = reloj.ahora();
  const inicio = Date.now();
  temporizadores.cancelar(c.clave(`turno:${indice}`));

  const antes = m.mesa.elecciones.length;
  const anterior = m.mesa;
  const nueva = resolverTurno(anterior, ahora);
  const automaticas = nueva.elecciones.slice(antes);
  await db.transaction(async (tx) => {
    await repoDraft.guardarElecciones(m.id, automaticas, ahora, tx);
    await repoDraft.actualizarMesa(m.id, nueva, tx);
  });
  m.mesa = nueva;

  for (const e of automaticas) {
    if (c.participante(e.participanteId)?.tipo !== 'humano') continue;
    ctx.emitirA(e.participanteId, {
      t: 'draft.eleccion_auto',
      ronda: e.ronda,
      turno: e.turno,
      jugador: catalogo.resumen(e.jugadorId),
    });
  }

  if (nueva.estado === 'terminada') {
    if (c.mesas.every((x) => x.mesa.estado === 'terminada')) await terminarDraft(c, ctx);
  } else {
    await abrirTurno(c, ctx, indice);
  }
  metricas.turnoDraftResolucionMs.observe(Date.now() - inicio);
}

async function terminarDraft(c: ControladorPartida, ctx: ContextoComando): Promise<void> {
  const { repoDraft, repoPartidas, db, catalogo } = c.servicios;
  const todas: Record<string, number[]> = {};
  for (const m of c.mesas) Object.assign(todas, plantillas(m.mesa));
  await db.transaction(async (tx) => {
    await repoDraft.guardarPlantillas(todas, tx);
    // Cada equipo recibe colores aleatorios para su primera y segunda equipación (FR-031b).
    for (const p of c.participantes) {
      const e = equipacionesAleatorias(derivarSemilla(c.partida.semilla, `equipaciones:${p.id}`), parametrosActuales());
      await c.servicios.repoEquipo.guardarEquipaciones(p.id, e, tx);
      p.equipaciones = e;
    }
    await repoPartidas.actualizarEstado(c.id, 'en_torneo', tx);
  });
  c.partida = { ...c.partida, estado: transicion(c.partida.estado as 'en_draft', 'terminar_draft') };
  // Primera jornada del torneo: preparación del equipo y, al vencer, los partidos.
  await c.programarPrimeraJornada?.(ctx);
  const { emitirEstadoATodos } = await import('./vistas');
  await emitirEstadoATodos(c, ctx);
  // Al terminar el draft, las plantillas de todos pasan a ser visibles (FR-054a).
  ctx.emitirATodos({
    t: 'draft.terminado',
    plantillas: Object.entries(todas).map(([participanteId, ids]) => ({
      participanteId,
      jugadores: ids.map((id) => catalogo.resumen(id)),
    })),
  });
}

function emitirProgreso(c: ControladorPartida, ctx: ContextoComando, mesa: Mesa): void {
  const eligieron = mesa.participantes.filter((p) => mesa.elecciones.some((e) => e.participanteId === p && e.ronda === mesa.ronda && e.turno === mesa.turno));
  for (const pid of mesa.participantes) {
    if (c.participante(pid)?.tipo === 'humano') {
      ctx.emitirA(pid, { t: 'draft.progreso', ronda: mesa.ronda, turno: mesa.turno, eligieron });
    }
  }
}

function mensajeTurno(c: ControladorPartida, indice: number, mesa: Mesa, participanteId: string) {
  const v = vistaParticipante(mesa, participanteId);
  const { catalogo } = c.servicios;
  return {
    t: 'draft.turno',
    mesa: indice,
    ronda: v.ronda,
    turno: v.turno,
    direccion: v.direccion,
    sobre: { id: v.sobre.id, cartas: v.sobre.cartas.map((id) => catalogo.resumen(id)) },
    venceEn: new Date(v.venceEn).toISOString(),
    misElecciones: v.misElecciones.map((id) => catalogo.resumen(id)),
  };
}

/** Vista completa del draft para el mensaje `estado` (al conectar o reconectar). */
export function vistaDraft(c: ControladorPartida, participanteId: string) {
  const m = c.mesaDe(participanteId);
  if (!m) return null;
  const v = vistaParticipante(m.mesa, participanteId);
  const { catalogo } = c.servicios;
  return {
    mesa: m.indice,
    ronda: v.ronda,
    turno: v.turno,
    direccion: v.direccion,
    terminada: v.terminada,
    sobre: { id: v.sobre.id, cartas: v.sobre.cartas.map((id) => catalogo.resumen(id)) },
    venceEn: new Date(v.venceEn).toISOString(),
    misElecciones: v.misElecciones.map((id) => catalogo.resumen(id)),
    eleccionActual: v.eleccionActual === null ? null : catalogo.resumen(v.eleccionActual),
    eligieron: v.eligieron,
    participantes: m.mesa.participantes.map((pid) => {
      const p = c.participante(pid);
      return { id: pid, nombre: p ? c.nombreDe(p) : pid, tipo: p?.tipo ?? 'npc', asiento: m.mesa.participantes.indexOf(pid) };
    }),
  };
}

/** Rehidratación: reprograma los temporizadores de turno y deja que venzan si ya pasó el plazo. */
export function reprogramarTurnos(c: ControladorPartida): void {
  for (const m of c.mesas) {
    if (m.mesa.estado !== 'en_turno') continue;
    c.servicios.temporizadores.programar(c.clave(`turno:${m.indice}`), m.mesa.venceEn + 1, () => {
      void c.ejecutar((ctx) => vencerTurno(c, ctx, m.indice)).catch((err: unknown) =>
        c.servicios.logger.error({ err, partidaId: c.id }, 'Error al vencer un turno de draft'),
      );
    });
  }
}
