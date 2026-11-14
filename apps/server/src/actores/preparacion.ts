/**
 * Jornadas en el servidor (T094; spec 002, research R9): creación de los partidos y aviso de preparación.
 *
 * Ya no hay temporizador de preparación: cada humano recibe `preparacion.inicio` con su rival y, si la
 * partida tiene varios humanos, el plazo de la jornada. Su partido empieza cuando lo abre con «Comenzar
 * partido» o «Ver partido» (`POST /api/partidos/:id/abrir`), o se resuelve solo al vencer el plazo.
 */
import { derivarSemilla, parametrosActuales, type Emparejamiento, type ModoSimulacion } from '@fbd/domain';
import type { FilaPartido } from '../persistencia/repos/partidos';
import type { ContextoComando } from './actor';
import type { ControladorPartida } from './partida';
import { calcularPartido, iniciarPartido, registrarCalculoFallido, sinHumanos } from './partidoRapido';

interface OpcionesJornada {
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
  const ids = await c.servicios.repoPartidos.crear(
    emparejamientos.map((e, i) => ({
      partidaId: c.id,
      jornadaId: opciones.jornadaId ?? null,
      jornadaNumero: numero,
      localId: e.local,
      visitanteId: e.visitante,
      eliminatoria: opciones.eliminatoria ?? false,
      semilla: derivarSemilla(c.partida.semilla, `partido:${numero}:${i}`),
      versionParametros: parametrosActuales().version,
      ...(c.partida.modo === 'duelos' ? { tipo: 'duelos' as const } : {}),
    })),
  );
  const cruces = emparejamientos.map((e, i) => ({ partidoId: ids[i]!, local: e.local, visitante: e.visitante }));
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

/** Partidos NPC que se están resolviendo: el final de uno de ellos no vuelve a lanzar los demás. */
const enCalculo = new WeakMap<ControladorPartida, Set<string>>();

/**
 * Los partidos de la jornada sin ningún humano (NPC contra NPC) se resuelven al abrirla (research R9), en dos
 * fases (spec 009, research R6): se calculan todos a la vez y después se guardan y anuncian uno tras otro en el
 * orden de los cruces, como antes. Uno que falla no guarda nada: sigue programado y se reintenta al terminar otro
 * partido de la jornada, al reiniciar o al vencer el plazo. Devuelve cuántos fallaron.
 */
export async function resolverPartidosSinHumanos(c: ControladorPartida, ctx: ContextoComando): Promise<number> {
  const marcados = enCalculo.get(c) ?? new Set<string>();
  enCalculo.set(c, marcados);
  const filas: FilaPartido[] = [];
  for (const cruce of c.jornada?.cruces ?? []) {
    if (marcados.has(cruce.partidoId) || !sinHumanos(c, { localId: cruce.local, visitanteId: cruce.visitante })) continue;
    const fila = await c.servicios.repoPartidos.obtener(cruce.partidoId);
    if (fila?.estado === 'programado') filas.push(fila);
  }
  for (const fila of filas) marcados.add(fila.id);
  try {
    const calculos = await Promise.allSettled(filas.map((fila) => calcularPartido(c, fila)));
    let fallidos = 0;
    for (const [i, fila] of filas.entries()) {
      const r = calculos[i]!;
      if (r.status === 'rejected') {
        fallidos++;
        registrarCalculoFallido(c, fila, r.reason);
      } else await iniciarPartido(c, ctx, fila, { calculado: r.value });
    }
    return fallidos;
  } finally {
    for (const fila of filas) marcados.delete(fila.id);
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

/** Anuncia a cada participante la preparación del próximo partido (rival y plazo). */
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
