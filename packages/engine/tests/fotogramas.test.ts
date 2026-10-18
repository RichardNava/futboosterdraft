/**
 * Fotogramas v2 (research R5; data-model §7.5; T066): un array de enteros por fotograma, uno cada 2 ticks
 * más uno al empezar y al terminar cada acción, y pedirlos no cambia el partido (invariante 7).
 */
import { describe, expect, it } from 'vitest';
import { avanzar, crearPartido, type EstadoMotor, type ResultadoTramo } from '../src/index';
import { entrada } from './ayudas';

const ENTRADA = entrada('fotogramas-v2');

function jugar(fotogramas: boolean) {
  let estado: EstadoMotor = crearPartido(ENTRADA);
  const tramos: Omit<ResultadoTramo, 'estado'>[] = [];
  for (let i = 0; i < 400 && estado.fase !== 'finalizado'; i++) {
    const { estado: e, ...t } = avanzar(estado, 'interrupcion', { fotogramas });
    tramos.push(t);
    estado = e;
  }
  return { estado, tramos };
}

describe('fotogramas v2 (T066)', () => {
  const { tramos, estado } = jugar(true);

  it('formato [tick, bx, by, bz, x0, y0, …] en el orden de ordenJugadores, enteros dentro del campo o (-1, -1)', () => {
    const orden = tramos[0]!.ordenJugadores!;
    const todos = [...estado.equipos.local.jugadores, ...estado.equipos.visitante.jugadores].map((j) => j.id);
    expect(orden).toEqual(todos);
    for (const t of tramos) {
      expect(t.ordenJugadores).toEqual(orden);
      for (const f of t.fotogramas!) {
        expect(f).toHaveLength(4 + 2 * orden.length);
        expect(f.every((v) => Number.isInteger(v))).toBe(true);
        const [, bx, by, bz] = f;
        expect(bx).toBeGreaterThanOrEqual(-60);
        expect(bx).toBeLessThanOrEqual(1060);
        expect(by).toBeGreaterThanOrEqual(-60);
        expect(by).toBeLessThanOrEqual(700);
        expect(bz).toBeGreaterThanOrEqual(0);
        for (let i = 4; i < f.length; i += 2) {
          const [x, y] = [f[i]!, f[i + 1]!];
          if (x === -1 && y === -1) continue;
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(1000);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(640);
        }
      }
    }
  });

  it('un fotograma cada 2 ticks como mucho de separación, y uno al inicio y al final de cada acción', () => {
    for (const t of tramos) {
      const ticks = t.fotogramas!.map((f) => f[0]!);
      for (let i = 1; i < ticks.length; i++) expect(ticks[i]! - ticks[i - 1]!).toBeLessThanOrEqual(2);
      const enTramo = new Set(ticks);
      for (const a of t.acciones) {
        if (a.inicioTick > t.desdeTick) expect(enTramo.has(a.inicioTick), `inicio de ${a.tipo} en ${a.inicioTick}`).toBe(true);
        if (a.finTick <= t.hastaTick) expect(enTramo.has(a.finTick), `fin de ${a.tipo} en ${a.finTick}`).toBe(true);
      }
    }
  });

  it('pedir fotogramas no cambia el estado, los eventos ni las acciones (invariante 7)', () => {
    const sin = jugar(false);
    expect(sin.estado.marcador).toEqual(estado.marcador);
    expect(sin.tramos.flatMap((t) => t.eventos)).toEqual(tramos.flatMap((t) => t.eventos));
    expect(sin.tramos.flatMap((t) => t.acciones)).toEqual(tramos.flatMap((t) => t.acciones));
    expect(sin.estado.espacio).toEqual(estado.espacio);
    expect(sin.tramos.every((t) => t.fotogramas === undefined)).toBe(true);
  });
});
