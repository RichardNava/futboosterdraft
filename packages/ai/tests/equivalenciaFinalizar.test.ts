/**
 * «Finalizar partido» da el mismo resultado que verlo entero (invariante 5, SC-010; research R7; T097).
 *
 * Para cada corte se juega hasta él, se deja una sustitución pendiente del humano (local) y después:
 * - por un lado, `resolverResto`;
 * - por otro, se sigue de interrupción en interrupción hasta el final, con `decidirNPCEnPausa` en las
 *   paradas (lo que haría la reproducción si el humano ya no decide nada más).
 * Los eventos, el marcador y las estadísticas tienen que coincidir.
 */
import { semillaDesdeTexto } from '@fbd/domain';
import { aplicarDecision, avanzar, crearPartido, type EntradaPartido, type EstadoMotor } from '@fbd/engine';
import { describe, expect, it } from 'vitest';
import { decidirNPCEnPausa, resolverResto, type NivelesPartido } from '../src/index';
import { entrada } from '../../engine/tests/ayudas';

const semilla = semillaDesdeTexto('equivalencia-finalizar');
const NIVELES: NivelesPartido = { visitante: 'avanzado' };
const parada = (e: EstadoMotor) => e.fase === 'descanso' || e.fase === 'pre_prorroga';

/** Avanza en un modo (de interrupción en interrupción, o por trozos de 60 ticks como la 2D en directo). */
function paso(e: EstadoMotor, modo: 'interrupcion' | 'ticks'): EstadoMotor {
  const r = modo === 'ticks' ? avanzar(e, 'ticks', { hastaTick: e.tick + 60 }) : avanzar(e, 'interrupcion');
  // Al llegar a una parada deciden los NPC (lo hace el servidor al abrir la pausa).
  if (parada(r.estado)) decidirNPCEnPausa(r.estado, NIVELES, semilla);
  return r.estado;
}

function jugarHasta(e: EstadoMotor, condicion: (e: EstadoMotor) => boolean, modo: 'interrupcion' | 'ticks' = 'interrupcion'): EstadoMotor {
  let estado = e;
  for (let i = 0; i < 5000 && !condicion(estado) && estado.fase !== 'finalizado'; i++) estado = paso(estado, modo);
  return estado;
}

/** Sustitución del local (el humano) que queda pendiente en el corte. */
function sustitucionPendiente(e: EstadoMotor): void {
  const local = e.equipos.local.jugadores;
  const sale = local.find((j) => j.enCampo && j.casillaId !== 'POR' && !j.expulsado);
  const entra = local.find((j) => !j.enCampo && !j.retirado && !j.expulsado && j.jugador.demarcacion !== 'POR');
  if (!sale || !entra) return;
  const r = aplicarDecision(e, { participanteId: 'local', tipo: 'sustitucion', datos: { sale: sale.jugador.id, entra: entra.jugador.id } });
  expect(r.ok).toBe(true);
}

function comprobar(e: EntradaPartido, corte: (e: EstadoMotor) => boolean, modo: 'interrupcion' | 'ticks' = 'interrupcion', exigirAplicada = true) {
  const enCorte = jugarHasta(crearPartido(e), corte, modo);
  expect(enCorte.fase).not.toBe('finalizado');
  sustitucionPendiente(enCorte);
  const final = resolverResto(enCorte, NIVELES, semilla).estado;
  const completo = jugarHasta(enCorte, () => false, modo);
  expect(completo.fase).toBe('finalizado');
  expect(final.eventos).toEqual(completo.eventos);
  expect(final.marcador).toEqual(completo.marcador);
  expect(final.estadisticas).toEqual(completo.estadisticas);
  expect(final.decisiones).toEqual(completo.decisiones);
  // La sustitución pendiente se aplicó en la primera interrupción no simulada. En el minuto 89 puede no
  // quedar ninguna entre dos pasos del motor (una falta puede encadenar el saque y el final en el mismo paso).
  if (exigirAplicada) expect(final.decisiones.some((d) => d.participanteId === 'local' && d.tipo === 'sustitucion')).toBe(true);
}

/** Primera semilla de eliminatoria en la que se llega a la prórroga (con las decisiones del NPC). */
function conProrroga(): EntradaPartido {
  for (let i = 0; i < 300; i++) {
    const e = entrada(`finalizar-prorroga-${i}`, { eliminatoria: true });
    if (jugarHasta(crearPartido(e), (x) => x.fase === 'prorroga', 'ticks').fase === 'prorroga') return e;
  }
  throw new Error('Ninguna semilla llega a la prórroga');
}

describe('equivalencia de «Finalizar partido» (T097, SC-010)', () => {
  // Entre interrupciones puede no haber ninguna en el minuto 89 o en la prórroga: esos cortes se hacen con
  // los trozos de 60 ticks de la 2D en directo.
  it.each([
    ['el tick 0', () => true, 'interrupcion'],
    ['el minuto 30', (e: EstadoMotor) => e.tick >= 30 * 60, 'interrupcion'],
    ['el descanso', (e: EstadoMotor) => e.fase === 'descanso', 'interrupcion'],
    ['el minuto 89', (e: EstadoMotor) => e.fase === 'segunda_parte' && e.reloj.segundosEnParte >= 44 * 60, 'ticks'],
  ] as const)('cortando en %s', (nombre, corte, modo) => {
    for (let i = 0; i < 3; i++) comprobar(entrada(`finalizar-${i}`), corte, modo, nombre !== 'el minuto 89');
  });

  it('cortando en la prórroga de una eliminatoria (con la tanda si hace falta)', () => {
    comprobar(conProrroga(), (e) => e.fase === 'prorroga', 'ticks');
  });

  it('cortando a mitad de juego en la 2D en directo (trozos de 60 ticks, no en una interrupción)', () => {
    for (let i = 0; i < 3; i++) comprobar(entrada(`finalizar-2d-${i}`), (e) => e.tick >= 1800 + 37 * i && !e.puntoDecision, 'ticks');
  });
});
