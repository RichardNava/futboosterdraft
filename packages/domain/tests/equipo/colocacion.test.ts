/** Colocación libre: posición efectiva, formación personalizada, perfil y avisos (invariante 8; T115). */
import { describe, expect, it } from 'vitest';
import { previsualizar } from '../../src/equipo/alineacion';
import { calcularColocacion } from '../../src/equipo/colocacion';
import { FORMACIONES, FORMACIONES_IDS, type FormacionId } from '../../src/equipo/formaciones';
import { PARAMETROS_V2 } from '../../src/parametros/index';
import { tacticaPorDefecto } from '../../src/equipo/tactica';
import { jugador } from './ayudas';

const titularesDe = (f: FormacionId) => FORMACIONES[f].casillas.map((c, i) => ({ casillaId: c.id, jugadorId: i + 1 }));
const colocar = (f: FormacionId, casillaId: string, x: number, y: number) => {
  const t = titularesDe(f);
  return { t, colocacion: [{ jugadorId: t.find((x) => x.casillaId === casillaId)!.jugadorId, x, y }] };
};

describe('colocación libre (T115)', () => {
  it('con la colocación de la propia formación: no personalizada y el perfil de la tabla de la spec 001', () => {
    for (const f of FORMACIONES_IDS) {
      const r = calcularColocacion(f, titularesDe(f), undefined, PARAMETROS_V2);
      expect(r.personalizada, f).toBe(false);
      expect(r.ofensividad, f).toBe(FORMACIONES[f].perfil.ofensividad);
      expect(r.amplitud, f).toBe(FORMACIONES[f].perfil.amplitud);
      // También indicando explícitamente los puntos de las casillas.
      const explicita = FORMACIONES[f].casillas.map((c, i) => ({ jugadorId: i + 1, x: c.zona.x, y: c.zona.y }));
      expect(calcularColocacion(f, titularesDe(f), explicita, PARAMETROS_V2).personalizada).toBe(false);
    }
  });

  it('un defensa adelantado a delantero suma +2 de ofensividad; ambas se acotan a [−3, +3]', () => {
    const { t, colocacion } = colocar('4-4-2', 'DCI', 800, 250);
    const r = calcularColocacion('4-4-2', t, colocacion, PARAMETROS_V2);
    expect(r.ofensividad).toBe(FORMACIONES['4-4-2'].perfil.ofensividad + 2);
    // Toda la defensa y el medio arriba: acotada a +3.
    const todos = FORMACIONES['3-4-3'].casillas.filter((c) => c.id !== 'POR').map((c, i) => ({ jugadorId: titularesDe('3-4-3').find((x) => x.casillaId === c.id)!.jugadorId, x: 800 + (i % 3) * 40, y: 100 + i * 45 }));
    const arriba = calcularColocacion('3-4-3', titularesDe('3-4-3'), todos, PARAMETROS_V2);
    expect(arriba.ofensividad).toBe(3);
    expect(arriba.amplitud).toBeLessThanOrEqual(3);
    expect(arriba.amplitud).toBeGreaterThanOrEqual(-3);
  });

  it('4-4-2 con un MC en la zona de delanteros: personalizada, reparto 4-3-3 y ofensividad +1', () => {
    const { t, colocacion } = colocar('4-4-2', 'MC-1', 700, 360);
    const r = calcularColocacion('4-4-2', t, colocacion, PARAMETROS_V2);
    expect(r.personalizada).toBe(true);
    expect(r.reparto).toEqual({ defensa: 4, medio: 3, ataque: 3 });
    expect(r.ofensividad).toBe(FORMACIONES['4-4-2'].perfil.ofensividad + 1);
  });

  it('4-3-3 con un SD natural en la casilla DC, movido a la zona SD: posición efectiva SD y sin penalización', () => {
    const t = titularesDe('4-3-3');
    const dc = t.find((x) => x.casillaId === 'DC')!;
    const sd = jugador('DEL', ['SD']);
    const otros = new Map(t.map((x) => [x.jugadorId, jugador('MED', ['MC'])]));
    otros.set(dc.jugadorId, sd);
    const buscar = (id: number) => otros.get(id)!;
    const a = {
      formacion: '4-3-3' as const,
      titulares: t,
      suplentes: [],
      tactica: tacticaPorDefecto(),
      lanzadores: { penaltis: 1, faltas: 1, corners: 1, tanda: [1, 2, 3, 4, 5] },
      colocacion: [{ jugadorId: dc.jugadorId, x: 700, y: 320 }],
    };
    const v = previsualizar(a, buscar, PARAMETROS_V2);
    const delantero = v.titulares.find((x) => x.casillaId === 'DC')!;
    expect(delantero.posicionEfectiva).toBe('SD');
    expect(delantero.penalizacion).toBe(0);
    expect(v.personalizada).toBe(true);
  });

  it('avisa de menos de 3 defensas, más de 5 delanteros o una línea vacía', () => {
    const t = titularesDe('4-4-2');
    const sinDefensa = t.filter((x) => x.casillaId !== 'POR').map((x, i) => ({ jugadorId: x.jugadorId, x: 800, y: 20 + i * 60 }));
    const r = calcularColocacion('4-4-2', t, sinDefensa, PARAMETROS_V2);
    expect(r.avisos).toEqual(expect.arrayContaining(['Menos de 3 defensas', 'Más de 5 delanteros', 'Nadie en la defensa', 'Nadie en el centro del campo']));
    expect(calcularColocacion('4-4-2', t, undefined, PARAMETROS_V2).avisos).toEqual([]);
  });

  it('dos titulares en el mismo punto quedan separados al menos 30 unidades', () => {
    const t = titularesDe('4-4-2');
    const [a, b] = t.filter((x) => x.casillaId !== 'POR');
    const r = calcularColocacion('4-4-2', t, [{ jugadorId: a!.jugadorId, x: 500, y: 320 }, { jugadorId: b!.jugadorId, x: 500, y: 320 }], PARAMETROS_V2);
    const pa = r.titulares.find((x) => x.jugadorId === a!.jugadorId)!;
    const pb = r.titulares.find((x) => x.jugadorId === b!.jugadorId)!;
    expect(Math.hypot(pa.x - pb.x, pa.y - pb.y)).toBeGreaterThanOrEqual(30);
  });
});
