/**
 * Faltas, tarjetas, penaltis, faltas directas y fueras de juego (T086).
 */
import { lanzadorEfectivo, type ParametrosEquilibrado } from '@fbd/domain';
import { rival, type EquipoEstado, type JugadorEnPartido } from '../estado/estado';
import { decimasDeMetros, distanciaPorteria, enAreaRival } from '../espacio/campo';
import { aAbsoluta, aEquipo, CENTRO_Y, centroCelda, type Punto } from '../espacio/geometria';
import { tiene } from '../modificadores/specials';
import { reponer } from './animaciones';
import { emitir, interrumpir, type Contexto } from './contexto';
import { comprobarLesion } from './lesiones';
import { expulsar } from './plantel';
import { rematarBalonParado, tirar } from './tiro';

/**
 * Falta del `culpable` (equipo defensor) sobre el `victima` (equipo atacante) en la `zona` actual del
 * balón (vista del atacante). Puede acabar en tarjeta, lesión, penalti o falta directa.
 */
export function falta(ctx: Contexto, atacante: EquipoEstado, victima: JugadorEnPartido, defensor: EquipoEstado, culpable: JugadorEnPartido): void {
  const e = ctx.estado;
  const d = e.parametros.disciplina;
  const zona = e.balon.zona;
  e.estadisticas[defensor.lado].faltas++;
  emitir(ctx, 'falta', defensor.lado, [
    { rol: 'autor', jugadorId: culpable.id },
    { rol: 'defensor', jugadorId: victima.id },
  ]);

  // Tarjetas.
  if (ctx.rng.probabilidad(Math.round(d.probabilidadRojaDirectaPorFalta * 1000))) {
    tarjetaRoja(ctx, defensor, culpable, 'directa');
  } else if (
    // Quien ya tiene amarilla se arriesga menos: la segunda es menos probable.
    ctx.rng.probabilidad(Math.round(d.probabilidadAmarillaPorFalta * 1000 * (zona >= 4 ? 1.4 : 1) * (culpable.amarillas > 0 ? 0.4 : 1)))
  ) {
    amarilla(ctx, defensor, culpable);
  }
  // La falta puede lesionar a quien la recibe.
  const lesionado = comprobarLesion(ctx, atacante, victima, 1.5);
  if (e.fase === 'finalizado') return;

  interrumpir(ctx, 'falta', 16, atacante.lado);
  const lanzadorBalon = lesionado ? atacante.jugadores.find((j) => j.enCampo && j.casillaId !== 'POR') : victima;
  // Penalti si el punto de la falta está dentro del área real (research R7), no por una probabilidad fija.
  if (enAreaRival(aEquipo(atacante.lado, e.espacio.balon))) {
    penalti(ctx, atacante);
    return;
  }
  if (zona >= 4) {
    faltaDirecta(ctx, atacante, defensor);
    return;
  }
  e.balon = { posesion: atacante.lado, zona, carril: e.balon.carril, portadorId: lanzadorBalon?.id ?? 0, transicion: false };
  // Se saca desde donde se cometió la falta.
  if (lanzadorBalon) reponer(ctx, 'falta', { ...e.espacio.balon }, lanzadorBalon.id);
}

export function amarilla(ctx: Contexto, equipo: EquipoEstado, j: JugadorEnPartido): void {
  const e = ctx.estado;
  j.amarillas++;
  e.estadisticas[equipo.lado].amarillas++;
  emitir(ctx, 'amarilla', equipo.lado, [{ rol: 'autor', jugadorId: j.id }], { numero: j.amarillas }, true);
  if (j.amarillas >= 2) tarjetaRoja(ctx, equipo, j, 'doble_amarilla');
}

export function tarjetaRoja(ctx: Contexto, equipo: EquipoEstado, j: JugadorEnPartido, motivo: 'directa' | 'doble_amarilla'): void {
  ctx.estado.estadisticas[equipo.lado].rojas++;
  emitir(ctx, 'roja', equipo.lado, [{ rol: 'autor', jugadorId: j.id }], { motivo }, true);
  expulsar(ctx, equipo, j);
}

export function penalti(ctx: Contexto, atacante: EquipoEstado): void {
  const enCampo = atacante.jugadores.filter((j) => j.enCampo).map((j) => j.jugador);
  const id = lanzadorEfectivo(atacante.lanzadores.penaltis, enCampo, 'penaltis');
  const lanzador = atacante.jugadores.find((j) => j.id === id);
  if (!lanzador) return;
  emitir(ctx, 'penalti', atacante.lado, [{ rol: 'autor', jugadorId: lanzador.id }], {}, true);
  ctx.estado.balon = { posesion: atacante.lado, zona: 5, carril: 1, portadorId: lanzador.id, transicion: false };
  reponer(ctx, 'penalti', aAbsoluta(atacante.lado, { x: 8900, y: CENTRO_Y }), lanzador.id);
  tirar(ctx, atacante, lanzador, 'penalti');
}

/** Ancho de la zona central de las faltas: el del área (|y − centro| ≤ 18,1 m). */
const MEDIO_ANCHO_CENTRAL = 1810;

/**
 * Probabilidad (milésimas) de tirar directo una falta desde `punto` (coordenadas del atacante; research R7):
 * `tiro.faltaDirectaTiro.probabilidad` entre `distanciaMinM` y `distanciaMaxM` con ángulo central; menos desde
 * un lateral y mucho menos fuera de esas distancias. Lanzador de faltas la multiplica por 1,3.
 */
export function probabilidadTiroDirecto(p: ParametrosEquilibrado, punto: Punto, lanzadorFaltas: boolean): number {
  const t = p.tiro.faltaDirectaTiro;
  const d = distanciaPorteria(punto);
  const enDistancia = d >= decimasDeMetros(t.distanciaMinM) && d <= decimasDeMetros(t.distanciaMaxM);
  const central = Math.abs(punto.y - CENTRO_Y) <= MEDIO_ANCHO_CENTRAL;
  let x = t.probabilidad * (enDistancia ? (central ? 1 : 0.35) : 0.3);
  if (lanzadorFaltas) x *= 1.3;
  return Math.round(1000 * Math.min(0.95, x));
}

/** Falta directa cerca del área: tiro del lanzador de faltas o balón colgado. */
export function faltaDirecta(ctx: Contexto, atacante: EquipoEstado, defensor: EquipoEstado): void {
  const e = ctx.estado;
  const enCampo = atacante.jugadores.filter((j) => j.enCampo).map((j) => j.jugador);
  const id = lanzadorEfectivo(atacante.lanzadores.faltas, enCampo, 'faltas');
  const lanzador = atacante.jugadores.find((j) => j.id === id);
  const punto = aEquipo(atacante.lado, e.espacio.balon);
  if (lanzador && ctx.rng.probabilidad(probabilidadTiroDirecto(e.parametros, punto, tiene(lanzador, 'LanzadorFaltas')))) {
    e.balon = { posesion: atacante.lado, zona: 4, carril: 1, portadorId: lanzador.id, transicion: false };
    reponer(ctx, 'falta_area', { ...e.espacio.balon }, lanzador.id);
    tirar(ctx, atacante, lanzador, 'falta');
    return;
  }
  rematarBalonParado(ctx, atacante, defensor, 'faltas', e.parametros.acciones.duelaAereo - 0.2);
}

/** Fuera de juego del atacante: saque de falta para la defensa. */
export function fueraDeJuego(ctx: Contexto, atacante: EquipoEstado, jugador: JugadorEnPartido): void {
  const e = ctx.estado;
  const defensor = e.equipos[rival(atacante.lado)];
  e.estadisticas[atacante.lado].fuerasDeJuego++;
  e.estadisticas[defensor.lado].fuerasDeJuegoProvocados++;
  emitir(ctx, 'fuera_de_juego', atacante.lado, [{ rol: 'autor', jugadorId: jugador.id }]);
  interrumpir(ctx, 'fuera_de_juego', 14, defensor.lado);
  const sacador = defensor.jugadores.find((j) => j.enCampo && j.jugador.demarcacion === 'DEF') ?? defensor.jugadores.find((j) => j.enCampo);
  e.balon = { posesion: defensor.lado, zona: 1, carril: 1, portadorId: sacador?.id ?? 0, transicion: false };
  if (sacador) reponer(ctx, 'fuera_de_juego', aAbsoluta(defensor.lado, centroCelda(1, 1)), sacador.id);
}
