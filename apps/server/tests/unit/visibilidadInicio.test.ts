/**
 * Auditoría de visibilidad (spec 003, T127): `partido.inicio` solo da la alineación ampliada (colocación, anclas y
 * lanzadores) del propio equipo; del rival, la formación, los titulares, los suplentes y la táctica.
 */
import { describe, expect, it } from 'vitest';
import { resumenAlineaciones } from '../../src/actores/partidoRapido';

const equipo = (participanteId: string) =>
  ({
    participanteId,
    formacion: '4-4-2',
    titulares: [{ casillaId: 'DC', jugador: { id: 1 }, ancla: { x: 800, y: 300 } }],
    suplentes: [{ id: 2 }],
    tactica: { alturaBloque: 'medio' },
    lanzadores: { penaltis: 1, faltas: 1, corners: 1, tanda: [1] },
  }) as never;

const c = { servicios: { catalogo: { resumen: (id: number) => ({ id }) } } } as never;

describe('visibilidad de partido.inicio (T127)', () => {
  it('el rival llega sin colocación, anclas ni lanzadores', () => {
    const r = resumenAlineaciones(c, { local: equipo('yo'), visitante: equipo('rival') }, ['yo']);
    expect(r.local).toHaveProperty('colocacion');
    expect(r.local).toHaveProperty('lanzadores');
    expect(r.local.titulares[0]).toHaveProperty('ancla');
    expect(r.visitante).not.toHaveProperty('colocacion');
    expect(r.visitante).not.toHaveProperty('lanzadores');
    expect(r.visitante.titulares[0]).not.toHaveProperty('ancla');
    expect(r.visitante.formacion).toBe('4-4-2');
  });
});
