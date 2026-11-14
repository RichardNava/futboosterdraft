/**
 * Coherencia del balón (spec 014, US1; contrato M1, SC-001): el balón solo cambia de dirección o arranca desde parado
 * con un jugador junto a él o en una reanudación; un balón suelto rueda en su dirección y frena; quien llega antes a un
 * balón suelto se lo queda.
 */
import { describe, expect, it } from 'vitest';
import { recuperarSuelto } from '../src/acciones/animaciones';
import { avanzar, crearPartido, type EstadoMotor } from '../src/index';
import { contextoDe, darBalon, entrada, partido, situar, soloEnCampo, titularEn } from './ayudas';

/** LLEGADA (150) + radio de chapa (`radioSeparacion`) con margen del paso de movimiento de los jugadores. */
const JUNTO = 150 + 200 + 60;
const COS20 = Math.cos((20 * Math.PI) / 180);

interface Incoherencia {
  tick: number;
  balon: { x: number; y: number };
  accion: string | undefined;
}

/** Recorre un partido tick a tick y devuelve los cambios de dirección o arranques sin nadie junto al balón. */
function incoherencias(semilla: string): { cambios: number; malos: Incoherencia[] } {
  let previo: { x: number; y: number } | null = null;
  let velocidad = { x: 0, y: 0 };
  let cambios = 0;
  const malos: Incoherencia[] = [];
  // Posiciones del tick anterior: el balón de entonces se compara con los jugadores de entonces (un portador que se
  // lesiona o es expulsado ya no está en el campo en este tick).
  let jugadoresPrevios: { x: number; y: number }[] = [];
  const cercaDe = (jugadores: { x: number; y: number }[], b: { x: number; y: number }) =>
    jugadores.some((q) => (q.x - b.x) ** 2 + (q.y - b.y) ** 2 <= JUNTO * JUNTO);
  const observador = (e: EstadoMotor) => {
    const b = { x: e.espacio.balon.x, y: e.espacio.balon.y };
    if (previo) {
      const v = { x: b.x - previo.x, y: b.y - previo.y };
      const m = Math.hypot(v.x, v.y);
      const m0 = Math.hypot(velocidad.x, velocidad.y);
      const dentro = b.x > 0 && b.x < 10000 && b.y > 0 && b.y < 6400 && previo.x > 0 && previo.x < 10000;
      // Saltos de recolocación al empezar una parte (no son movimiento).
      const salto = m > 1000;
      const arranca = m0 === 0 && m > 0;
      const gira = m >= 20 && m0 >= 20 && (v.x * velocidad.x + v.y * velocidad.y) / (m * m0) < COS20;
      if (dentro && !salto && (arranca || gira)) {
        cambios++;
        const saque = e.espacio.accion?.tipo === 'saque';
        if (!saque && !cercaDe(jugadoresPrevios, previo) && !cercaDe(Object.values(e.espacio.jugadores), b)) malos.push({ tick: e.tick, balon: b, accion: e.espacio.accion?.tipo });
      }
      velocidad = salto ? { x: 0, y: 0 } : v;
    }
    previo = b;
    jugadoresPrevios = Object.values(e.espacio.jugadores).map((q) => ({ x: q.x, y: q.y }));
  };
  avanzar(crearPartido(entrada(semilla)), 'final', { observador });
  return { cambios, malos };
}

describe('el balón solo se mueve cuando alguien lo juega (M1.1, SC-001)', () => {
  it('en 20 partidos, ningún cambio de dirección ni arranque sin un jugador junto al balón o un saque', () => {
    let cambios = 0;
    const malos: (Incoherencia & { semilla: string })[] = [];
    for (let i = 1; i <= 20; i++) {
      const r = incoherencias(`coherencia-${i}`);
      cambios += r.cambios;
      malos.push(...r.malos.map((m) => ({ ...m, semilla: `coherencia-${i}` })));
    }
    expect(cambios).toBeGreaterThan(1000);
    expect(malos.slice(0, 5)).toEqual([]);
  }, 300_000);
});

describe('balón suelto (M1.2, M1.3)', () => {
  function escena(velocidadRival: number) {
    const e = partido('suelto');
    const propio = titularEn(e, 'local', 'MC-1');
    const rival = titularEn(e, 'visitante', 'MC-1');
    situar(e, propio.id, { x: 4000, y: 3200 });
    // El rival a la misma distancia del balón, al otro lado (coordenadas del visitante).
    situar(e, rival.id, { x: 10000 - 6000, y: 6400 - 3200 });
    soloEnCampo(e, [propio.id, rival.id]);
    darBalon(e, 'local', propio, 2);
    e.espacio.balon = { x: 5000, y: 3200, z: 0 };
    e.espacio.velocidadBalon = { x: 0, y: 0 };
    const s = (j: typeof propio, v: number) => (j.jugador = { ...j.jugador, stats: { ...j.jugador.stats, velocidad: v } as typeof j.jugador.stats });
    s(propio, 60);
    s(rival, velocidadRival);
    return { e, propio, rival };
  }

  it('rueda en su dirección, frena y nunca se acerca al jugador que va a por él', () => {
    const e = partido('rodar');
    const j = titularEn(e, 'local', 'MC-1');
    situar(e, j.id, { x: 3000, y: 3200 });
    soloEnCampo(e, [j.id]);
    darBalon(e, 'local', j, 2);
    e.espacio.balon = { x: 5000, y: 3200, z: 0 };
    e.espacio.velocidadBalon = { x: 150, y: 0 };
    const posiciones: number[] = [];
    const velocidades: number[] = [];
    const ctx = { ...contextoDe(e), observador: (s: EstadoMotor) => (posiciones.push(s.espacio.balon.x), velocidades.push(s.espacio.velocidadBalon.x)) };
    recuperarSuelto(ctx, j.id, 1);
    // Se aleja del jugador (que está detrás) y frena tick a tick hasta pararse.
    for (let i = 1; i < posiciones.length; i++) expect(posiciones[i]!).toBeGreaterThanOrEqual(posiciones[i - 1]!);
    for (let i = 1; i < velocidades.length; i++) expect(velocidades[i]!).toBeLessThanOrEqual(velocidades[i - 1]!);
    expect(velocidades[0]!).toBeLessThan(150);
    expect(e.espacio.balon.y).toBe(3200);
  });

  it('a la misma distancia, se lo queda el más rápido', () => {
    const lento = escena(40);
    expect(recuperarSuelto(contextoDe(lento.e), lento.propio.id)).toBe(lento.propio.id);
    const rapido = escena(99);
    expect(recuperarSuelto(contextoDe(rapido.e), rapido.propio.id)).toBe(rapido.rival.id);
  });
});
