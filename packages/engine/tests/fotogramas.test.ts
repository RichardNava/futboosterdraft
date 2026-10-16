import { describe, expect, it } from 'vitest';
import { avanzar, crearPartido } from '../src/index';
import { entrada } from './ayudas';

describe('fotogramas 2D (T134)', () => {
  it('hay un fotograma por segundo de juego, con los 22 jugadores y coordenadas dentro del campo', () => {
    const e = entrada('fotogramas');
    const r = avanzar(crearPartido(e), 'parte', { fotogramas: true });
    const fs = r.fotogramas!;
    expect(fs.length).toBeGreaterThan(2000);
    for (let i = 1; i < fs.length; i++) expect(Math.floor(fs[i]!.tick)).toBe(Math.floor(fs[i - 1]!.tick) + 1);
    for (const f of fs) {
      expect(Object.keys(f.j)).toHaveLength(22);
      for (const [x, y] of [f.balon, ...Object.values(f.j)]) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1000);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(640);
      }
    }
  });

  it('los jugadores se mueven con el balón y el portador va pegado a él', () => {
    const r = avanzar(crearPartido(entrada('fotogramas-2')), 'parte', { fotogramas: true });
    const fs = r.fotogramas!;
    const id = Number(Object.keys(fs[0]!.j).find((k) => k !== String(r.estado.balon.portadorId)));
    const xs = new Set(fs.map((f) => Math.round(f.j[id]![0])));
    expect(xs.size).toBeGreaterThan(10);
    const ultimo = fs.at(-1)!;
    const portador = ultimo.j[r.estado.balon.portadorId];
    if (portador) expect(Math.hypot(portador[0] - ultimo.balon[0], portador[1] - ultimo.balon[1])).toBeLessThan(20);
  });
});
