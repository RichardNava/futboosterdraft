/**
 * Jornadas en el servidor (T094; spec 002, research R9): creación de los partidos y aviso de preparación.
 *
 * Ya no hay temporizador de preparación: cada humano recibe `preparacion.inicio` con su rival y, si la
 * partida tiene varios humanos, el plazo de la jornada. Su partido empieza cuando lo abre con «Comenzar
 * partido» o «Ver partido» (`POST /api/partidos/:id/abrir`), o se resuelve solo al vencer el plazo.
 */
import { derivarSemilla, parametrosActuales, type Emparejamiento, type ModoSimulacion } from '@fbd/domain';
import type { ContextoComando } from './actor';
import type { ControladorPartida } from './partida';
import { iniciarPartido, sinHumanos } from './partidoRapido';

export interface OpcionesJornada {
  eliminatoria?: boolean;
  jornadaId?: string | null;
  inicial?: boolean;
}

/** Crea los partidos de la jornada (en estado "programado") y la deja como jornada actual. */
export async function crearPartidosJornada(
  c: ControladorPartida,
  numero: number,
  emparejamientos: Emparejamiento[],
  opciones: OpcionesJornada,
  venceEn: number | null,
): Promise<void> {
  const cruces: { partidoId: string; local: string; visitante: string }[] = [];
  for (const [i, e] of emparejamientos.entries()) {
    const fila = await c.servicios.repoPartidos.crear({
      partidaId: c.id,
      jornadaId: opciones.jornadaId ?? null,
      jornadaNumero: numero,
      localId: e.local,
      visitanteId: e.visitante,
      eliminatoria: opciones.eliminatoria ?? false,
      semilla: derivarSemilla(c.partida.semilla, `partido:${numero}:${i}`),
      versionParametros: parametrosActuales().version,
      ...(c.partida.modo === 'duelos' ? { tipo: 'duelos' as const } : {}),
    });
    cruces.push({ partidoId: fila.id, local: e.local, visitante: e.visitante });
  }
  c.partidosEnCurso.clear();
  c.jornada = { numero, partidoIds: cruces.map((x) => x.partidoId), cruces, venceEn };
}

/**
 * Jornada con unos cruces dados (las pruebas la usan para fijar quién juega contra quién): partidos,
 * aviso de preparación y, sin humanos, resolución inmediata. Sin plazo.
 */
export async function programarJornada(
  c: ControladorPartida,
  ctx: ContextoComando,
  numero: number,
  emparejamientos: Emparejamiento[],
  opciones: OpcionesJornada = {},
): Promise<void> {
  await crearPartidosJornada(c, numero, emparejamientos, opciones, null);
  await emitirPreparacion(c, ctx, null);
  await resolverPartidosSinHumanos(c, ctx);
}

/** Los partidos de la jornada sin ningún humano (NPC contra NPC) se resuelven al abrirla (research R9). */
export async function resolverPartidosSinHumanos(c: ControladorPartida, ctx: ContextoComando): Promise<void> {
  for (const cruce of c.jornada?.cruces ?? []) {
    if (!sinHumanos(c, { localId: cruce.local, visitanteId: cruce.visitante })) continue;
    const fila = await c.servicios.repoPartidos.obtener(cruce.partidoId);
    if (fila?.estado === 'programado') await iniciarPartido(c, ctx, fila);
  }
}

/**
 * Modalidad preseleccionada en la preparación (spec 003, FR-032): la última con la que el participante abrió un
 * partido de esta partida; si no hay, la última de su perfil (usuarios registrados); si tampoco, la rápida.
 */
export async function modalidadPreferida(c: ControladorPartida, participanteId: string): Promise<ModoSimulacion> {
  const p = c.participante(participanteId);
  const propia = p?.ultimaModalidad as ModoSimulacion | null | undefined;
  if (propia) return propia;
  if (p?.usuarioId) return (await c.servicios.repoPerfiles.obtenerUltimaModalidad(p.usuarioId)) ?? 'rapida';
  return 'rapida';
}

export async function emitirPreparacion(c: ControladorPartida, ctx: ContextoComando, venceEn: number | null): Promise<void> {
  for (const cruce of c.jornada?.cruces ?? []) {
    for (const [pid, rival] of [
      [cruce.local, cruce.visitante],
      [cruce.visitante, cruce.local],
    ] as const) {
      if (c.participante(pid)?.tipo !== 'humano') continue;
      const r = c.participante(rival);
      ctx.emitirA(pid, {
        t: 'preparacion.inicio',
        jornada: c.jornada?.numero ?? null,
        partidoId: cruce.partidoId,
        rival: {
          id: rival,
          nombre: r ? c.nombreDe(r) : rival,
          bajas: [...(c.bajasActivas?.(rival) ?? [])],
          // Contra un humano el partido no se juega en directo: «Ver partido» en lugar de «Comenzar partido».
          humano: r?.tipo === 'humano' && !r.controladoPorNPC,
        },
        // Solo hay plazo con varios humanos (contracts/realtime-protocol.md).
        ...(venceEn !== null ? { venceEn: new Date(venceEn).toISOString() } : {}),
        modalidadPreferida: await modalidadPreferida(c, pid),
        // Modo duelos (spec 005, contracts/realtime-protocol.md): once único en la formación común.
        modo: c.partida.modo,
        ...(c.partida.modo === 'duelos'
          ? { formacionFija: ((c.partida.configDuelos as { formacion?: string } | null)?.formacion ?? '4-3-3'), soloTitulares: true }
          : {}),
      });
    }
  }
}
