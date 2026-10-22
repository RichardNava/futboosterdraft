/** Estado del equipo derivado de lo ya visto (spec 003, research R17; T064). */
import { tacticaPorDefecto } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { estadoEquipoEnPartido, type AlineacionPartido, type EventoEquipo } from '../../src/componentes/estadoEquipoEnPartido';

const carta = (id: number) => ({ id, nombre: 'J', apellidos: String(id), demarcacion: 'MED' as const, posicion: ['MC'], media: 75, nivel: 'Superclase' as const, virtudes: [], defectos: [] });
const alineacion: AlineacionPartido = {
  formacion: '4-4-2',
  titulares: ['POR', 'LD', 'DCD', 'DCI', 'LI', 'ED', 'MC-1', 'MC-2', 'EI', 'DC', 'SD'].map((casillaId, i) => ({ casillaId, jugador: carta(i + 1) })),
  suplentes: [12, 13, 14, 15, 16, 17, 18].map(carta),
  tactica: tacticaPorDefecto(),
  colocacion: [{ jugadorId: 10, x: 900, y: 300 }],
};
const ev = (tick: number, tipo: string, jugadores: [string, number][], equipo = 'local'): EventoEquipo => ({ tick, equipo, tipo, jugadores: jugadores.map(([rol, jugadorId]) => ({ rol, jugadorId })) });

const eventos = [
  ev(100, 'amarilla', [['autor', 3]]),
  ev(200, 'sustitucion', [['sale', 10], ['entra', 12]]),
  ev(300, 'roja', [['autor', 4]]),
  ev(350, 'lesion', [['autor', 7]]),
  ev(360, 'sustitucion', [['sale', 7], ['entra', 13]]),
  ev(400, 'sustitucion', [['sale', 2], ['entra', 99]], 'visitante'),
  ev(500, 'roja', [['autor', 5]]),
];

describe('estado del equipo en el partido (T064)', () => {
  it('campo, banquillo, sustituciones restantes, amarillas, lesionados y expulsados', () => {
    const e = estadoEquipoEnPartido(alineacion, eventos, 'local', 450);
    expect(e.asignacion.DC).toBe(12);
    expect(e.puntos[12]).toEqual({ x: 900, y: 300 });
    expect(e.asignacion.DCI).toBeUndefined();
    expect(e.asignacion['MC-1']).toBe(13);
    expect(e.banquillo).toEqual([14, 15, 16, 17, 18]);
    expect(e.sustitucionesUsadas).toBe(2);
    expect(e.sustitucionesRestantes).toBe(3);
    expect(e.amarillas.get(3)).toBe(1);
    expect([...e.expulsados]).toEqual([4]);
    expect([...e.lesionados]).toEqual([7]);
    expect([...e.sustituidos].sort()).toEqual([10, 7].sort());
  });

  it('no adelanta información: los eventos posteriores al tick que se ve no cuentan', () => {
    const e = estadoEquipoEnPartido(alineacion, eventos, 'local', 250);
    expect(e.expulsados.size).toBe(0);
    expect(e.asignacion.DCI).toBe(4);
    expect(estadoEquipoEnPartido(alineacion, eventos, 'local', 450).expulsados.has(5)).toBe(false);
  });

  it('las decisiones propias aplicadas cambian la formación y la colocación', () => {
    const asignacion = alineacion.titulares.map((t, i) => ({ casillaId: ['POR', 'LD', 'DCD', 'DCI', 'LI', 'MC-1', 'MC-2', 'MC-3', 'EI', 'DC', 'ED'][i]!, jugadorId: t.jugador.id }));
    const e = estadoEquipoEnPartido(alineacion, [], 'local', 600, [{ aplicadaEnTick: 500, tipo: 'formacion', datos: { formacion: '4-3-3', asignacion, colocacion: [{ jugadorId: 9, x: 700, y: 100 }] } }]);
    expect(e.formacion).toBe('4-3-3');
    expect(e.asignacion['MC-3']).toBe(8);
    expect(e.puntos).toEqual({ 9: { x: 700, y: 100 } });
    // Una decisión aún no vista no cuenta.
    expect(estadoEquipoEnPartido(alineacion, [], 'local', 400, [{ aplicadaEnTick: 500, tipo: 'formacion', datos: { formacion: '4-3-3', asignacion } }]).formacion).toBe('4-4-2');
  });

  it('en la prórroga hay una sustitución más', () => {
    expect(estadoEquipoEnPartido(alineacion, [], 'local', 0, [], true).sustitucionesRestantes).toBe(6);
  });
});
