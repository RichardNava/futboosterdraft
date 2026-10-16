import { describe, expect, it } from 'vitest';
import { semillaDesdeTexto } from '../../src/rng/xoshiro';
import { avanzarCuadro, cuadroMixto, cuadroPlayoff, rondaActual } from '../../src/torneo/cuadro';

const ids = (n: number, prefijo = 'p') => Array.from({ length: n }, (_, i) => `${prefijo}${i}`);

describe('cuadro de eliminatorias (FR-052, FR-053)', () => {
  it('playoff de 4: semifinales y final; sorteo reproducible', () => {
    const c = cuadroPlayoff(ids(4), [ids(4)], semillaDesdeTexto('c4'));
    expect(c.rondas.map((r) => r.tipo)).toEqual(['semifinal', 'final']);
    expect(c.rondas[0]!.cruces).toHaveLength(2);
    expect(cuadroPlayoff(ids(4), [ids(4)], semillaDesdeTexto('c4'))).toEqual(c);
    const participantes = c.rondas[0]!.cruces.flatMap((x) => [x.local, x.visitante]);
    expect(new Set(participantes)).toEqual(new Set(ids(4)));
  });

  it('playoff de 16: los octavos enfrentan siempre a participantes de mesas distintas', () => {
    const mesaA = ids(8, 'a');
    const mesaB = ids(8, 'b');
    for (let i = 0; i < 20; i++) {
      const c = cuadroPlayoff([...mesaA, ...mesaB], [mesaA, mesaB], semillaDesdeTexto(`c16-${i}`));
      expect(c.rondas.map((r) => r.tipo)).toEqual(['octavos', 'cuartos', 'semifinal', 'final']);
      for (const x of c.rondas[0]!.cruces) {
        expect(mesaA.includes(x.local!) !== mesaA.includes(x.visitante!)).toBe(true);
      }
    }
  });

  it('los ganadores avanzan hasta la final y el campeón', () => {
    let c = cuadroPlayoff(ids(8), [ids(8)], semillaDesdeTexto('c8'));
    expect(c.rondas[0]!.tipo).toBe('cuartos');
    while (!c.campeon) {
      const ronda = rondaActual(c)!;
      for (let i = 0; i < c.rondas[ronda]!.cruces.length; i++) {
        const cruce = c.rondas[ronda]!.cruces[i]!;
        c = avanzarCuadro(c, ronda, i, cruce.local!);
      }
    }
    expect(ids(8)).toContain(c.campeon);
    expect(c.rondas[3 - 1]!.cruces[0]!.ganador).toBe(c.campeon);
  });

  it('mixto: semifinales 1.º contra 4.º y 2.º contra 3.º, y final', () => {
    const c = cuadroMixto(['primero', 'segundo', 'tercero', 'cuarto']);
    expect(c.rondas.map((r) => r.tipo)).toEqual(['semifinal', 'final']);
    expect(c.rondas[0]!.cruces).toEqual([
      { local: 'primero', visitante: 'cuarto' },
      { local: 'segundo', visitante: 'tercero' },
    ]);
  });
});
