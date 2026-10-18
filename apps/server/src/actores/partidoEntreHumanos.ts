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
import { resolverResto } from '@fbd/ai';
import { parametrosActuales, parametrosPorVersion, versionMayor } from '@fbd/domain';
import { aplicarDecision, avanzar, crearPartido, minutoMostrable, ordenJugadores, type DecisionRegistrada, type EntradaPartido, type EstadoMotor } from '@fbd/engine';
import { errores } from '../http/errores';
import type { FilaPartido } from '../persistencia/repos/partidos';
import type { ContextoComando } from './actor';
import type { ControladorPartida } from './partida';
import { equipacionesDelPartido, equipoParaMotor, esHumano, reconstruirMotor, resumenAlineaciones, type EntradaGuardada, type PartidoEnCurso } from './partidoRapido';

/** Los dos lados del partido los controlan humanos (sin abandonos). */
export function entreHumanos(c: ControladorPartida, fila: Pick<FilaPartido, 'localId' | 'visitanteId'>): boolean {
  return esHumano(c, fila.localId) && esHumano(c, fila.visitanteId);
}

/**
 * Resuelve el partido si sigue programado (research R8): fija las alineaciones vigentes, simula el partido
 * entero con `resolverResto`, lo guarda, crea los visionados pendientes y registra el resultado en el torneo.
 */
export async function resolverPartidoEntreHumanos(
  c: ControladorPartida,
  ctx: ContextoComando,
  partidoId: string,
  opciones: { resolucion: 'apertura' | 'plazo'; abiertoPorId?: string },
): Promise<void> {
  const { repoPartidos, repoVisionados, reloj, metricas } = c.servicios;
  const fila = await repoPartidos.obtener(partidoId);
  if (!fila || fila.estado !== 'programado') return;
  const parametros = parametrosActuales();
  const local = await equipoParaMotor(c, fila.localId, fila.visitanteId, fila.semilla);
  const visitante = await equipoParaMotor(c, fila.visitanteId, fila.localId, fila.semilla);
  // Nadie lo ve empezar: los dorsales nuevos se avisan en la bandeja (FR-038).
  for (const [pid, r] of [[fila.localId, local], [fila.visitanteId, visitante]] as const) if (r.asignados.length) await c.alAsignarDorsales?.(pid, r.asignados);
  const entrada: EntradaPartido = {
    version: parametros.version,
    parametros,
    semilla: fila.semilla,
    eliminatoria: fila.eliminatoria,
    local: local.equipo,
    visitante: visitante.equipo,
  };
  const nivel = parametros.asincrono.nivelDecisiones;
  const r = resolverResto(crearPartido(entrada), { local: nivel, visitante: nivel }, fila.semilla);
  const ultimo = r.tramos[r.tramos.length - 1]!;
  const { parametros: _p, ...guardada } = entrada;
  const ahora = reloj.ahora();
  await repoPartidos.actualizar(fila.id, {
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
  });
  await repoVisionados.crearPendientes(fila.id, [fila.localId, fila.visitanteId], ahora);
  metricas.partidosSimuladosTotal.inc();

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
  // Igual que al terminar un partido en directo, pero sin anunciar el resultado a nadie: cada humano lo
  // descubre al verlo (`torneo.actualizado` ya va filtrado por participante).
  await c.alTerminarPartido?.(ctx, p);
  ctx.publicar();
  await c.trasTerminarPartido?.(ctx, p);
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
  const r = resolverResto(motor, { local: nivel, visitante: nivel }, fila.semilla);
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

type Tramos = { desdeTick: number; hastaTick: number; fase: string; minuto: string; eventos: unknown[]; marcador: unknown; acciones: unknown[]; fotogramas?: unknown[] }[];
export const cacheReproducciones = new CacheReproducciones<Tramos>(32);

/** Vuelve a jugar el partido guardado con sus decisiones registradas (FR-040). */
function rehacer(fila: FilaPartido, conFotogramas: boolean): Tramos {
  const guardada = fila.entrada as EntradaGuardada;
  let estado: EstadoMotor = crearPartido({ ...guardada, parametros: parametrosPorVersion(fila.versionParametros) });
  for (const d of fila.decisiones as DecisionRegistrada[]) aplicarDecision(estado, d);
  const tramos: Tramos = [];
  for (let i = 0; i < 5000 && estado.fase !== 'finalizado'; i++) {
    const r = avanzar(estado, conFotogramas ? 'interrupcion' : 'parte', { fotogramas: conFotogramas });
    estado = r.estado;
    tramos.push({
      desdeTick: r.desdeTick,
      hastaTick: r.hastaTick,
      fase: r.fase,
      minuto: minutoMostrable(r.estado.reloj),
      eventos: r.eventos.filter((e) => e.relevante),
      marcador: r.marcador,
      acciones: r.acciones,
      ...(r.fotogramas ? { fotogramas: r.fotogramas } : {}),
    });
  }
  return tramos;
}

/**
 * `GET /api/partidos/:id/reproduccion`: el partido entero para uno de sus participantes. Es idéntico para
 * los dos (contracts/http-api.md).
 */
export async function reproduccion(c: ControladorPartida, fila: FilaPartido) {
  if (fila.estado !== 'finalizado' || !fila.entrada) throw errores.conflicto('PARTIDO_NO_TERMINADO', 'El partido aún no se ha jugado');
  if (versionMayor(fila.versionParametros) < 2) {
    throw errores.conflicto('VERSION_NO_REPRODUCIBLE', 'Este partido se jugó con una versión anterior del motor: solo está disponible su resumen');
  }
  const conFotogramas = c.partida.tipoSimulacion === '2d';
  const clave = `${fila.id}:${conFotogramas ? '2d' : 'rapida'}`;
  let tramos = cacheReproducciones.obtener(clave);
  if (!tramos) {
    tramos = rehacer(fila, conFotogramas);
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
      modalidad: c.partida.tipoSimulacion as 'rapida' | '2d',
      local: { id: fila.localId, nombre: nombre(fila.localId) },
      visitante: { id: fila.visitanteId, nombre: nombre(fila.visitanteId) },
      alineaciones: resumenAlineaciones(c, guardada),
      dorsales,
      equipaciones: equipacionesDelPartido(c, fila.localId, fila.visitanteId),
      decisiones: false,
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
