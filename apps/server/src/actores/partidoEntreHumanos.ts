/**
 * Partidos entre humanos (spec 002, FR-030; research R8).
 *
 * - Se resuelven una sola vez, cuando el primero de los dos lo abre o al vencer el plazo de la jornada,
 *   con las alineaciones guardadas en ese momento y decisiones automáticas del mismo nivel para los dos
 *   (`parametros.asincrono.nivelDecisiones`). El actor serializa los comandos: dos aperturas a la vez
 *   resuelven el partido una vez.
 * - Cada humano lo ve después por HTTP (`reproduccion`), con su velocidad y sin decisiones. Los fotogramas
 *   no se guardan: se recalculan repitiendo el partido con su semilla y sus decisiones registradas, y se
 *   guardan en una caché en memoria de los últimos partidos pedidos.
 * - Mientras un humano no lo ha visto, su visionado está `pendiente` y no se le revela el resultado.
 */
import { parametrosActuales, parametrosPorVersion, VERSION_MAYOR_SOPORTADA, versionMayor, type EstadoTorneo, type ModoSimulacion } from '@fbd/domain';
import { crearPartido, ordenJugadores, type EstadoMotor } from '@fbd/engine';
import { errores } from '../http/errores';
import type { Ejecutor } from '../persistencia/db';
import type { FilaPartido } from '../persistencia/repos/partidos';
import type { Tramos } from '../simulacion/funciones';
import type { Prioridad } from '../simulacion/grupo';
import type { ContextoComando } from './actor';
import type { ControladorPartida } from './partida';
import {
  dorsalesParaPartido,
  equipacionesDelPartido,
  esHumano,
  prepararPartido,
  reconstruirMotor,
  registrarCalculoFallido,
  resumenAlineaciones,
  type EntradaGuardada,
  type PartidoCalculado,
  type PartidoEnCurso,
} from './partidoRapido';
import { anotarResultado } from './torneo';

/** Los dos lados del partido los controlan humanos (sin abandonos). */
export function entreHumanos(c: ControladorPartida, fila: Pick<FilaPartido, 'localId' | 'visitanteId'>): boolean {
  return esHumano(c, fila.localId) && esHumano(c, fila.visitanteId);
}

/**
 * Resuelve el partido si sigue programado (research R8): fija las alineaciones vigentes, simula el partido
 * entero con `resolverResto`, lo guarda, crea los visionados pendientes y registra el resultado en el torneo.
 * Son los tres pasos que el grupo de aperturas hace con varios partidos a la vez (spec 010, `aperturas.ts`).
 */
export async function resolverPartidoEntreHumanos(
  c: ControladorPartida,
  ctx: ContextoComando,
  partidoId: string,
  opciones: { resolucion: 'apertura' | 'plazo'; abiertoPorId?: string },
): Promise<void> {
  const { repoPartidos, repoTorneo, db } = c.servicios;
  const fila = await repoPartidos.obtener(partidoId);
  if (!fila || fila.estado !== 'programado') return;
  // Quien lo abre espera al resultado; al vencer el plazo, no espera nadie (FR-012).
  const prioridad = opciones.resolucion === 'apertura' ? 'humano' : 'npc';
  // Se calcula antes de guardar o anunciar nada: si falla, el partido sigue programado (FR-008).
  const { preparado, r } = await (async () => {
    const preparado = await prepararEntreHumanos(c, fila, prioridad);
    return { preparado, r: await calcularEntreHumanos(c, fila, preparado, prioridad) };
  })().catch((err: unknown) => {
    registrarCalculoFallido(c, fila, err);
    throw err;
  });
  const aplicado = await db.transaction(async (tx) => {
    const a = await aplicarEntreHumanos(c, fila, preparado, r, c.torneo, tx, opciones);
    if (a.torneo && a.torneo !== c.torneo) await repoTorneo.guardar(c.id, a.torneo, tx);
    return a;
  });
  await confirmarEntreHumanos(c, ctx, [aplicado]);
}

/** Alineaciones y estado inicial del motor (solo lecturas). */
export function prepararEntreHumanos(c: ControladorPartida, fila: FilaPartido, prioridad: Prioridad): Promise<PartidoCalculado> {
  return prepararPartido(c, fila, prioridad);
}

/** El partido entero con decisiones automáticas del mismo nivel para los dos (sin E/S). */
export function calcularEntreHumanos(c: ControladorPartida, fila: FilaPartido, preparado: PartidoCalculado, prioridad: Prioridad) {
  const nivel = preparado.entrada.parametros.asincrono.nivelDecisiones;
  return c.servicios.calculo.ejecutar('resolverResto', [preparado.motor, { local: nivel, visitante: nivel }, fila.semilla], prioridad);
}

export type AplicadoEntreHumanos = Awaited<ReturnType<typeof aplicarEntreHumanos>>;

/**
 * Guarda con `ejecutor` los dorsales, el partido finalizado y los visionados pendientes, y anota el resultado en
 * `torneo` (sin guardarlo ni cambiar `c.torneo`). Los avisos de dorsales se devuelven sin enviar: van tras el commit.
 */
export async function aplicarEntreHumanos(
  c: ControladorPartida,
  fila: FilaPartido,
  { alineaciones, entrada }: PartidoCalculado,
  r: Awaited<ReturnType<typeof calcularEntreHumanos>>,
  torneo: EstadoTorneo | null,
  ejecutor: Ejecutor,
  opciones: { resolucion: 'apertura' | 'plazo'; abiertoPorId?: string },
) {
  const { repoPartidos, repoVisionados, reloj } = c.servicios;
  const local = await dorsalesParaPartido(c, fila.localId, alineaciones.local, ejecutor);
  const visitante = await dorsalesParaPartido(c, fila.visitanteId, alineaciones.visitante, ejecutor);
  // Nadie lo ve empezar: los dorsales nuevos se avisan en la bandeja (FR-038).
  const avisos = ([[fila.localId, local.asignados], [fila.visitanteId, visitante.asignados]] as const).filter(([, a]) => a.length);
  const ultimo = r.tramos[r.tramos.length - 1]!;
  const { parametros, ...guardada } = entrada;
  const ahora = reloj.ahora();
  await repoPartidos.actualizar(
    fila.id,
    {
      entrada: guardada satisfies EntradaGuardada,
      estado: 'finalizado',
      versionParametros: parametros.version,
      iniciadoEn: new Date(ahora),
      finalizadoEn: new Date(ahora),
      eventos: r.eventos,
      decisiones: r.estado.decisiones,
      marcador: ultimo.marcador,
      estadisticas: ultimo.estadisticas,
      resolucion: opciones.resolucion,
      abiertoPorId: opciones.abiertoPorId ?? null,
    },
    ejecutor,
  );
  await repoVisionados.crearPendientes(fila.id, [fila.localId, fila.visitanteId], ahora, ejecutor);
  const p: PartidoEnCurso = {
    fila: { ...fila, estado: 'finalizado', entrada: guardada },
    motor: r.estado,
    inicio: { t: 'partido.inicio' },
    eventos: r.eventos,
    ultimo,
    pausa: null,
    listos: new Set(),
    dosD: null,
  };
  return { p, avisos, torneo: torneo && (anotarResultado(c, torneo, p)?.torneo ?? torneo) };
}

/**
 * Tras el commit de uno o varios partidos aplicados en orden: el torneo en memoria, los avisos de dorsales y, una
 * sola vez, lo que sigue al final de un partido (FR-013). Igual que al terminar un partido en directo, pero sin
 * anunciar el resultado a nadie: cada humano lo descubre al verlo (`torneo.actualizado` va filtrado por participante).
 */
export async function confirmarEntreHumanos(c: ControladorPartida, ctx: ContextoComando, aplicados: readonly AplicadoEntreHumanos[]): Promise<void> {
  const ultimo = aplicados.at(-1);
  if (!ultimo) return;
  if (ultimo.torneo) c.torneo = ultimo.torneo;
  c.servicios.metricas.partidosSimuladosTotal.inc(aplicados.length);
  for (const a of aplicados) for (const [pid, asignados] of a.avisos) await c.alAsignarDorsales?.(pid, asignados);
  ctx.publicar();
  await c.trasTerminarPartido?.(ctx, ultimo.p);
}

/**
 * Partido entre humanos que estaba en juego (síncrono, spec 001) al desplegar la spec 002 (research R9): se
 * termina desde donde se quedó con `resolverResto` y las decisiones automáticas de los dos lados.
 */
export async function terminarPartidoEntreHumanosEnJuego(c: ControladorPartida, ctx: ContextoComando, partidoId: string): Promise<void> {
  const { repoPartidos, repoVisionados, reloj } = c.servicios;
  const fila = await repoPartidos.obtener(partidoId);
  if (!fila || fila.estado === 'programado' || fila.estado === 'finalizado') return;
  const motor = reconstruirMotor(fila);
  if (!motor) return;
  const nivel = parametrosActuales().asincrono.nivelDecisiones;
  // `reconstruirMotor` se queda en el hilo principal (research R9); el resto del partido no.
  const r = await c.servicios.calculo.ejecutar('resolverResto', [motor, { local: nivel, visitante: nivel }, fila.semilla], 'npc');
  const ultimo = r.tramos[r.tramos.length - 1];
  const eventos = [...((fila.eventos as EstadoMotor['eventos']) ?? []), ...r.eventos];
  const ahora = reloj.ahora();
  await repoPartidos.actualizar(fila.id, {
    estado: 'finalizado',
    finalizadoEn: new Date(ahora),
    eventos,
    decisiones: r.estado.decisiones,
    marcador: ultimo?.marcador ?? r.estado.marcador,
    ...(ultimo ? { estadisticas: ultimo.estadisticas } : {}),
    resolucion: 'plazo',
  });
  await repoVisionados.crearPendientes(fila.id, [fila.localId, fila.visitanteId], ahora);
  const p: PartidoEnCurso = { fila: { ...fila, estado: 'finalizado' }, motor: r.estado, inicio: { t: 'partido.inicio' }, eventos, ultimo: ultimo ?? null, pausa: null, listos: new Set(), dosD: null };
  await c.alTerminarPartido?.(ctx, p);
  ctx.publicar();
  await c.trasTerminarPartido?.(ctx, p);
}

// ---------- Reproducción ----------

/** Caché LRU de reproducciones ya calculadas (research R8: 32 partidos). */
class CacheReproducciones<T> {
  private readonly mapa = new Map<string, T>();
  constructor(private readonly capacidad: number) {}
  obtener(clave: string): T | undefined {
    const v = this.mapa.get(clave);
    if (v !== undefined) {
      this.mapa.delete(clave);
      this.mapa.set(clave, v);
    }
    return v;
  }
  guardar(clave: string, valor: T): void {
    this.mapa.delete(clave);
    this.mapa.set(clave, valor);
    while (this.mapa.size > this.capacidad) this.mapa.delete(this.mapa.keys().next().value!);
  }
  vaciar(): void {
    this.mapa.clear();
  }
}

export const cacheReproducciones = new CacheReproducciones<Tramos>(32);

/**
 * `GET /api/partidos/:id/reproduccion`: el partido entero para uno de sus participantes. Es idéntico para
 * los dos (contracts/http-api.md).
 */
export async function reproduccion(c: ControladorPartida, fila: FilaPartido, modalidad: ModoSimulacion = 'rapida', participanteId?: string) {
  if (fila.estado !== 'finalizado' || !fila.entrada) throw errores.conflicto('PARTIDO_NO_TERMINADO', 'El partido aún no se ha jugado');
  if (versionMayor(fila.versionParametros) < VERSION_MAYOR_SOPORTADA) {
    throw errores.conflicto('VERSION_NO_REPRODUCIBLE', 'Este partido se jugó con una versión anterior del motor: solo está disponible su resumen');
  }
  // La modalidad solo decide si van los fotogramas: el partido es el mismo (SC-018).
  const conFotogramas = modalidad === '2d';
  const clave = `${fila.id}:${modalidad}`;
  let tramos = cacheReproducciones.obtener(clave);
  if (!tramos) {
    // Se repite el partido con su semilla y sus decisiones (`rehacer`, FR-040); solo viaja lo que hace falta.
    const { entrada, versionParametros, decisiones } = fila;
    tramos = await c.servicios.calculo.ejecutar('rehacer', [{ entrada, versionParametros, decisiones }, conFotogramas], 'humano');
    cacheReproducciones.guardar(clave, tramos);
  }
  const guardada = fila.entrada as EntradaGuardada;
  const nombre = (pid: string) => (c.participante(pid) ? c.nombreDe(c.participante(pid)!) : pid);
  const dorsales = {
    ...((await c.servicios.repoEquipo.dorsales(fila.localId)) ?? {}),
    ...((await c.servicios.repoEquipo.dorsales(fila.visitanteId)) ?? {}),
  };
  return {
    inicio: {
      t: 'partido.inicio' as const,
      partidoId: fila.id,
      modalidad,
      local: { id: fila.localId, nombre: nombre(fila.localId) },
      visitante: { id: fila.visitanteId, nombre: nombre(fila.visitanteId) },
      alineaciones: resumenAlineaciones(c, guardada, participanteId ? [participanteId] : []),
      dorsales,
      equipaciones: equipacionesDelPartido(c, fila.localId, fila.visitanteId),
      decisiones: false,
      gestionDisponible: false,
      ordenJugadores: ordenJugadores(crearPartido({ ...guardada, parametros: parametrosPorVersion(fila.versionParametros) })),
    },
    tramos,
    fin: {
      marcador: fila.marcador,
      estadisticas: fila.estadisticas,
      eventos: ((fila.eventos as { relevante: boolean }[]) ?? []).filter((e) => e.relevante),
    },
  };
}
