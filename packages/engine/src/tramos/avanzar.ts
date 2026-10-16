/**
 * Avance por tramos (T087; contracts/engine-api.md).
 *
 * - 'parte': hasta el descanso, el final, el inicio de la prórroga o la tanda (simulación rápida).
 * - 'interrupcion': hasta la siguiente interrupción del juego (simulación 2D, fase US6).
 * - 'final': hasta el final sin pausas (NPC contra NPC, resolución automática, balance).
 *
 * Las decisiones se aplican siempre en puntos de decisión (interrupciones, descanso, antes de la
 * prórroga). Como el PRNG avanza igual en los tres modos, la misma entrada con las mismas decisiones
 * en los mismos ticks produce exactamente el mismo partido (FR-032, FR-040).
 */
import { Rng } from '@fbd/domain';
import { emitir, interrumpir, type Contexto } from '../acciones/contexto';
import { paso } from '../acciones/juego';
import { comprobarInferioridad } from '../acciones/plantel';
import { saqueDeCentro } from '../acciones/tiro';
import { DURACION_PARTE, DURACION_PARTE_PRORROGA, rival, type EstadoMotor } from '../estado/estado';
import { jugarTanda } from '../penaltis/tanda';
import type { Estadisticas, EventoPartido, Fase, Fotograma, Marcador, ModoAvance } from '../tipos';
import { aplicarPendientes } from './decisiones';
import { fotogramaActual, fotogramasIntermedios } from './fotogramas';

export interface ResultadoTramo {
  estado: EstadoMotor;
  desdeTick: number;
  hastaTick: number;
  eventos: EventoPartido[];
  fotogramas?: Fotograma[];
  marcador: Marcador;
  estadisticas: Estadisticas;
  fase: Fase;
}

/** Límite de pasos por tramo (salvaguarda frente a bucles; un partido tiene unos pocos miles). */
const MAX_PASOS = 50_000;

function iniciarParte(ctx: Contexto, parte: number): void {
  const e = ctx.estado;
  e.reloj = { parte, segundosEnParte: 0, paradas: 0, descuento: null };
  // Saca el local en la primera parte y el visitante en la segunda; en la prórroga, al revés.
  const saca = parte === 1 || parte === 4 ? e.sacoPrimeraParte : rival(e.sacoPrimeraParte);
  emitir(ctx, 'inicio_tramo', saca, [], { parte });
  saqueDeCentro(ctx, e.equipos[saca]);
}

function calcularDescuento(e: EstadoMotor): number {
  if (e.reloj.parte <= 2) return Math.min(6, Math.max(1, 1 + Math.floor(e.reloj.paradas / 300))) * 60;
  return Math.min(2, Math.floor(e.reloj.paradas / 400)) * 60;
}

/** Comprueba el final de la parte actual y cambia de fase si toca. */
function comprobarFinParte(ctx: Contexto): void {
  const e = ctx.estado;
  const duracion = e.reloj.parte <= 2 ? DURACION_PARTE : DURACION_PARTE_PRORROGA;
  if (e.reloj.segundosEnParte < duracion) return;
  if (e.reloj.descuento === null) e.reloj.descuento = calcularDescuento(e);
  if (e.reloj.segundosEnParte < duracion + e.reloj.descuento) return;

  const parte = e.reloj.parte;
  const empate = e.marcador.local === e.marcador.visitante;
  emitir(ctx, 'fin_tramo', 'local', [], { parte, marcador: { ...e.marcador } });
  if (parte === 1) {
    e.fase = 'descanso';
    interrumpir(ctx, 'descanso', 0, 'local');
  } else if (parte === 2) {
    e.fase = e.eliminatoria && empate ? 'pre_prorroga' : 'finalizado';
    interrumpir(ctx, e.fase === 'pre_prorroga' ? 'fin_tiempo_reglamentario' : 'final', 0, 'local');
  } else if (parte === 3) {
    interrumpir(ctx, 'descanso_prorroga', 0, 'local');
    iniciarParte(ctx, 4);
  } else {
    e.fase = empate ? 'penaltis' : 'finalizado';
    interrumpir(ctx, empate ? 'fin_prorroga' : 'final', 0, 'local');
  }
}

/** Reanuda desde un punto de parada: aplica decisiones y empieza la parte siguiente si toca. */
function reanudar(ctx: Contexto): void {
  const e = ctx.estado;
  aplicarPendientes(ctx);
  if (e.fase === 'primera_parte' && e.tick === 0 && !e.eventos.some((x) => x.tipo === 'inicio_tramo')) {
    // Un equipo que no llega a 7 jugadores disponibles (por bajas) pierde el partido de inicio.
    comprobarInferioridad(ctx, 'local');
    comprobarInferioridad(ctx, 'visitante');
    if (e.fase !== 'primera_parte') return;
    iniciarParte(ctx, 1);
  } else if (e.fase === 'descanso') {
    e.fase = 'segunda_parte';
    iniciarParte(ctx, 2);
  } else if (e.fase === 'pre_prorroga') {
    e.fase = 'prorroga';
    iniciarParte(ctx, 3);
  }
}

function estadisticasSalida(e: EstadoMotor): Estadisticas {
  const total = e.estadisticas.local.posesion + e.estadisticas.visitante.posesion || 1;
  const cansancio = (lado: 'local' | 'visitante') => {
    const enCampo = e.equipos[lado].jugadores.filter((j) => j.enCampo);
    return enCampo.length ? Math.round((enCampo.reduce((a, j) => a + j.cansancio, 0) / enCampo.length) * 1000) / 1000 : 0;
  };
  return {
    local: {
      ...e.estadisticas.local,
      posesion: Math.round((e.estadisticas.local.posesion / total) * 100),
      posesionCampoRival: Math.round((e.estadisticas.local.posesionCampoRival / total) * 100),
      cansancioMedio: cansancio('local'),
    },
    visitante: {
      ...e.estadisticas.visitante,
      posesion: 100 - Math.round((e.estadisticas.local.posesion / total) * 100),
      posesionCampoRival: Math.round((e.estadisticas.visitante.posesionCampoRival / total) * 100),
      cansancioMedio: cansancio('visitante'),
    },
  };
}

export function avanzar(entrada: EstadoMotor, modo: ModoAvance, opciones: { fotogramas?: boolean } = {}): ResultadoTramo {
  // Los eventos ya emitidos no se modifican nunca: basta copiar la lista. Clonarlos en cada llamada haría
  // que encadenar muchos tramos cortos (2D, de interrupción en interrupción) costara un tiempo cuadrático.
  const { eventos: anteriores, ...resto } = entrada;
  const estado: EstadoMotor = { ...structuredClone(resto), eventos: [...anteriores] };
  const rng = new Rng(estado.rng);
  const ctx: Contexto = { estado, rng, interrupcion: false };
  const desdeTick = estado.tick;
  const primerEvento = estado.eventos.length;
  const fotogramas: Fotograma[] = [];
  let ultimoFotograma = -1;
  const anotarFotograma = () => {
    if (!opciones.fotogramas) return;
    const segundo = Math.floor(estado.tick);
    if (segundo === ultimoFotograma) return;
    ultimoFotograma = segundo;
    const actual = fotogramaActual(estado);
    const anterior = fotogramas[fotogramas.length - 1];
    if (anterior) fotogramas.push(...fotogramasIntermedios(anterior, actual));
    fotogramas.push(actual);
  };

  // Las acciones cambian la fase dentro del bucle: se lee siempre a través de esta función.
  const fase = (): Fase => estado.fase;
  if (fase() !== 'finalizado') {
    if (fase() === 'penaltis') {
      jugarTanda(ctx);
      estado.fase = 'finalizado';
      emitir(ctx, 'fin_tramo', 'local', [], { motivo: 'tanda' });
    } else {
      reanudar(ctx);
      anotarFotograma();
      for (let pasos = 0; pasos < MAX_PASOS; pasos++) {
        if (fase() === 'finalizado') break;
        ctx.interrupcion = false;
        paso(ctx);
        anotarFotograma();
        if (fase() !== 'finalizado') comprobarFinParte(ctx);
        if (ctx.interrupcion) {
          // Las decisiones programadas para esta interrupción (al reproducir un partido) se aplican aquí.
          if (estado.decisionesPendientes.some((d) => d.aplicadaEnTick !== undefined && d.aplicadaEnTick <= estado.tick)) {
            aplicarPendientes(ctx);
          }
        }
        const parada = fase() === 'descanso' || fase() === 'pre_prorroga' || fase() === 'penaltis';
        if (fase() === 'finalizado') break;
        if (modo === 'interrupcion' && ctx.interrupcion) break;
        if (parada) {
          if (modo !== 'final') break;
          if (fase() === 'penaltis') {
            jugarTanda(ctx);
            estado.fase = 'finalizado';
            emitir(ctx, 'fin_tramo', 'local', [], { motivo: 'tanda' });
            break;
          }
          reanudar(ctx);
        }
      }
    }
  }

  estado.rng = rng.estado();
  return {
    estado,
    desdeTick,
    hastaTick: estado.tick,
    eventos: estado.eventos.slice(primerEvento),
    ...(opciones.fotogramas ? { fotogramas } : {}),
    marcador: { ...estado.marcador, ...(estado.marcador.penaltis ? { penaltis: { ...estado.marcador.penaltis } } : {}) },
    estadisticas: estadisticasSalida(estado),
    fase: estado.fase,
  };
}
