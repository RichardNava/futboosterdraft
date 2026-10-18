/**
 * `resolverResto` (research R7, T009): resuelve lo que queda de partido con el mismo motor, parándose en el
 * descanso y antes de la prórroga solo para que decidan los NPC.
 */
import { derivarSemilla, semillaDesdeTexto } from '@fbd/domain';
import { avanzar, crearPartido, type EstadoMotor } from '@fbd/engine';
import { describe, expect, it } from 'vitest';
import { resolverResto } from '../src/index';
import { entrada } from '../../engine/tests/ayudas';

const semilla = semillaDesdeTexto('resolver-resto');

/**
 * Avanza por trozos de 60 ticks (como la 2D en directo) hasta pasar el minuto indicado o llegar a una fase
 * concreta: de interrupción en interrupción podría saltarse el minuto 89 hasta el final.
 */
function hasta(e: EstadoMotor, condicion: (e: EstadoMotor) => boolean): EstadoMotor {
  let estado = e;
  for (let i = 0; i < 2000 && !condicion(estado) && estado.fase !== 'finalizado'; i++) estado = avanzar(estado, 'ticks', { hastaTick: estado.tick + 60 }).estado;
  return estado;
}

const minuto = (m: number) => (e: EstadoMotor) => e.tick >= m * 60;

describe('resolverResto (T009)', () => {
  it.each([
    ['el inicio', (e: EstadoMotor) => e.tick >= 0],
    ['el minuto 30', minuto(30)],
    ['el descanso', (e: EstadoMotor) => e.fase === 'descanso'],
    ['el minuto 89', minuto(89)],
  ])('desde %s llega a finalizado', (_, condicion) => {
    const inicio = hasta(crearPartido(entrada('resto-a')), condicion);
    const r = resolverResto(inicio, { visitante: 'avanzado' }, semilla);
    expect(r.estado.fase).toBe('finalizado');
    expect(r.tramos.length).toBeGreaterThan(0);
    expect(r.eventos).toEqual(r.tramos.flatMap((t) => t.eventos));
  });

  it('en una eliminatoria empatada incluye la prórroga y la tanda', () => {
    let encontrado = false;
    for (let i = 0; i < 200 && !encontrado; i++) {
      const r = resolverResto(crearPartido(entrada(`empate-${i}`, { eliminatoria: true })), {}, semilla);
      expect(r.estado.fase).toBe('finalizado');
      if (r.eventos.some((ev) => ev.tipo === 'tanda_lanzamiento')) {
        encontrado = true;
        expect(r.eventos.some((ev) => ev.tipo === 'fin_tramo' && (ev.datos as { parte?: number }).parte === 4)).toBe(true);
      }
    }
    expect(encontrado).toBe(true);
  });

  it('solo deciden los lados de `niveles`; el lado humano sigue sin cambios', () => {
    for (let i = 0; i < 30; i++) {
      const r = resolverResto(crearPartido(entrada(`decide-${i}`)), { local: 'avanzado' }, derivarSemilla(semilla, String(i)));
      expect(r.estado.decisiones.every((d) => d.participanteId === 'local')).toBe(true);
    }
  });

  it('devuelve un tramo por cada parte simulada, con sus eventos', () => {
    const r = resolverResto(crearPartido(entrada('partes')), {}, semilla);
    // Sin prórroga: primera y segunda parte.
    expect(r.tramos.map((t) => t.fase)).toEqual(['descanso', 'finalizado']);
    expect(r.tramos[0]!.hastaTick).toBe(r.tramos[1]!.desdeTick);
  });
});
