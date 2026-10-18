/**
 * Cinemática de la capa espacial (invariante 6 de contracts/engine-api.md; sustituto automático de SC-007a;
 * T065). Se observa el estado en cada tick de 50 partidos con semilla.
 */
import { describe, expect, it } from 'vitest';
import { avanzar, crearPartido, type EstadoMotor } from '../src/index';
import { anclaDe } from '../src/espacio/geometria';
import { lineaDe } from '../src/espacio/objetivos';
import { entrada } from './ayudas';

interface Muestra {
  tick: number;
  parte: number;
  jugadores: Map<number, { x: number; y: number; vx: number; vy: number }>;
  balon: { x: number; y: number };
  enAccion: boolean;
  portadorPegado: boolean;
  posesion: 'local' | 'visitante';
  presionadores: number;
  coordinada: boolean;
  reposicion: boolean;
  /** Jugadores fuera de la forma en este tick: los que presionan y los que van a un punto de la jugada. */
  fueraDeForma: Set<number>;
  lineas: Record<'local' | 'visitante', { defensa: number; medio: number; ataque: number }>;
}

function jugar(semilla: string): { muestras: Muestra[]; estado: EstadoMotor } {
  const muestras: Muestra[] = [];
  let estado = crearPartido(entrada(semilla));
  // Último tick en que cada jugador tuvo un papel en la jugada (llevar el balón, recibir, presionar, ir a su
  // sitio en un balón parado al área): durante
  // 5 s reales después sigue fuera de la forma, volviendo a su sitio, igual que en una transición.
  const ultimoPapel = new Map<number, number>();
  const observador = (e: EstadoMotor) => {
    const esp = e.espacio;
    for (const id of [e.balon.portadorId, ...esp.presion.presionadores, ...Object.keys(esp.destinos).map(Number)]) ultimoPapel.set(id, e.tick);
    // En un córner, una falta al área o un penalti todos van a un sitio especial.
    const motivo = esp.accion?.tipo === 'saque' ? esp.accion.motivo : undefined;
    if (motivo === 'corner' || motivo === 'falta_area' || motivo === 'penalti') for (const id of Object.keys(esp.jugadores)) ultimoPapel.set(Number(id), e.tick);
    const lineas = {} as Muestra['lineas'];
    for (const lado of ['local', 'visitante'] as const) {
      const equipo = e.equipos[lado];
      // Una línea puede ser escalonada (p. ej., un rombo en el medio): cada jugador cuenta descontando su
      // escalón dentro de la línea (la distancia de su ancla a la media de la línea), para que la altura de
      // la línea no cambie solo porque uno de sus jugadores salga de la forma.
      const anclas: Record<string, number[]> = { porteria: [], defensa: [], medio: [], ataque: [] };
      for (const j of equipo.jugadores) if (j.enCampo) anclas[lineaDe(equipo, j)]!.push(anclaDe(equipo, j).x);
      const xs: Record<string, number[]> = { defensa: [], medio: [], ataque: [] };
      for (const j of equipo.jugadores) {
        if (!j.enCampo || e.tick - (ultimoPapel.get(j.id) ?? -1000) < 118) continue;
        const l = lineaDe(equipo, j);
        if (l === 'porteria') continue;
        const p = esp.jugadores[j.id]!;
        const escalon = anclaDe(equipo, j).x - anclas[l]!.reduce((a, b) => a + b, 0) / anclas[l]!.length;
        xs[l]!.push((lado === 'local' ? p.x : 10000 - p.x) - escalon);
      }
      const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
      lineas[lado] = { defensa: media(xs.defensa!), medio: media(xs.medio!), ataque: media(xs.ataque!) };
    }
    const portador = esp.jugadores[e.balon.portadorId];
    muestras.push({
      tick: e.tick,
      parte: e.reloj.parte,
      jugadores: new Map(Object.entries(esp.jugadores).map(([id, p]) => [Number(id), { ...p }])),
      balon: { x: esp.balon.x, y: esp.balon.y },
      enAccion: esp.accion !== null,
      portadorPegado: portador !== undefined && Math.abs(portador.x - esp.balon.x) + Math.abs(portador.y - esp.balon.y) <= 400,
      posesion: e.balon.posesion,
      presionadores: esp.presion.presionadores.length,
      coordinada: esp.presion.coordinada,
      reposicion: esp.accion?.tipo === 'saque' || esp.accion?.tipo === 'control',
      fueraDeForma: new Set([...esp.presion.presionadores, ...Object.keys(esp.destinos).map(Number)]),
      lineas,
    });
  };
  for (let i = 0; i < 10 && estado.fase !== 'finalizado'; i++) estado = avanzar(estado, 'final', { observador }).estado;
  return { muestras, estado };
}

describe('cinemática de la 2D (T065, invariante 6)', () => {
  const partidos = Array.from({ length: 50 }, (_, i) => jugar(`cinematica-${i}`));
  const e0 = partidos[0]!.estado;
  const esp = e0.parametros.espacio;

  // Los jugadores se mueven cada 2 ticks (los de los fotogramas): se mide entre ticks pares consecutivos.
  const pares = (muestras: Muestra[]) => muestras.filter((m) => m.tick % 2 === 0);

  it('ningún jugador supera su velocidad ni su aceleración máximas', () => {
    const vmax = esp.velocidadJugadorMax;
    const dvmax = Math.max(esp.aceleracion, esp.frenada);
    for (const { muestras } of partidos) {
      const m2 = pares(muestras);
      for (let i = 1; i < m2.length; i++) {
        const a = m2[i - 1]!;
        const b = m2[i]!;
        if (a.parte !== b.parte || b.tick !== a.tick + 2) continue;
        for (const [id, p] of b.jugadores) {
          const q = a.jugadores.get(id);
          if (!q) continue;
          expect(Math.hypot(p.x - q.x, p.y - q.y) / 2, `jugador ${id} en el tick ${b.tick}`).toBeLessThanOrEqual(vmax + 1);
          expect(Math.hypot(p.vx - q.vx, p.vy - q.vy) / 2, `aceleración de ${id} en el tick ${b.tick}`).toBeLessThanOrEqual(dvmax + 1);
        }
      }
    }
  });

  it('ninguna pareja de jugadores queda más cerca que el radio de separación más de 2 ticks seguidos', () => {
    const radio2 = esp.radioSeparacion * esp.radioSeparacion;
    for (const { muestras } of partidos.slice(0, 10)) {
      const seguidos = new Map<string, number>();
      // Cada muestra par cuenta por los 2 ticks del paso de movimiento: más de 1 seguida = más de 2 ticks.
      for (const m of pares(muestras)) {
        const ids = [...m.jugadores.keys()];
        const cerca = new Set<string>();
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const p = m.jugadores.get(ids[i]!)!;
            const q = m.jugadores.get(ids[j]!)!;
            if ((p.x - q.x) ** 2 + (p.y - q.y) ** 2 < radio2) cerca.add(`${ids[i]}-${ids[j]}`);
          }
        }
        for (const clave of [...seguidos.keys()]) if (!cerca.has(clave)) seguidos.delete(clave);
        for (const clave of cerca) {
          const n = (seguidos.get(clave) ?? 0) + 1;
          seguidos.set(clave, n);
          expect(n, `pareja ${clave} en el tick ${m.tick}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('el balón solo se mueve dentro de una acción visible o pegado a su portador', () => {
    for (const { muestras } of partidos) {
      for (let i = 1; i < muestras.length; i++) {
        const a = muestras[i - 1]!;
        const b = muestras[i]!;
        if (a.parte !== b.parte) continue;
        const movido = a.balon.x !== b.balon.x || a.balon.y !== b.balon.y;
        if (movido) expect(b.enAccion || a.enAccion || b.portadorPegado, `balón en el tick ${b.tick}`).toBe(true);
      }
    }
  });

  it('como mucho 2 defensores van al balón; 3 solo en una presión coordinada', () => {
    for (const { muestras } of partidos) {
      for (const m of muestras) expect(m.presionadores).toBeLessThanOrEqual(m.coordinada ? esp.presionCoordinada.jugadores : esp.presionadores);
    }
  });

  it('la distancia entre líneas está en el rango de FR-023 en al menos el 95 % de los ticks de juego', () => {
    const [cbMin, cbMax] = esp.separacionLineasConBalon;
    const [sbMin, sbMax] = esp.separacionLineasSinBalon;
    let dentro = 0;
    let total = 0;
    for (const { muestras } of partidos.slice(0, 10)) {
      let ultimoCambio = -1000;
      let posesion = muestras[0]?.posesion;
      for (const m of muestras) {
        if (m.posesion !== posesion) {
          posesion = m.posesion;
          ultimoCambio = m.tick;
        }
        // Fuera de las transiciones (5 s reales) y de las reanudaciones a balón parado.
        if (m.tick - ultimoCambio < 118 || m.reposicion) continue;
        for (const lado of ['local', 'visitante'] as const) {
          const l = m.lineas[lado];
          const [min, max] = m.posesion === lado ? [cbMin, cbMax] : [sbMin, sbMax];
          for (const d of [l.medio - l.defensa, l.ataque - l.medio]) {
            if (Number.isNaN(d)) continue;
            total++;
            if (d >= min - 150 && d <= max + 150) dentro++;
          }
        }
      }
    }
    // Con muestras suficientes (unas 500 por partido como mínimo) para que no se cumpla en vacío.
    expect(total).toBeGreaterThan(5_000);
    expect(dentro / total).toBeGreaterThanOrEqual(0.95);
  });

  it('tras una expulsión, los que quedan en la línea se reparten el hueco', () => {
    for (const { estado } of partidos) {
      for (const lado of ['local', 'visitante'] as const) {
        const equipo = estado.equipos[lado];
        if (!equipo.jugadores.some((j) => j.expulsado)) continue;
        // Ninguna línea con jugadores tiene dos anclas en el mismo punto.
        const anclas = equipo.jugadores.filter((j) => j.enCampo).map((j) => `${j.ancla?.x}-${j.ancla?.y}`);
        expect(new Set(anclas).size).toBe(anclas.length);
      }
    }
  });
});
