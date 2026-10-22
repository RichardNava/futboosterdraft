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

const evento = (tipo: string, datos: Record<string, unknown>, jugadores: { rol: string; jugadorId: number }[] = [{ rol: 'autor', jugadorId: 7 }]) => ({
  tick: 1,
  minuto: "30'",
  tipo,
  equipo: 'local' as const,
  jugadores,
  datos,
});
const nombres = (id: number) => ({ 7: 'Ramos', 1: 'Casillas' })[id] ?? '?';

describe('malestar (spec 005, T054; FR-044)', () => {
  it('al activarse nombra al jugador y su defecto con tilde; al acabar, «Se acaba el malestar»', () => {
    expect(describirEvento(evento('malestar', { defecto: 'Polemico', activo: true, jugadorId: 7 }), nombres)).toBe(
      'Malestar en el equipo: Ramos (Polémico)',
    );
    expect(describirEvento(evento('malestar', { defecto: 'Rebelde', activo: false, jugadorId: 7 }), nombres)).toBe('Se acaba el malestar');
  });
});

describe('penaltis con resultado (spec 005, T081; FR-071)', () => {
  it('dice si se marcó, si se falló o quién lo paró', () => {
    expect(describirEvento(evento('penalti', { resultado: 'gol' }), nombres)).toBe('Penalti: marca Ramos');
    expect(describirEvento(evento('penalti', { resultado: 'fuera' }), nombres)).toBe('Penalti: Ramos falla');
    expect(
      describirEvento(evento('penalti', { resultado: 'parada', porteroId: 1 }), nombres),
    ).toBe('Penalti: lo para Casillas');
  });

  it('tiene su propio icono, distinto del de gol', async () => {
    const fuente = (await import('node:fs')).readFileSync(new URL('../../src/componentes/ResumenEventos.tsx', import.meta.url), 'utf8');
    expect(fuente).toMatch(/penalti: \{ nombre: 'penalti'/);
  });
});
