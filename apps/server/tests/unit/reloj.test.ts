import { describe, expect, it } from 'vitest';
import { RelojFalso } from '../../src/programador/reloj';
import { Temporizadores } from '../../src/programador/temporizadores';

describe('RelojFalso y Temporizadores', () => {
  it('ejecuta en orden lo programado al avanzar', () => {
    const reloj = new RelojFalso(0);
    const orden: string[] = [];
    reloj.programar(300, () => orden.push('c'));
    reloj.programar(100, () => orden.push('a'));
    reloj.programar(200, () => orden.push('b'));
    reloj.avanzar(250);
    expect(orden).toEqual(['a', 'b']);
    expect(reloj.ahora()).toBe(250);
    reloj.avanzar(100);
    expect(orden).toEqual(['a', 'b', 'c']);
  });

  it('un temporizador reprogramado sustituye al anterior y se puede cancelar', () => {
    const reloj = new RelojFalso(0);
    const t = new Temporizadores(reloj);
    let vencidos = 0;
    t.programar('turno', 1000, () => vencidos++);
    t.programar('turno', 2000, () => vencidos++);
    reloj.avanzar(1500);
    expect(vencidos).toBe(0);
    reloj.avanzar(1000);
    expect(vencidos).toBe(1);
    t.programar('descanso', 5000, () => vencidos++);
    t.cancelar('descanso');
    reloj.avanzar(10_000);
    expect(vencidos).toBe(1);
  });

  it('un vencimiento ya pasado se ejecuta en cuanto avanza el reloj (rehidratación)', () => {
    const reloj = new RelojFalso(10_000);
    const t = new Temporizadores(reloj);
    let vencido = false;
    t.programar('turno', 5_000, () => (vencido = true));
    reloj.avanzar(0);
    expect(vencido).toBe(true);
  });

  it('lo programado dentro de un vencimiento también se ejecuta si cae en el intervalo', () => {
    const reloj = new RelojFalso(0);
    const eventos: number[] = [];
    reloj.programar(100, () => {
      eventos.push(reloj.ahora());
      reloj.programar(reloj.ahora() + 50, () => eventos.push(reloj.ahora()));
    });
    reloj.avanzar(200);
    expect(eventos).toEqual([100, 150]);
  });
});
