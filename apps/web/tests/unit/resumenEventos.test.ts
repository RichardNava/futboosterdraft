/** Tipo de gol en el resumen de eventos (spec 003, T035). */
import { describe, expect, it } from 'vitest';
import { describirEvento, tipoDeGol } from '../../src/componentes/ResumenEventos';

const gol = (datos: Record<string, unknown>) => ({ tick: 1, minuto: "10'", tipo: 'gol', equipo: 'local' as const, jugadores: [{ rol: 'autor', jugadorId: 7 }], datos });

describe('tipo de gol (T035)', () => {
  it('agrupa normal, lejano y mano a mano como jugada y añade la distancia', () => {
    expect(tipoDeGol({ tipo: 'normal' })).toBe('jugada');
    expect(tipoDeGol({ tipo: 'lejano', distancia: 23 })).toBe('jugada (23 m)');
    expect(tipoDeGol({ tipo: 'manoAMano' })).toBe('jugada');
    expect(tipoDeGol({ tipo: 'cabeza', distancia: 8 })).toBe('de cabeza (8 m)');
    expect(tipoDeGol({ tipo: 'falta' })).toBe('de falta');
    expect(tipoDeGol({ tipo: 'penalti', distancia: 11 })).toBe('de penalti (11 m)');
  });

  it('un gol en propia puerta lleva el nombre del defensor y «(p. p.)»', () => {
    const texto = describirEvento(gol({ tipo: 'propia', distancia: 6 }), () => 'Ramos');
    expect(texto).toContain('Ramos');
    expect(texto).toContain('(p. p.)');
    expect(texto).toContain('en propia puerta');
  });
});
