/** Goleadores bajo el marcador (spec 004, FR-048). */
import { describe, expect, it } from 'vitest';
import { goleadoresDe } from '../../src/componentes/goleadores';
import type { EventoVista } from '../../src/componentes/ResumenEventos';

const gol = (minuto: string, equipo: 'local' | 'visitante', autor: number, tipo = 'normal'): EventoVista => ({
  tick: 1,
  minuto,
  tipo: 'gol',
  equipo,
  jugadores: [{ rol: 'autor', jugadorId: autor }],
  datos: { tipo },
});

const NOMBRES: Record<number, string> = { 7: '7. Pérez', 9: '9. Gómez', 4: '4. Ramos' };
const nombre = (id: number) => NOMBRES[id] ?? String(id);

describe('goleadores del marcador (FR-048)', () => {
  it('agrupa los goles de cada jugador con sus minutos, en orden, y sin el dorsal', () => {
    const g = goleadoresDe([gol("12'", 'local', 7), gol("30'", 'visitante', 9), gol("67'", 'local', 7, 'penalti')], nombre);
    expect(g.local).toEqual([{ clave: '7', nombre: 'Pérez', goles: ["12'", "67' (pen.)"], propia: false }]);
    expect(g.visitante.map((x) => x.nombre)).toEqual(['Gómez']);
  });

  it('el gol en propia puerta cuenta para el equipo beneficiado y va aparte', () => {
    const g = goleadoresDe([gol("40'", 'visitante', 4, 'propia')], nombre);
    expect(g.local).toEqual([]);
    expect(g.visitante).toEqual([{ clave: '4-pp', nombre: 'Ramos', goles: ["40'"], propia: true }]);
  });

  it('ignora la tanda de penaltis y los demás eventos', () => {
    const tanda: EventoVista = { ...gol("120'", 'local', 7), tipo: 'tanda_lanzamiento' };
    const amarilla: EventoVista = { ...gol("50'", 'local', 9), tipo: 'amarilla' };
    expect(goleadoresDe([tanda, amarilla], nombre)).toEqual({ local: [], visitante: [] });
  });
});
