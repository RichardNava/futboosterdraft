/**
 * Grupo de aperturas de partidos entre humanos (spec 010, US2; research R4 a R6, R10 y R11).
 *
 * Las aperturas de una partida que llegan mientras su actor está ocupado se resuelven juntas en un solo comando:
 * se calculan en paralelo, se aplican en orden de calendario en una transacción y se emite el torneo una vez.
 * - Una apertura se une al grupo abierto solo si no se ha encolado ningún otro comando después de él
 *   (`actor.secuencia`): nunca adelanta a lo que llegó antes (FR-009). No se espera a propósito (FR-008).
 * - Ninguna espera se resuelve antes del commit; si la transacción falla, la memoria no cambia y todas reciben el
 *   error. Si falla el cálculo de un partido, solo sus esperas reciben el error y los demás se guardan (FR-010).
 */
import type { ModoSimulacion } from '@fbd/domain';
import { actual, compartido, sumar, type DesgloseActual } from '../observabilidad/desglose';
import type { FilaPartido } from '../persistencia/repos/partidos';
import type { ContextoComando } from './actor';
import type { ControladorPartida } from './partida';
import {
  aplicarEntreHumanos,
  calcularEntreHumanos,
  confirmarEntreHumanos,
  entreHumanos,
  prepararEntreHumanos,
  type AplicadoEntreHumanos,
} from './partidoEntreHumanos';
import { registrarCalculoFallido } from './partidoRapido';
import { abrirPartido, errorAlAbrir, fijarModalidad, recordarModalidad, type ResultadoAbrir } from './torneo';

interface Apertura {
  participanteId: string;
  partidoId: string;
  modalidad: ModoSimulacion;
  desglose: DesgloseActual;
  llegada: number;
  resolver(r: ResultadoAbrir): void;
  rechazar(err: unknown): void;
}

interface Grupo {
  secuencia: number;
  aperturas: Apertura[];
}

/** Grupo abierto (su comando aún no ha empezado) de cada partida. */
const buzones = new WeakMap<ControladorPartida, Grupo>();

/** Aperturas que esperan en el grupo abierto de la partida (pruebas). */
export function aperturasEnBuzon(c: ControladorPartida): number {
  return buzones.get(c)?.aperturas.length ?? 0;
}

/** `POST /api/partidos/:id/abrir` de un partido de fútbol entre humanos y programado: lo mismo que `abrirPartido`. */
export function abrirEntreHumanos(c: ControladorPartida, participanteId: string, partidoId: string, modalidad: ModoSimulacion): Promise<ResultadoAbrir> {
  return new Promise((resolver, rechazar) => {
    const apertura: Apertura = { participanteId, partidoId, modalidad, desglose: actual(), llegada: performance.now(), resolver, rechazar };
    const abierto = buzones.get(c);
    if (abierto && !c.actor.estaCerrado && c.actor.secuencia === abierto.secuencia) {
      abierto.aperturas.push(apertura);
      return;
    }
    const grupo: Grupo = { secuencia: 0, aperturas: [apertura] };
    buzones.set(c, grupo);
    // Con el actor cerrado, `ejecutar` falla y el grupo entero recibe el error (R11).
    c.ejecutar((ctx) => {
      if (buzones.get(c) === grupo) buzones.delete(c);
      return resolverGrupo(c, ctx, grupo.aperturas);
    }).catch((err: unknown) => {
      if (buzones.get(c) === grupo) buzones.delete(c);
      for (const a of grupo.aperturas) a.rechazar(err);
    });
    grupo.secuencia = c.actor.secuencia;
  });
}

type Salida = { valor: ResultadoAbrir } | { error: unknown };

interface Entrada {
  fila: FilaPartido;
  esperas: Apertura[];
}

async function resolverGrupo(c: ControladorPartida, ctx: ContextoComando, aperturas: Apertura[]): Promise<void> {
  // El comando corre en el desglose de la primera; las demás esperaron en la cola hasta ahora y comparten el trabajo.
  const inicio = performance.now();
  for (const a of aperturas.slice(1)) sumar(a.desglose, 'cola', inicio - a.llegada);
  const salidas = new Map<Apertura, Salida>();
  await compartido(
    aperturas.slice(1).map((a) => a.desglose),
    () => resolverAperturas(c, ctx, aperturas, salidas),
  );
  for (const a of aperturas) {
    const s = salidas.get(a)!;
    if ('valor' in s) a.resolver(s.valor);
    else a.rechazar(s.error);
  }
}

async function resolverAperturas(c: ControladorPartida, ctx: ContextoComando, aperturas: Apertura[], salidas: Map<Apertura, Salida>): Promise<void> {
  const { repoPartidos, repoTorneo, db } = c.servicios;
  // Validación en orden de llegada (R10); las del mismo partido se juntan en una entrada (R6). Lo que ya no es un
  // partido entre humanos programado sigue el camino de siempre, en su orden.
  const filas = new Map<string, FilaPartido | undefined>();
  const entradas = new Map<string, Entrada>();
  for (const a of aperturas) {
    try {
      if (!filas.has(a.partidoId)) filas.set(a.partidoId, await repoPartidos.obtener(a.partidoId));
      const fila = filas.get(a.partidoId);
      const error = errorAlAbrir(c, fila, a.participanteId);
      if (error) salidas.set(a, { valor: { error } });
      else if (entradas.has(a.partidoId)) entradas.get(a.partidoId)!.esperas.push(a);
      else if (fila!.tipo === 'futbol' && fila!.estado === 'programado' && entreHumanos(c, fila!)) entradas.set(a.partidoId, { fila: fila!, esperas: [a] });
      else {
        salidas.set(a, { valor: await abrirPartido(c, ctx, a.participanteId, a.partidoId, a.modalidad) });
        ctx.publicar();
      }
    } catch (err) {
      salidas.set(a, { error: err });
    }
  }

  // Cálculo en paralelo; un partido que falla se queda programado y fuera del grupo (FR-010).
  const lista = [...entradas.values()];
  const calculos = await Promise.allSettled(
    lista.map(async (e) => {
      const preparado = await prepararEntreHumanos(c, e.fila, 'humano');
      return { preparado, r: await calcularEntreHumanos(c, e.fila, preparado, 'humano') };
    }),
  );
  const buenas = lista.flatMap((e, i) => {
    const s = calculos[i]!;
    if (s.status === 'fulfilled') return [{ ...e, ...s.value, indice: c.jornada?.cruces.findIndex((x) => x.partidoId === e.fila.id) ?? -1 }];
    registrarCalculoFallido(c, e.fila, s.reason);
    for (const a of e.esperas) salidas.set(a, { error: s.reason });
    return [];
  });
  if (!buenas.length) return;

  // Aplicación en orden de calendario y en una transacción (FR-006, FR-008).
  buenas.sort((x, y) => x.indice - y.indice);
  const { aplicados, modalidades } = await db.transaction(async (tx) => {
    let torneo = c.torneo;
    const aplicados: AplicadoEntreHumanos[] = [];
    const modalidades = new Map<Apertura, ModoSimulacion>();
    for (const e of buenas) {
      for (const a of e.esperas) modalidades.set(a, await fijarModalidad(c, e.fila.id, a.participanteId, a.modalidad, tx));
      const aplicado = await aplicarEntreHumanos(c, e.fila, e.preparado, e.r, torneo, tx, { resolucion: 'apertura', abiertoPorId: e.esperas[0]!.participanteId });
      torneo = aplicado.torneo;
      aplicados.push(aplicado);
    }
    if (torneo && torneo !== c.torneo) await repoTorneo.guardar(c.id, torneo, tx);
    return { aplicados, modalidades };
  });
  for (const [a, modalidad] of modalidades) {
    recordarModalidad(c, a.participanteId, modalidad);
    salidas.set(a, { valor: { modo: 'reproduccion', modalidad } });
  }
  await confirmarEntreHumanos(c, ctx, aplicados);
}
