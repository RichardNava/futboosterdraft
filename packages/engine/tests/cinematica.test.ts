/**
 * Cinemática de la capa espacial (invariante 6 de contracts/engine-api.md; sustituto automático de SC-007a;
 * T065). Se observa el estado en cada tick de 50 partidos con semilla.
 */
import { describe, expect, it } from 'vitest';
import { avanzar, crearPartido, type EstadoMotor } from '../src/index';
import { ULTIMO_TERCIO } from '../src/espacio/campo';
import { anclaDe } from '../src/espacio/geometria';
import { PASO_MOVIMIENTO } from '../src/espacio/movimiento';
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
  enSaque: boolean;
  /** Quienes pelean por el balón: el portador y los que le presionan, que van a su mismo punto a propósito. */
  enDisputa: Set<number>;
  /** Jugadores fuera de la forma en este tick: los que presionan y los que van a un punto de la jugada. */
  fueraDeForma: Set<number>;
  /** Quienes se colocan a `velocidadColocacion` (spec 015): todos en un córner y el que saca de banda. */
  colocando: Set<number>;
  /** Equipo con balón en plena llegada al área: sus medios salen de la línea a propósito (spec 015, R15). */
  llegada: 'local' | 'visitante' | null;
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
    const colocando = new Set(motivo === 'corner' ? Object.keys(esp.jugadores).map(Number) : motivo === 'banda' ? [esp.accion!.deId] : []);
    const refX = e.balon.posesion === 'local' ? esp.referencia.x : 10000 - esp.referencia.x;
    const progresa = (esp.accion?.tipo === 'conduccion' || esp.accion?.tipo === 'regate') && e.equipos[e.balon.posesion].jugadores.some((j) => j.id === esp.accion!.deId);
    const llegada = refX >= ULTIMO_TERCIO || (progresa && refX >= e.parametros.espacio.llegadaAlArea.xProgresion) ? e.balon.posesion : null;
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
      enSaque: esp.accion?.tipo === 'saque',
      enDisputa: new Set([e.balon.portadorId, ...esp.presion.presionadores]),
      fueraDeForma: new Set([...esp.presion.presionadores, ...Object.keys(esp.destinos).map(Number)]),
      colocando,
      llegada,
      lineas,
    });
  };
  for (let i = 0; i < 10 && estado.fase !== 'finalizado'; i++) estado = avanzar(estado, 'final', { observador }).estado;
  return { muestras, estado };
}

/** Ticks para frenar tras un saque, desde la velocidad de colocación de un córner (×4) con la frenada normal. */
const TICKS_FRENADA = 30;

describe('cinemática de la 2D (T065, invariante 6)', () => {
  const partidos = Array.from({ length: 50 }, (_, i) => jugar(`cinematica-${i}`));
  const e0 = partidos[0]!.estado;
  const esp = e0.parametros.espacio;

  // Las posiciones avanzan cada 2 ticks (los de los fotogramas): se mide entre ticks pares consecutivos. La velocidad se
  // decide cada `PASO_MOVIMIENTO` ticks, así que su cambio máximo es el de esos ticks (spec 018, R7).
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
          const escala = a.colocando.has(id) || b.colocando.has(id) ? e0.parametros.fueraDeCampo!.velocidadColocacion : 1;
          // Al acabar la colocación aún frena desde su velocidad: no puede acelerar por encima de la que llevaba.
          const tope = Math.max(vmax * escala, Math.hypot(q.vx, q.vy));
          expect(Math.hypot(p.x - q.x, p.y - q.y) / 2, `jugador ${id} en el tick ${b.tick}`).toBeLessThanOrEqual(tope + 1);
          // La línea del campo lo para en seco: su velocidad pasa a ser la que ha podido recorrer (`moverJugadores`).
          const enLinea = p.x <= 0 || p.x >= 10000 || p.y <= 0 || p.y >= 6400;
          if (!enLinea) expect(Math.hypot(p.vx - q.vx, p.vy - q.vy) / PASO_MOVIMIENTO, `aceleración de ${id} en el tick ${b.tick}`).toBeLessThanOrEqual(dvmax * escala + 1);
        }
      }
    }
  });

  it('ninguna pareja de jugadores queda más cerca que el radio de separación más de un paso de movimiento', () => {
    const radio2 = esp.radioSeparacion * esp.radioSeparacion;
    for (const { muestras } of partidos.slice(0, 10)) {
      const seguidos = new Map<string, number>();
      // A balón parado cada uno va a un punto fijo, y a velocidad de córner: necesita unos ticks para frenar y separarse.
      const colocadoEn = new Map<number, number>();
      // La separación se decide una vez por paso (4 ticks, 2 muestras pares): más de 2 seguidas = más de un paso.
      for (const m of pares(muestras)) {
        for (const id of m.enSaque ? m.jugadores.keys() : m.colocando) colocadoEn.set(id, m.tick);
        const frenando = (id: number) => m.tick - (colocadoEn.get(id) ?? -1000) < TICKS_FRENADA;
        const ids = [...m.jugadores.keys()];
        const cerca = new Set<string>();
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const p = m.jugadores.get(ids[i]!)!;
            const q = m.jugadores.get(ids[j]!)!;
            if (frenando(ids[i]!) || frenando(ids[j]!) || (m.enDisputa.has(ids[i]!) && m.enDisputa.has(ids[j]!))) continue;
            if ((p.x - q.x) ** 2 + (p.y - q.y) ** 2 < radio2) cerca.add(`${ids[i]}-${ids[j]}`);
          }
        }
        for (const clave of [...seguidos.keys()]) if (!cerca.has(clave)) seguidos.delete(clave);
        for (const clave of cerca) {
          const n = (seguidos.get(clave) ?? 0) + 1;
          seguidos.set(clave, n);
          expect(n, `pareja ${clave} en el tick ${m.tick}`).toBeLessThanOrEqual(PASO_MOVIMIENTO / 2);
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
      const ultimaLlegada = { local: -1000, visitante: -1000 };
      for (const m of muestras) {
        if (m.posesion !== posesion) {
          posesion = m.posesion;
          ultimoCambio = m.tick;
        }
        if (m.llegada) ultimaLlegada[m.llegada] = m.tick;
        // Fuera de las transiciones (5 s reales) y de las reanudaciones a balón parado.
        if (m.tick - ultimoCambio < 118 || m.reposicion) continue;
        for (const lado of ['local', 'visitante'] as const) {
          // Tras la llegada al área, sus medios vuelven a la línea en el mismo margen que en una transición.
          if (m.tick - ultimaLlegada[lado] < 118) continue;
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
