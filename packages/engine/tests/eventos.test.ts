import { describe, expect, it } from 'vitest';
import { avanzar, type EventoPartido } from '../src/index';
import { partido } from './ayudas';

const todos: EventoPartido[] = [];
const resultados = Array.from({ length: 60 }, (_, i) => avanzar(partido(`ev-${i}`), 'final'));
for (const r of resultados) todos.push(...r.estado.eventos);

describe('eventos y estadísticas (FR-044, FR-047)', () => {
  it('los goles llevan autor y, a veces, asistente', () => {
    const goles = todos.filter((e) => e.tipo === 'gol');
    expect(goles.length).toBeGreaterThan(50);
    expect(goles.every((g) => g.jugadores.some((j) => j.rol === 'autor'))).toBe(true);
    expect(goles.some((g) => g.jugadores.some((j) => j.rol === 'asistente'))).toBe(true);
  });

  it('son relevantes los goles, tarjetas, ocasiones claras y lesiones; no las interrupciones', () => {
    for (const tipo of ['gol', 'amarilla', 'ocasion'] as const) {
      const lista = todos.filter((e) => e.tipo === tipo);
      expect(lista.length, tipo).toBeGreaterThan(0);
      expect(lista.every((e) => e.relevante), tipo).toBe(true);
    }
    expect(todos.filter((e) => e.tipo === 'lesion' || e.tipo === 'roja').every((e) => e.relevante)).toBe(true);
    expect(todos.filter((e) => e.tipo === 'interrupcion').every((e) => !e.relevante)).toBe(true);
  });

  it('el marcador final coincide con los goles de cada equipo', () => {
    for (const r of resultados) {
      const goles = r.estado.eventos.filter((e) => e.tipo === 'gol');
      if (r.estado.derrotaPorInferioridad) continue;
      expect(goles.filter((g) => g.equipo === 'local')).toHaveLength(r.marcador.local);
      expect(goles.filter((g) => g.equipo === 'visitante')).toHaveLength(r.marcador.visitante);
    }
  });

  it('las estadísticas incluyen posesión, tiros, tiros a puerta, córners, faltas y tarjetas', () => {
    const s = resultados[0]!.estadisticas;
    for (const lado of ['local', 'visitante'] as const) {
      for (const campo of ['posesion', 'tiros', 'tirosPuerta', 'corners', 'faltas', 'amarillas', 'rojas'] as const) {
        expect(typeof s[lado][campo]).toBe('number');
      }
    }
    expect(s.local.posesion + s.visitante.posesion).toBe(100);
    expect(s.local.tirosPuerta).toBeLessThanOrEqual(s.local.tiros);
  });

  it('los minutos se muestran con el descuento ("45+2\'")', () => {
    expect(todos.some((e) => /^45\+\d+'$/.test(e.minuto))).toBe(true);
    expect(todos.every((e) => /^\d+('|\+\d+')$/.test(e.minuto))).toBe(true);
  });

  it('el tick nunca retrocede', () => {
    for (const r of resultados) {
      const ticks = r.estado.eventos.map((e) => e.tick);
      expect(ticks.every((t, i) => i === 0 || t >= ticks[i - 1]!)).toBe(true);
    }
  });
});
