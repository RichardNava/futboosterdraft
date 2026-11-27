/**
 * Cadencia de movimiento (spec 018, FR-042 a FR-044, R7 y R8; invariantes 1, 4 y 6): la velocidad se decide cada 4 ticks y
 * la posición avanza cada 2, así que los fotogramas siguen siendo continuos.
 */
import { describe, expect, it } from 'vitest';
import { avanzarMedioPaso, moverJugadores, PASO_MOVIMIENTO } from '../src/espacio/movimiento';
import { pasoEspacial } from '../src/espacio/paso';
import { avanzar, crearPartido, type EstadoMotor } from '../src/index';
import { entrada, equipo, partido, situar, titularEn } from './ayudas';

const LARGO = 10000;
const ANCHO = 6400;

describe('cadencia de movimiento', () => {
  it('la velocidad se decide cada 4 ticks', () => {
    expect(PASO_MOVIMIENTO).toBe(4);
  });

  it('el medio paso avanza velocidad × 2 sin recalcular la velocidad', () => {
    const e = partido('medio');
    const j = titularEn(e, 'local', 'MC-1');
    e.espacio.jugadores[j.id] = { x: 3000, y: 3000, vx: 10, vy: -5, papel: 0 };
    avanzarMedioPaso(e);
    expect(e.espacio.jugadores[j.id]).toMatchObject({ x: 3020, y: 2990, vx: 10, vy: -5 });
  });

  it('el medio paso no saca a nadie del campo y deja la velocidad real', () => {
    const e = partido('borde');
    const j = titularEn(e, 'local', 'MC-1');
    e.espacio.jugadores[j.id] = { x: LARGO - 4, y: 4, vx: 10, vy: -10, papel: 0 };
    avanzarMedioPaso(e);
    expect(e.espacio.jugadores[j.id]).toMatchObject({ x: LARGO, y: 0, vx: 2, vy: -2 });
  });

  it('tras una recolocación directa, con velocidad 0, el medio paso no lo mueve', () => {
    const e = partido('recoloca');
    const j = titularEn(e, 'local', 'MC-1');
    situar(e, j.id, { x: 4000, y: 2000 });
    const antes = { ...e.espacio.jugadores[j.id]! };
    avanzarMedioPaso(e);
    expect(e.espacio.jugadores[j.id]).toEqual(antes);
  });

  it('un jugador sin objetivo se queda quieto, sin arrastrar su velocidad', () => {
    const e = partido('sin-objetivo');
    const j = titularEn(e, 'local', 'MC-1');
    e.espacio.jugadores[j.id] = { x: 3000, y: 3000, vx: 10, vy: 10, papel: 0 };
    e.espacio.objetivos = {};
    moverJugadores(e);
    avanzarMedioPaso(e);
    expect(e.espacio.jugadores[j.id]).toMatchObject({ x: 3000, y: 3000, vx: 0, vy: 0 });
  });

  it('en un partido, ningún jugador en desplazamiento repite posición en dos ticks pares seguidos', () => {
    for (let s = 0; s < 3; s++) {
      let anterior: { tick: number; parte: number; jugadores: EstadoMotor['espacio']['jugadores'] } | null = null;
      let comprobados = 0;
      const observador = (e: EstadoMotor) => {
        if (e.tick % 2 !== 0) return;
        const jugadores = structuredClone(e.espacio.jugadores);
        if (anterior && anterior.parte === e.reloj.parte && e.tick === anterior.tick + 2) {
          for (const [id, p] of Object.entries(jugadores)) {
            const q = anterior.jugadores[Number(id)];
            // Quien tiene velocidad en este paso se ha movido en él: sin medio paso, los alternos repetirían posición.
            if (!q || (p.vx === 0 && p.vy === 0)) continue;
            comprobados++;
            expect(p.x !== q.x || p.y !== q.y, `jugador ${id} en el tick ${e.tick}`).toBe(true);
          }
        }
        for (const p of Object.values(jugadores)) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(LARGO);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(ANCHO);
        }
        anterior = { tick: e.tick, parte: e.reloj.parte, jugadores };
      };
      avanzar(crearPartido(entrada(`cadencia-${s}`)), 'final', { observador });
      expect(comprobados).toBeGreaterThan(10_000);
    }
  }, 60_000);

  it('el partido es idéntico con y sin fotogramas (invariante 1)', () => {
    const e = crearPartido(entrada('fotogramas'));
    const sin = avanzar(e, 'final');
    const con = avanzar(e, 'final', { fotogramas: true });
    expect(con.eventos).toEqual(sin.eventos);
    expect(con.marcador).toEqual(sin.marcador);
    expect(con.fotogramas!.every((f, i, t) => i === 0 || f[0]! - t[i - 1]![0]! <= 2 || t[i - 1]![0]! % 2 !== 0 || f[0]! % 2 !== 0)).toBe(true);
  }, 30_000);

  it('NPC y humanos usan la misma cadencia (FR-043)', () => {
    const base = entrada('misma-cadencia', { local: equipo('local'), visitante: equipo('visitante') });
    const npc = crearPartido(base);
    const humano = crearPartido(base);
    humano.equipos.local.controlTotal = true;
    humano.equipos.visitante.controlTotal = true;
    expect(avanzar(humano, 'final').eventos).toEqual(avanzar(npc, 'final').eventos);
  }, 30_000);
});

describe('objetivos durante un saque (R8)', () => {
  function enSaque(semilla: string) {
    const e = partido(semilla);
    const sacador = titularEn(e, 'local', 'LI');
    e.espacio.balon = { x: 3000, y: 0, z: 0 };
    e.espacio.referencia = { x: 3000, y: 0, tick: 0 };
    e.espacio.accion = { tipo: 'saque', deId: sacador.id, inicioTick: 0, finTick: 100, origen: { x: 3000, y: 0 }, destino: { x: 3000, y: 0 }, aerea: false, exito: true, motivo: 'banda' };
    return e;
  }

  it('con la misma clave y la referencia ya en el balón, no se recalculan', () => {
    const e = enSaque('clave');
    e.tick = 4;
    pasoEspacial(e);
    expect(e.espacio.claveSaque).toBeDefined();
    const marca = { x: 1, y: 1 };
    const id = titularEn(e, 'local', 'DC').id;
    e.espacio.objetivos[id] = marca;
    e.tick = 8;
    pasoEspacial(e);
    expect(e.espacio.objetivos[id]).toEqual(marca);
  });

  it('si cambia la posición del balón, se recalculan', () => {
    const e = enSaque('cambia');
    e.tick = 4;
    pasoEspacial(e);
    const id = titularEn(e, 'local', 'DC').id;
    e.espacio.objetivos[id] = { x: 1, y: 1 };
    e.espacio.balon = { x: 3050, y: 0, z: 0 };
    e.tick = 8;
    pasoEspacial(e);
    expect(e.espacio.objetivos[id]).not.toEqual({ x: 1, y: 1 });
  });

  it('mientras la referencia no ha alcanzado el balón, se recalculan', () => {
    const e = enSaque('referencia');
    e.espacio.referencia = { x: 500, y: 3000, tick: 0 };
    e.tick = 4;
    pasoEspacial(e);
    const id = titularEn(e, 'local', 'DC').id;
    e.espacio.objetivos[id] = { x: 1, y: 1 };
    e.tick = 8;
    pasoEspacial(e);
    expect(e.espacio.objetivos[id]).not.toEqual({ x: 1, y: 1 });
  });

  it('al acabar el saque se olvida la clave', () => {
    const e = enSaque('fin');
    e.tick = 4;
    pasoEspacial(e);
    e.espacio.accion = null;
    e.tick = 8;
    pasoEspacial(e);
    expect(e.espacio.claveSaque).toBeUndefined();
  });
});
